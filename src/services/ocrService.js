import { createWorker, PSM } from 'tesseract.js'
import { clampRoiToVideoBounds } from './coordinateMapper'

/**
 * Tesseract.js 워커를 감싸는 저수준 OCR 서비스.
 * 워커 생성 비용이 크기 때문에(수백 ms~수 초) 앱 전체에서 하나의 워커만 재사용한다(싱글턴).
 */

// 키오스크 화면은 한국어 위주 + 일부 영어(START, MENU 등)가 섞여 있어 두 언어를 함께 로드한다.
const OCR_LANGS = ['kor', 'eng']

// OCR에 넘기는 이미지의 최대 가로 폭(px). 모바일에서 매 프레임 큰 이미지를 그대로 넘기면
// 처리 시간이 급격히 늘어나므로, ROI를 잘라낸 뒤 이 크기로 다운스케일해서 성능을 확보한다.
const MAX_OCR_WIDTH = 640

let workerPromise = null

/**
 * 워커를 최초 1회만 생성하고 이후에는 동일 인스턴스를 재사용한다.
 */
export async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(OCR_LANGS, undefined, {
      logger: () => {},
    }).then(async (worker) => {
      // SPARSE_TEXT: 버튼처럼 화면 곳곳에 흩어진 짧은 텍스트 인식에 적합한 모드
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      })
      return worker
    })
  }

  return workerPromise
}

/**
 * 워커를 종료하고 리소스를 해제한다. 화면 이탈 시 반드시 호출해 메모리 누수를 막는다.
 */
export async function terminateOcrWorker() {
  if (!workerPromise) return

  const pendingWorker = workerPromise
  workerPromise = null

  try {
    const worker = await pendingWorker
    await worker.terminate()
  } catch (err) {
    console.warn('[ocrService] 워커 종료 중 예외 발생(무시 가능):', err)
  }
}

// 이보다 작은 캔버스는 Tesseract(Leptonica)에 넘겼을 때 "box outside rectangle" /
// "invalid box" 같은 내부 오류를 유발하기 쉬워, 아예 OCR을 시도하지 않고 건너뛴다.
const MIN_CANVAS_SIZE = 20

/**
 * video에서 ROI(관심 영역)만 잘라내 OCR용 캔버스를 만든다.
 * 얼굴, 매장 간판 등 ROI 바깥 영역을 아예 넘기지 않도록 잘라내고,
 * 성능을 위해 MAX_OCR_WIDTH 기준으로 다운스케일한다.
 *
 * roiVideoRect는 호출 시점에 이미 clamp되어 있어야 정상이지만, video 해상도가 바뀌는 등의
 * 경합 상황에 대비해 drawImage 직전에 한 번 더 video의 실제 크기 기준으로 clamp한다
 * (x>=0, y>=0, x+width<=videoWidth, y+height<=videoHeight를 항상 보장).
 *
 * @param {HTMLVideoElement} video
 * @param {{x:number, y:number, width:number, height:number}} roiVideoRect video 픽셀 좌표 기준 ROI
 * @returns {{canvas: HTMLCanvasElement, resizeScale: number}|null}
 */
export function cropRoiCanvas(video, roiVideoRect) {
  if (!video.videoWidth || !video.videoHeight) return null

  const safeRoi = clampRoiToVideoBounds(roiVideoRect, video.videoWidth, video.videoHeight)
  if (!safeRoi) return null

  const resizeScale = Math.min(1, MAX_OCR_WIDTH / safeRoi.width)
  const canvasWidth = Math.round(safeRoi.width * resizeScale)
  const canvasHeight = Math.round(safeRoi.height * resizeScale)

  // 너무 작은 캔버스는 Tesseract에 넘기지 않고 이번 주기를 건너뛴다(1px 등으로
  // 억지로 늘리면 내용이 없는 이미지가 되어 엔진 내부 오류의 원인이 된다).
  if (canvasWidth < MIN_CANVAS_SIZE || canvasHeight < MIN_CANVAS_SIZE) return null

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(video, safeRoi.x, safeRoi.y, safeRoi.width, safeRoi.height, 0, 0, canvasWidth, canvasHeight)

  return { canvas, resizeScale, roiVideoRect: safeRoi }
}

// block > paragraph > line > word 트리 구조를 평평한 단어 배열로 변환한다.
function flattenWords(blocks) {
  if (!blocks) return []

  const words = []
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push(word)
        }
      }
    }
  }
  return words
}

/**
 * 이미지(캔버스)에서 텍스트와 각 단어의 bounding box를 인식한다.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Array<{text: string, confidence: number, x: number, y: number, width: number, height: number}>>}
 *   x, y, width, height는 전달한 canvas 픽셀 좌표계(top-left 기준) 값이다.
 */
export async function recognizeText(canvas) {
  const worker = await getOcrWorker()
  const { data } = await worker.recognize(canvas, {}, { blocks: true })

  return flattenWords(data.blocks)
    .filter((word) => word.text && word.text.trim().length > 0)
    .map((word) => ({
      text: word.text.trim(),
      confidence: word.confidence,
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
    }))
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { BRAND_CONFIDENCE_THRESHOLD } from '../data/megaCoffeeGuide'
import { cropRoiCanvas } from '../services/ocrService'
import { getRoiInVideoCoords, mapRoiWordToVideoBox, mapVideoBoxToDisplayBox } from '../services/coordinateMapper'
import { classifyBrand, findBestTextMatch } from '../services/kioskClassifier'
import { useOCR } from './useOCR'

// 매 프레임 OCR을 돌리면 성능 문제가 생기므로 이 주기로 throttling한다.
// (테스트 단계이므로 우선 여유 있게 1000ms로 둔다.)
const OCR_INTERVAL_MS = 1000

// AR 박스가 OCR 오차로 흔들리지 않도록 이전 좌표에 부여하는 가중치.
// newX = oldX * SMOOTHING_KEEP + detectedX * (1 - SMOOTHING_KEEP)
const SMOOTHING_KEEP = 0.7

/**
 * 카메라 영상에서 ROI를 잘라 주기적으로 OCR을 실행하고,
 * targetTexts와 일치하는 버튼의 위치를 실시간으로 추적(추적 중 smoothing 포함)하는 훅.
 *
 * @param {{
 *   videoRef: React.RefObject<HTMLVideoElement>,
 *   roiElementRef: React.RefObject<HTMLElement>,
 *   enabled: boolean,
 *   targetTexts: string[],
 * }} params
 */
export function useARTracking({ videoRef, roiElementRef, enabled, targetTexts }) {
  const { recognize, isReady } = useOCR()

  const [ocrWords, setOcrWords] = useState([]) // 디버그 표시용(화면 표시 퍼센트 좌표)
  const [rawWords, setRawWords] = useState([]) // 상태 자동판별용(원문 텍스트만 사용)
  const [brandResult, setBrandResult] = useState({ brand: 'UNKNOWN', confidence: 0, matchedKeywords: [] })
  const [targetBox, setTargetBox] = useState(null) // smoothing 적용된 표시 퍼센트 박스
  const [targetMatch, setTargetMatch] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastProcessMs, setLastProcessMs] = useState(0)
  const [cycleCount, setCycleCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState(null) // DEV 전용: 마지막 주기의 video/ROI/canvas 크기 + 캔버스 미리보기

  const processingRef = useRef(false)
  const smoothedBoxRef = useRef(null)
  const targetTextsRef = useRef(targetTexts)
  const prevEnabledRef = useRef(enabled)

  targetTextsRef.current = targetTexts

  // enabled가 false -> true로 바뀔 때(재인식 시작 등) 이전 추적 상태를 초기화한다.
  useEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      smoothedBoxRef.current = null
      setCycleCount(0)
      setTargetBox(null)
      setTargetMatch(null)
    }
    prevEnabledRef.current = enabled
  }, [enabled])

  const runCycle = useCallback(async () => {
    // 이전 OCR 요청이 끝나기 전에는 새 요청을 시작하지 않는다(중복 실행 방지 lock).
    if (processingRef.current || !enabled || !isReady) return

    const video = videoRef.current
    const roiElement = roiElementRef.current
    if (!video || !roiElement || video.readyState < 2) return

    // video metadata가 아직 로드되지 않아 videoWidth/videoHeight가 0인 상태에서는
    // ROI 계산 자체가 무의미하므로(0으로 나누기 등) 여기서 바로 건너뛴다.
    if (!video.videoWidth || !video.videoHeight) return

    const roiVideoRect = getRoiInVideoCoords(video, roiElement)
    if (!roiVideoRect) return

    const cropped = cropRoiCanvas(video, roiVideoRect)
    if (!cropped) return

    if (import.meta.env.DEV) {
      const roi = cropped.roiVideoRect
      console.log(
        `[OCR] Video size: ${video.videoWidth} x ${video.videoHeight}\n` +
          `[OCR] Display size: ${video.clientWidth} x ${video.clientHeight}\n` +
          `[OCR] ROI: x=${Math.round(roi.x)}, y=${Math.round(roi.y)}, width=${Math.round(roi.width)}, height=${Math.round(roi.height)}\n` +
          `[OCR] Canvas size: ${cropped.canvas.width} x ${cropped.canvas.height}`,
      )
      setDebugInfo({
        videoSize: { width: video.videoWidth, height: video.videoHeight },
        displaySize: { width: video.clientWidth, height: video.clientHeight },
        roi,
        canvasSize: { width: cropped.canvas.width, height: cropped.canvas.height },
        // ROI crop 자체가 정상적인 이미지인지 눈으로 확인할 수 있도록 썸네일로 남겨둔다.
        canvasPreviewUrl: cropped.canvas.toDataURL('image/jpeg', 0.7),
      })
    }

    processingRef.current = true
    setIsProcessing(true)
    const startedAtMs = performance.now()

    try {
      const words = await recognize(cropped.canvas)

      // ROI 캔버스 좌표 -> video 원본 픽셀 좌표로 되돌린다.
      // cropRoiCanvas가 drawImage 직전에 한 번 더 clamp한 roiVideoRect를 기준으로 삼아야
      // 실제로 캡처된 이미지 영역과 좌표가 정확히 일치한다.
      const videoWords = words.map((word) => ({
        ...word,
        ...mapRoiWordToVideoBox(word, cropped.roiVideoRect, cropped.resizeScale),
      }))

      setRawWords(videoWords)
      setOcrWords(
        videoWords
          .map((word) => {
            const displayBox = mapVideoBoxToDisplayBox(word, video)
            return displayBox ? { text: word.text, ...displayBox } : null
          })
          .filter(Boolean),
      )

      const brand = classifyBrand(videoWords)
      setBrandResult(brand)

      const hasTarget = targetTextsRef.current?.length > 0
      const match =
        brand.confidence >= BRAND_CONFIDENCE_THRESHOLD && hasTarget
          ? findBestTextMatch(videoWords, targetTextsRef.current)
          : null

      if (match) {
        const displayBox = mapVideoBoxToDisplayBox(match.box, video)
        const previous = smoothedBoxRef.current

        const smoothed = previous
          ? {
              x: previous.x * SMOOTHING_KEEP + displayBox.x * (1 - SMOOTHING_KEEP),
              y: previous.y * SMOOTHING_KEEP + displayBox.y * (1 - SMOOTHING_KEEP),
              width: previous.width * SMOOTHING_KEEP + displayBox.width * (1 - SMOOTHING_KEEP),
              height: previous.height * SMOOTHING_KEEP + displayBox.height * (1 - SMOOTHING_KEEP),
            }
          : displayBox

        smoothedBoxRef.current = smoothed
        setTargetBox(smoothed)
        setTargetMatch({ text: match.text, confidence: match.confidence })
      } else {
        smoothedBoxRef.current = null
        setTargetBox(null)
        setTargetMatch(null)
      }
    } catch (err) {
      console.error('[useARTracking] OCR 처리 중 오류:', err)
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      setLastProcessMs(Math.round(performance.now() - startedAtMs))
      setCycleCount((count) => count + 1)
    }
  }, [enabled, isReady, recognize, roiElementRef, videoRef])

  useEffect(() => {
    if (!enabled) return undefined

    runCycle()
    const intervalId = setInterval(runCycle, OCR_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [enabled, runCycle])

  return {
    ocrWords,
    rawWords,
    brandResult,
    targetBox,
    targetMatch,
    isProcessing,
    lastProcessMs,
    cycleCount,
    debugInfo,
  }
}

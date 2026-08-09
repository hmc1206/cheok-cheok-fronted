/**
 * 카메라 video 픽셀 좌표 <-> 화면(브라우저) 표시 좌표 간 변환을 담당한다.
 *
 * video는 object-fit: cover로 렌더링되기 때문에 다음 두 가지를 함께 고려해야 한다.
 * 1) 원본 해상도(videoWidth/videoHeight)와 실제 표시 크기(clientWidth/clientHeight)가 다르다 -> scale
 * 2) cover 특성상 영상의 일부가 화면 밖으로 잘려 나간다 -> crop offset
 * 단순히 x/y 비율만 곱하면 이 두 가지를 무시하게 되어 위치가 어긋난다.
 */

// video 표시 크기와 원본 해상도 사이의 scale, crop offset을 계산한다.
function getCoverTransform(video) {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  const displayWidth = video.clientWidth
  const displayHeight = video.clientHeight

  if (!videoWidth || !videoHeight || !displayWidth || !displayHeight) {
    return null
  }

  // object-fit: cover는 "짧은 변을 채우는" 더 큰 scale을 사용한다.
  const scale = Math.max(displayWidth / videoWidth, displayHeight / videoHeight)
  const renderedWidth = videoWidth * scale
  const renderedHeight = videoHeight * scale

  return {
    scale,
    offsetX: (renderedWidth - displayWidth) / 2,
    offsetY: (renderedHeight - displayHeight) / 2,
    displayWidth,
    displayHeight,
    videoWidth,
    videoHeight,
  }
}

// 전면 카메라 등에서 CSS로 좌우 반전(scaleX(-1))이 적용되어 있는지 감지한다.
// 이 프로젝트는 현재 video에 별도 mirror 스타일을 적용하지 않지만, 추후 적용되더라도
// 좌표가 깨지지 않도록 실제 computed transform을 검사해 보정 여부를 스스로 판단한다.
function isMirrored(video) {
  if (typeof window === 'undefined') return false

  const transform = window.getComputedStyle(video).transform
  if (!transform || transform === 'none') return false

  const match = transform.match(/matrix\(([^)]+)\)/)
  if (!match) return false

  const a = parseFloat(match[1].split(',')[0])
  return Number.isFinite(a) && a < 0
}

/**
 * 정렬 화면에서 사용자가 맞춘 가이드 사각형(ROI)의 위치를 video 원본 픽셀 좌표로 변환한다.
 * @param {HTMLVideoElement} video
 * @param {HTMLElement} roiElement 가이드 사각형과 동일한 위치/크기를 갖는 기준 엘리먼트
 * @returns {{x:number, y:number, width:number, height:number}|null}
 */
export function getRoiInVideoCoords(video, roiElement) {
  const transform = getCoverTransform(video)
  if (!transform || !roiElement) return null

  const videoRect = video.getBoundingClientRect()
  const roiRect = roiElement.getBoundingClientRect()

  let displayLeft = roiRect.left - videoRect.left
  const displayTop = roiRect.top - videoRect.top

  if (isMirrored(video)) {
    displayLeft = transform.displayWidth - displayLeft - roiRect.width
  }

  const videoX = (displayLeft + transform.offsetX) / transform.scale
  const videoY = (displayTop + transform.offsetY) / transform.scale
  const videoWidth = roiRect.width / transform.scale
  const videoHeight = roiRect.height / transform.scale

  // 가이드 박스가 video 경계를 살짝 벗어나는 경우를 대비해 clamp 처리
  const clampedX = Math.max(0, Math.min(videoX, transform.videoWidth))
  const clampedY = Math.max(0, Math.min(videoY, transform.videoHeight))
  const clampedWidth = Math.max(0, Math.min(videoWidth, transform.videoWidth - clampedX))
  const clampedHeight = Math.max(0, Math.min(videoHeight, transform.videoHeight - clampedY))

  if (clampedWidth <= 0 || clampedHeight <= 0) return null

  return { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight }
}

/**
 * video 원본 픽셀 좌표계의 박스를, 화면에 실제로 표시되는 기준의 "퍼센트" 박스로 변환한다.
 * KioskAROverlay가 기대하는 { x, y, width, height } (중심 좌표, 퍼센트 단위) 포맷으로 반환한다.
 * @param {{x:number, y:number, width:number, height:number}} box video 픽셀 좌표 박스
 * @param {HTMLVideoElement} video
 */
export function mapVideoBoxToDisplayBox(box, video) {
  const transform = getCoverTransform(video)
  if (!transform) return null

  let left = box.x * transform.scale - transform.offsetX
  const top = box.y * transform.scale - transform.offsetY
  const width = box.width * transform.scale
  const height = box.height * transform.scale

  if (isMirrored(video)) {
    left = transform.displayWidth - left - width
  }

  return {
    x: ((left + width / 2) / transform.displayWidth) * 100,
    y: ((top + height / 2) / transform.displayHeight) * 100,
    width: (width / transform.displayWidth) * 100,
    height: (height / transform.displayHeight) * 100,
  }
}

/**
 * ROI 캔버스(잘라내고 리사이즈한 이미지) 기준 OCR 단어 좌표를 video 원본 픽셀 좌표로 되돌린다.
 * @param {{x:number, y:number, width:number, height:number}} word ROI 캔버스 픽셀 좌표
 * @param {{x:number, y:number, width:number, height:number}} roiVideoRect ROI의 video 픽셀 좌표
 * @param {number} resizeScale cropRoiCanvas에서 적용한 다운스케일 비율
 */
export function mapRoiWordToVideoBox(word, roiVideoRect, resizeScale) {
  return {
    x: roiVideoRect.x + word.x / resizeScale,
    y: roiVideoRect.y + word.y / resizeScale,
    width: word.width / resizeScale,
    height: word.height / resizeScale,
  }
}

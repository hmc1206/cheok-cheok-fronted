/**
 * "카드 촬영처럼 화면을 맞추는" 자동 촬영 판단에 쓰는 두 가지 신호를 계산한다.
 *
 * 1) computeEdgeDensity: 가이드 사각형 안이 얼마나 "꽉 차 있는지"(점유율)를 대신하는 근사치.
 *    실제 키오스크 화면 가장자리를 정확히 검출하는 것은 어렵기 때문에(요구사항에서도
 *    "완벽한 외곽선 인식이 어렵다면"이라고 전제함), 대신 인접 픽셀 간 밝기 변화량(그라디언트)
 *    총합을 쓴다. 키오스크 화면처럼 글자/버튼/경계선이 빽빽한 이미지는 이 값이 크고,
 *    빈 배경·카운터·블러 상태는 값이 작다는 경험적 가정에 기반한 휴리스틱이다.
 *    -> 실제 매장에서 값이 잘 안 맞으면 FILL_EDGE_THRESHOLD(useKioskCapture.js)만 조정하면 된다.
 *
 * 2) computeFrameDiff: 기존 FrameDiffDetector.jsx(현재 미사용 컴포넌트)가 쓰던 것과
 *    동일한 샘플링 기반 프레임 간 픽셀 차이 계산 방식을 그대로 옮겨왔다(흔들림/움직임
 *    판정용). 그 컴포넌트 파일 자체를 import하면 "컴포넌트 파일에서 함수를 export"하게 되어
 *    Fast Refresh 경고가 발생하므로, 알고리즘만 이 서비스 파일에 옮겨 적었다(원본은
 *    수정하지 않았다).
 */

/**
 * @param {ImageData} imageData
 * @returns {number} 0~1 사이로 정규화된 "화면이 꽉 차 있을 가능성" 점수
 */
export function computeEdgeDensity(imageData) {
  const { data, width, height } = imageData
  if (width < 2 || height < 2) return 0

  let totalGradient = 0
  let sampleCount = 0

  // 2픽셀 간격으로 샘플링해 계산량을 줄인다(정확도보다 "안정적으로 매 프레임 계산 가능"이 우선).
  for (let y = 0; y < height - 1; y += 2) {
    for (let x = 0; x < width - 1; x += 2) {
      const i = (y * width + x) * 4
      const iRight = (y * width + (x + 1)) * 4
      const iDown = ((y + 1) * width + x) * 4

      // 표준 luma 가중치로 그레이스케일 근사(라이브러리 없이 간단히 구현).
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const lumaRight = 0.299 * data[iRight] + 0.587 * data[iRight + 1] + 0.114 * data[iRight + 2]
      const lumaDown = 0.299 * data[iDown] + 0.587 * data[iDown + 1] + 0.114 * data[iDown + 2]

      totalGradient += Math.abs(luma - lumaRight) + Math.abs(luma - lumaDown)
      sampleCount += 1
    }
  }

  if (sampleCount === 0) return 0

  // 경험적으로 정한 정규화 상수(120). 실기기 테스트 후 필요하면 조정한다.
  const averageGradient = totalGradient / sampleCount
  return Math.min(1, averageGradient / 120)
}

/**
 * 두 프레임(ImageData) 사이의 평균 픽셀 차이(0~255)를 구한다.
 * 10픽셀 단위로 샘플링해 매 프레임 전체를 비교하는 비용을 줄인 간단한 변화 감지이며,
 * 정교한 모션 감지 알고리즘은 아니다(FrameDiffDetector.jsx와 동일한 방식).
 * @param {ImageData} prevImageData
 * @param {ImageData} currentImageData
 * @returns {number}
 */
export function computeFrameDiff(prevImageData, currentImageData) {
  const prevData = prevImageData.data
  const currentData = currentImageData.data
  let total = 0
  const sampleStep = 4 * 10

  for (let i = 0; i < prevData.length; i += sampleStep) {
    total += Math.abs(prevData[i] - currentData[i])
  }

  return total / (prevData.length / sampleStep)
}

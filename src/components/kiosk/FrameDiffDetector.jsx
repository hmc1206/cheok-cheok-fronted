import { useEffect, useRef } from 'react'

const CAPTURE_INTERVAL_MS = 500
// ASSUMPTION: 변화 감지 임계값은 가이드북에 명시되어 있지 않아 임의로 정했다.
// 실제 튜닝은 백엔드/QA와 협의해 조정이 필요하다.
const DIFF_THRESHOLD = 20

/**
 * 화면(렌더 결과) 없이 카메라 프레임을 주기적으로 캡처해 직전 프레임과 픽셀 차이를 비교하고,
 * 임계값을 넘으면 onChangeDetected(blob)를 호출하는 감지기. 키오스크 화면이 바뀌는 순간
 * (버튼을 눌러 다음 화면으로 넘어가는 순간)을 자동으로 포착하기 위한 용도다 (기획서 4-4장).
 */
export function FrameDiffDetector({ videoRef, onChangeDetected, enabled = true }) {
  const canvasRef = useRef(null)
  const previousFrameRef = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas')

    const canvas = canvasRef.current
    const context = canvas.getContext('2d', { willReadFrequently: true })

    const intervalId = setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height)

      if (previousFrameRef.current) {
        const diff = calculatePixelDiff(previousFrameRef.current.data, currentFrame.data)
        if (diff > DIFF_THRESHOLD) {
          canvas.toBlob((blob) => blob && onChangeDetected?.(blob), 'image/jpeg', 0.8)
        }
      }

      previousFrameRef.current = currentFrame
    }, CAPTURE_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [enabled, onChangeDetected, videoRef])

  return null
}

// 두 프레임의 평균 픽셀 차이(0~255)를 구한다. 10픽셀 단위로 샘플링해 매 프레임 전체를
// 비교하는 비용을 줄인 간단한 변화 감지이며, 정교한 모션 감지 알고리즘은 아니다.
function calculatePixelDiff(prevData, currentData) {
  let total = 0
  const sampleStep = 4 * 10

  for (let i = 0; i < prevData.length; i += sampleStep) {
    total += Math.abs(prevData[i] - currentData[i])
  }

  return total / (prevData.length / sampleStep)
}

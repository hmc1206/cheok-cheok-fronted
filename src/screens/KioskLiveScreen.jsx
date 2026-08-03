import { useCallback, useRef, useState } from 'react'
import { kioskApi } from '../api/kioskApi'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { CameraPreview } from '../components/kiosk/CameraPreview'
import { FrameDiffDetector } from '../components/kiosk/FrameDiffDetector'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 실전 키오스크 도움 화면 (기획서 4-4장, 명세서에 없는 신규 기능).
// 교육 시뮬레이션(/kiosk/training, 기존 /kiosk/scenarios 계열)과는 완전히 분리된 화면이다.
export function KioskLiveScreen() {
  const videoRef = useRef(null)
  const [guide, setGuide] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzeFrame = useCallback(
    async (blob) => {
      if (isAnalyzing) return // 이전 분석 응답이 오기 전에는 중복 전송하지 않는다.
      setIsAnalyzing(true)
      try {
        const imageBase64 = await blobToBase64(blob)
        // TODO(backend): /kiosk/live/analyze는 API 명세서 v1.0에 없는 신규 엔드포인트.
        // 백엔드팀에 추가 요청 필요 (kioskApi.js의 ASSUMPTION 주석 참고).
        const result = await kioskApi.analyzeLiveFrame(imageBase64)
        setGuide(result)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [isAnalyzing],
  )

  // 수동 트리거: "여기 뭘 눌러요?" 버튼으로 즉시 캡처 요청.
  const handleManualCapture = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => blob && analyzeFrame(blob), 'image/jpeg', 0.8)
  }, [analyzeFrame])

  return (
    <main className="flex flex-col gap-4 p-6 pb-40">
      <h1 style={{ fontSize: 'var(--font-size-xl)' }}>키오스크 도움</h1>

      <div className="relative">
        <CameraPreview ref={videoRef} />

        {/* ASSUMPTION: highlightArea 좌표 단위는 명세서 미정이라 %(카메라 프리뷰 기준 상대좌표)로 가정 */}
        {guide?.highlightArea && (
          <div
            className="absolute border-4"
            style={{
              borderColor: 'var(--color-primary)',
              left: `${guide.highlightArea.x}%`,
              top: `${guide.highlightArea.y}%`,
              width: `${guide.highlightArea.width}%`,
              height: `${guide.highlightArea.height}%`,
            }}
          />
        )}
      </div>

      {/* 500ms 간격으로 직전 프레임과 diff 비교, 임계값 이상 변화 시 자동 캡처/전송 */}
      <FrameDiffDetector videoRef={videoRef} onChangeDetected={analyzeFrame} />

      <button type="button" className="quick-action-button" onClick={handleManualCapture}>
        여기 뭘 눌러요?
      </button>

      {guide?.guideText && <p>{guide.guideText}</p>}

      <CaptionOverlay sttCaption="" ttsCaption={guide?.ttsText ?? ''} />
    </main>
  )
}

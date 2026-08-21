import { forwardRef, useEffect } from 'react'

// KioskLiveScreen의 카메라 프리뷰. videoRef를 부모(FrameDiffDetector, 수동 캡처 로직)와
// 공유해야 하므로 forwardRef로 video 엘리먼트를 그대로 노출한다.
export const CameraPreview = forwardRef(function CameraPreview(_props, videoRef) {
  useEffect(() => {
    let stream

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((mediaStream) => {
        stream = mediaStream
        if (videoRef.current) videoRef.current.srcObject = mediaStream
      })
      .catch(() => {
        // ASSUMPTION: 카메라 권한 거부 시 안내 UI는 디자이너 파일 적용 후 채운다.
      })

    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [videoRef])

  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
})

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * @typedef {'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error'} CameraStatus
 * @typedef {'NotAllowedError' | 'NotFoundError' | 'NotReadableError' | 'OverconstrainedError' | 'SecurityError' | 'UnknownError' | null} CameraErrorType
 */

/**
 * 키오스크 카메라 획득 및 스트림 제어를 담당하는 커스텀 훅
 * 후면 카메라 우선 지정, 기존 트랙 안전 해제, 에러 세부 분류, play() 예외 처리를 수행합니다.
 */
export function useCamera() {
  const videoRef = useRef(null)
  /** @type {[CameraStatus, React.Dispatch<React.SetStateAction<CameraStatus>>]} */
  const [cameraStatus, setCameraStatus] = useState('idle')
  /** @type {[CameraErrorType, React.Dispatch<React.SetStateAction<CameraErrorType>>]} */
  const [errorType, setErrorType] = useState(null)

  // 현재 연결된 미디어 스트림 참참값 저장
  const streamRef = useRef(null)

  /**
   * 활성화되어 있는 모든 카메라 미디어 트랙 중지 및 리소스 해제
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      // 한국어 주석: 메모리 누수 방지 및 타 앱과의 카메라 점유 경합을 피하기 위해 모든 트랙을 명시적으로 stop 처리합니다.
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraStatus('idle')
    setErrorType(null)
  }, [])

  /**
   * 카메라 권한 요청 및 비디오 스트림 시작
   */
  const startCamera = useCallback(async () => {
    // 1. 브라우저의 mediaDevices 지원 여부 검사
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unsupported')
      setErrorType('UnknownError')
      return
    }

    // 기존에 켜져 있던 스트림이 있다면 트랙 멈춤
    stopCamera()
    setCameraStatus('requesting')
    setErrorType(null)

    // 후면 카메라 제약 조건 지정
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' }, // 후면 카메라 우선 지정
      },
      audio: false,
    }

    try {
      // 한국어 주석: getUserMedia 호출 시 브라우저 권한 팝업이 노출되며, 거부 시 catch 블록으로 이동합니다.
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        // 모바일 브라우저(Safari/Chrome)에서 자동 재생 제한 정책으로 인해 검은 화면이 남는 문제 방지 예외 처리
        try {
          await videoRef.current.play()
        } catch (playError) {
          // play() 실패 시에도 loadedmetadata 이벤트 등으로 재시도할 수 있도록 처리
          console.warn('[useCamera] video.play() 자동 재생 실패 예외 처리됨:', playError)
        }
      }

      setCameraStatus('active')
    } catch (err) {
      console.error('[useCamera] getUserMedia 오류 발생:', err)

      let mappedError = 'UnknownError'
      if (err instanceof DOMException || err?.name) {
        switch (err.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            mappedError = 'NotAllowedError'
            setCameraStatus('denied')
            break
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            mappedError = 'NotFoundError'
            setCameraStatus('error')
            break
          case 'NotReadableError':
          case 'TrackStartError':
            mappedError = 'NotReadableError'
            setCameraStatus('error')
            break
          case 'OverconstrainedError':
          case 'ConstraintNotSatisfiedError':
            mappedError = 'OverconstrainedError'
            setCameraStatus('error')
            break
          case 'SecurityError':
            mappedError = 'SecurityError'
            setCameraStatus('error')
            break
          default:
            mappedError = 'UnknownError'
            setCameraStatus('error')
            break
        }
      } else {
        setCameraStatus('error')
      }

      setErrorType(mappedError)
    }
  }, [stopCamera])

  // 언마운트 시 트랙 정리
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    videoRef,
    cameraStatus,
    errorType,
    startCamera,
    stopCamera,
  }
}

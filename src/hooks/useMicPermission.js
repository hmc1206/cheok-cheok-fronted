import { useEffect } from 'react'
import { queryMicrophonePermission, requestMicrophoneAccess } from '../lib/micPermission'
import { useMicPermissionStore } from '../store/micPermissionStore'

/**
 * 마이크 권한 상태를 관리하는 훅. 마운트 시 현재 권한 상태를 한 번 조회해서
 * 스토어에 반영하고, 실제 브라우저 권한 팝업을 띄우는 requestPermission()을
 * 노출한다.
 *
 * requestPermission은 반드시 사용자 클릭 이벤트 핸들러 안에서 직접 호출해야
 * 한다(Safari는 사용자 제스처 밖에서 호출된 getUserMedia를 막는다) — 이 훅
 * 자신은 절대로 requestPermission을 자동 호출하지 않는다.
 */
export function useMicPermission() {
  const status = useMicPermissionStore((state) => state.status)
  const setStatus = useMicPermissionStore((state) => state.setStatus)

  useEffect(() => {
    // HTTPS(또는 localhost)가 아니면 getUserMedia 자체가 브라우저에서 동작하지
    // 않는다 — 배포 환경이 http로 잘못 설정된 경우를 개발자가 바로 알아챌 수
    // 있게 콘솔 경고만 남기고, 사용자에게 보이는 UI는 따로 바꾸지 않는다(어차피
    // 아래 queryMicrophonePermission이 'unsupported'/'prompt'로 자연스럽게
    // 이어져서 처리됨).
    if (!window.isSecureContext) {
      console.warn(
        '[useMicPermission] 보안 컨텍스트(HTTPS 또는 localhost)가 아니라 마이크 권한을 요청할 수 없습니다.',
      )
    }

    let cancelled = false
    queryMicrophonePermission().then((result) => {
      if (!cancelled) setStatus(result)
    })

    return () => {
      cancelled = true
    }
  }, [setStatus])

  const requestPermission = async () => {
    try {
      await requestMicrophoneAccess()
      setStatus('granted')
    } catch {
      // 거부든, 장치가 없든, 그 외 어떤 이유로 실패하든 사용자 입장에서는 결국
      // "마이크를 못 쓴다"는 같은 결과라 전부 denied로 묶는다. 새로고침해도
      // 브라우저가 거부 상태를 기억해 재호출 시 팝업 없이 바로 실패를 반환하므로,
      // 여기서 재시도 루프를 넣지 않는다(요구사항 5).
      setStatus('denied')
    }
  }

  return { status, requestPermission }
}

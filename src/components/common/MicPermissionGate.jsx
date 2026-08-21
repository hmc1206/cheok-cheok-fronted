import { useMicPermission } from '../../hooks/useMicPermission'
import { useLocation } from 'react-router-dom'
import { MicPermissionBanner } from './MicPermissionBanner'
import { MicPermissionModal } from './MicPermissionModal'

// 앱 최상단(App.jsx)에 한 번만 마운트해서, 앱을 처음 로드했을 때 마이크 권한
// 상태를 확인하고 그에 맞는 UI(모달/배너)를 띄우는 지점. 권한 상태 자체는
// Zustand 스토어(useMicPermissionStore)에 전역으로 있어서 이 컴포넌트를 Provider로
// 쓸 필요는 없다 — 상태를 "어디서든 구독 가능하게" 하는 역할은 스토어가 이미
// 하고 있고, 이 컴포넌트는 "앱 로드 시 한 번 확인 + 상태별 UI 표시"만 담당한다.
export function MicPermissionGate() {
  const { pathname } = useLocation()
  const { status, requestPermission } = useMicPermission()

  // 키오스크 시뮬레이션은 음성 입력이 아니라 브라우저 TTS만 사용한다. 주문 체험을
  // 마이크 권한 모달이 가리지 않도록 이 경로에서는 권한 UI를 띄우지 않는다.
  if (pathname === '/kiosk') return null

  if (status === 'prompt') {
    return <MicPermissionModal onAllow={requestPermission} />
  }
  if (status === 'denied') {
    return <MicPermissionBanner />
  }
  // idle(확인 중)/granted/unsupported는 화면에 별도로 보여줄 게 없다.
  return null
}

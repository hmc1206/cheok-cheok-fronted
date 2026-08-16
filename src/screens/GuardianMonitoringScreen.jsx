/** Design reminder — reuse the shared control-board placeholder, not a bespoke empty state. */
import { useNavigate } from 'react-router-dom'
import { MobileFeaturePlaceholder } from '../components/common/MobileFeaturePlaceholder'

// 설정 화면 "보호자 모니터링 > 보기"에서 진입하는 화면. 실제로 보여줄 보호자
// 모니터링 데이터/화면 기획이 아직 없어(API 명세서에도 없음, 사용자 확인:
// 플레이스홀더로 연결) YoutubePlayerScreen.jsx/KioskLiveScreen.jsx와 같은
// 방식으로 공용 MobileFeaturePlaceholder를 재사용한다.
export function GuardianMonitoringScreen() {
  const navigate = useNavigate()
  return (
    <MobileFeaturePlaceholder
      title="보호자 모니터링"
      eyebrow="함께 안심하는 이용"
      description="보호자가 이용 현황을 확인할 수 있는 화면을 준비하고 있어요."
      tip="이용 시간, 최근 활동 같은 정보를 보호자와 함께 볼 수 있도록 도와드릴 예정이에요."
      onBack={() => navigate(-1)}
      icon={<ShieldGlyph />}
    />
  )
}

function ShieldGlyph() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 4 6v6c0 4.4 3.4 8.4 8 9 4.6-.6 8-4.6 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

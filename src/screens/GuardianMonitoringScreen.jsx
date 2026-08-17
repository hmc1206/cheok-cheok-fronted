/** Design reminder — reuse the shared control-board placeholder, not a bespoke empty state. */
import { useNavigate } from 'react-router-dom'
import { MobileFeaturePlaceholder } from '../components/common/MobileFeaturePlaceholder'

// 설정 화면 "보호자 모니터링 > 보기"에서 진입하는 화면. 실제로 보여줄 보호자
// 모니터링 데이터/화면 기획이 아직 없어(API 명세서에도 없음, 사용자 확인:
// 플레이스홀더로 연결) YoutubePlayerScreen.jsx/KioskLiveScreen.jsx와 같은
// 방식으로 공용 MobileFeaturePlaceholder를 재사용한다.
//
// 뒤로가기 버그 수정: onBack이 navigate('/settings')로 되어 있어 히스토리를
// 되돌아가는(pop) 대신 새로 쌓는(push) 방식이었다. 그런데 설정 화면의 뒤로가기는
// navigate(-1)(pop)이라서, 이 화면(설정→보호자 모니터링→이 push로 다시 설정)에서
// 뒤로가기를 반복하면 [설정, 보호자모니터링, 설정(push된 것)] 스택에서 pop이
// 보호자 모니터링으로 되돌아가고, 거기서 다시 push로 설정에 쌓이길 반복해
// 결국 홈으로 빠져나가지 못했다. 같은 위치(설정 하위 화면)의
// AllowedAppsEditScreen과 동일하게 navigate(-1)로 맞춰 pop/push를 일관되게 해서
// 해결한다: 보호자 모니터링 → (뒤로가기) → 설정 → (뒤로가기) → 홈으로 정상 도달.
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

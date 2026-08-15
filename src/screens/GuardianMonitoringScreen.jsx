import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { ChevronLeftIcon } from '../components/common/icons'

// 설정 화면 "보호자 모니터링 > 보기"에서 진입하는 화면. 실제로 보여줄 보호자
// 모니터링 데이터/화면 기획이 아직 없어(API 명세서에도 없음, 사용자 확인:
// 플레이스홀더로 연결) UsageLimitScreen.jsx와 같은 방식의 라우팅 스텁만 둔다.
export function GuardianMonitoringScreen() {
  const navigate = useNavigate()

  return (
    <AppFrame>
      <main
        className="flex h-full flex-col"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex items-center gap-3 px-6 pt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, color: 'var(--color-text)' }}
          >
            <ChevronLeftIcon />
          </button>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text)' }}>
            보호자 모니터링
          </h1>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>
            보호자 모니터링 화면은 준비 중입니다.
          </p>
        </div>
      </main>
    </AppFrame>
  )
}

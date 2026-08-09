import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { useAuthStore } from '../store/authStore'

// 백엔드의 구글 로그인 진입점은 REST API(/api/...)가 아니라 Spring Security가
// 처리하는 /oauth2/authorization/google이라 VITE_API_BASE_URL의 /api 없이
// origin만 떼어서 붙인다 (그대로 이어붙이면 /api/oauth2/... 로 잘못 요청하게 된다).
const GOOGLE_LOGIN_URL = `${new URL(import.meta.env.VITE_API_BASE_URL).origin}/oauth2/authorization/google`

// 첫 진입 화면(랜딩/스플래시 성격). 앱처럼 보이도록 AppFrame(393x852 고정 프레임)으로
// 감싸고, "척척" 타이틀이 슬라이드업된 뒤 서브타이틀이 이어서 나타난다.
export function LoginPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)

  // 이미 로그인된 상태로 로그인 페이지("/" 또는 "/login")에 들어오면 실제 홈("/home")으로
  // 보낸다. "/"가 이 화면 자신이라 navigate('/')로 하면 제자리 이동이라 아무 효과가 없다.
  useEffect(() => {
    if (token) navigate('/home')
  }, [token, navigate])

  const handleGoogleLogin = () => {
    // 버튼 클릭 시 백엔드의 구글 인증 주소로 브라우저 전체를 이동시킨다.
    // 구글 동의화면 → 백엔드 처리 → /auth/callback으로 리다이렉트되는 흐름 전체가
    // 백엔드/구글이 관리하므로, 프론트는 이 첫 이동만 트리거하면 된다.
    window.location.href = GOOGLE_LOGIN_URL
  }

  // 개발 중 백엔드가 안 떠 있으면 구글 로그인 버튼을 눌러도 넘어갈 수 없어, 화면
  // 전환 확인용으로 가짜 토큰을 넣고 넘어가는 우회 버튼. import.meta.env.DEV는 Vite가
  // `npm run dev`에서만 true로 주입하므로 배포 빌드(npm run build)에는 포함되지 않는다.
  const handleDevBypass = () => {
    useAuthStore.getState().setAuth({ token: 'dev-fake-token', userId: 'dev-user', isNewUser: false })
  }

  return (
    <AppFrame>
      <main className="flex flex-col items-center justify-between h-full bg-white px-6 py-16">
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          {/* 타이틀: 굵게(800), 서브타이틀: 상대적으로 얇게(500) — 의미에 따른 굵기 구분 */}
          <h1 className="chuck-title-animate" style={{ fontSize: '48px', fontWeight: 800, color: '#000000' }}>
            척척
          </h1>
          <p
            className="chuck-subtitle-animate"
            style={{ fontSize: '16px', fontWeight: 500, color: '#000000' }}
          >
            뭐든지 척척 알려주는 AI 비서
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={handleGoogleLogin} className="quick-action-button w-full">
            구글 계정으로 로그인
          </button>

          {/* 개발 모드 전용: 배포 빌드에는 포함되지 않는다 */}
          {import.meta.env.DEV && (
            <button type="button" onClick={handleDevBypass} className="quick-action-button w-full">
              (개발용) 로그인 건너뛰기
            </button>
          )}
        </div>
      </main>
    </AppFrame>
  )
}

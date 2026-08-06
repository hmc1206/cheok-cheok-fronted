import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// 백엔드의 구글 로그인 진입점은 REST API(/api/...)가 아니라 Spring Security가
// 처리하는 /oauth2/authorization/google이라 VITE_API_BASE_URL의 /api 없이
// origin만 떼어서 붙인다 (그대로 이어붙이면 /api/oauth2/... 로 잘못 요청하게 된다).
const GOOGLE_LOGIN_URL = `${new URL(import.meta.env.VITE_API_BASE_URL).origin}/oauth2/authorization/google`

export function LoginPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)

  // 이미 로그인된 상태로 로그인 페이지에 들어오면 홈으로 되돌린다.
  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  const handleGoogleLogin = () => {
    // 버튼 클릭 시 백엔드의 구글 인증 주소로 브라우저 전체를 이동시킨다.
    // 구글 동의화면 → 백엔드 처리 → /auth/callback으로 리다이렉트되는 흐름 전체가
    // 백엔드/구글이 관리하므로, 프론트는 이 첫 이동만 트리거하면 된다.
    window.location.href = GOOGLE_LOGIN_URL
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh gap-6 p-6">
      <h1 style={{ fontSize: 'var(--font-size-xl)' }}>로그인</h1>

      <button type="button" onClick={handleGoogleLogin} className="quick-action-button">
        구글 계정으로 로그인
      </button>
    </main>
  )
}

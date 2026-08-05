import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)

  // 💡 이미 로그인된 유저가 로그인 페이지에 오면 메인으로 튕겨냅니다.
  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [token, navigate])

  // 💡 백엔드 구글 로그인 엔드포인트 주소 (localhost:8080)
  const GOOGLE_LOGIN_URL = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`

  const handleGoogleLogin = () => {
    // 버튼 클릭 시 백엔드가 지정한 구글 인증 주소로 화면을 강제 이동시킵니다.
    window.location.href = GOOGLE_LOGIN_URL
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh gap-6 p-6 bg-background">
      <h1 className="font-bold text-2xl" style={{ fontSize: 'var(--font-size-xl)' }}>
        로그인
      </h1>
      
      {/* 명세서 스타일의 구글 로그인 버튼 */}
      <button
        onClick={handleGoogleLogin}
        className="flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium text-base cursor-pointer"
      >
        {/* 구글 G 로고 심볼 (원하시면 텍스트만 남기셔도 됩니다) */}
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.102 6.612l4.164 3.153z"
          />
          <path
            fill="#4285F4"
            d="M23.49 12.275c0-.796-.073-1.564-.205-2.304H12v4.364h6.443a5.503 5.503 0 0 1-2.386 3.613l3.723 2.882c2.177-2.005 3.432-4.955 3.432-8.555z"
          />
          <path
            fill="#FBBC05"
            d="M5.266 14.235L1.102 17.39A11.947 11.947 0 0 0 12 24c3.055 0 5.864-1.005 8.018-2.736l-3.723-2.882a7.126 7.126 0 0 1-4.295 1.218 7.077 7.077 0 0 1-6.734-4.865z"
          />
          <path
            fill="#34A853"
            d="M5.266 9.765A7.045 7.045 0 0 1 5 12c0 .79.132 1.55.373 2.26l-4.164 3.13A11.956 11.956 0 0 1 0 12c0-1.93.455-3.755 1.264-5.388l4.002 3.153z"
          />
        </svg>
        구글 계정으로 로그인
      </button>
    </main>
  )
}

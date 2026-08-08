import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { AppFrame } from '../components/common/AppFrame'
import { useAuthStore } from '../store/authStore'

// 백엔드 구글 로그인 완료 후 리다이렉트를 받는 화면 (서버사이드 OAuth 리다이렉트 확정).
// 백엔드가 /auth/callback?token=...&isNewUser=...로 보내주면, 쿼리스트링을 파싱해
// authStore에 저장하고 /users/me로 실제 사용자 정보를 확정한 뒤 홈으로 이동한다.
export function AuthCallbackScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    const initAuth = async () => {
      const token = searchParams.get('token')
      const isNewUser = searchParams.get('isNewUser') === 'true'

      if (!token) {
        alert('로그인 정보가 유효하지 않습니다.')
        navigate('/login', { replace: true })
        return
      }

      // 1단계: 우선 토큰만으로 인증 상태를 채워둔다 — authApi.getMe()도 인증이 필요한
      // 요청이라 apiClient가 Authorization 헤더를 붙이려면 token이 먼저 스토어에 있어야 한다.
      setAuth({ token, userId: null, isNewUser })

      try {
        const userData = await authApi.getMe()
        setAuth({ token, userId: userData.userId, isNewUser })
        navigate('/', { replace: true })
      } catch (error) {
        console.error('[콜백] 로그인 사용자 정보 조회 실패:', error)
        useAuthStore.getState().clearAuth()
        alert('로그인 처리에 실패했습니다.')
        navigate('/login', { replace: true })
      }
    }

    initAuth()
  }, [searchParams, navigate, setAuth])

  return (
    <AppFrame>
      <div className="flex h-full items-center justify-center">로그인 세션 확인 중...</div>
    </AppFrame>
  )
}

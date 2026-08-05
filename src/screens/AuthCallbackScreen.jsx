import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import apiClient from '../api/apiClient'

export default function AuthCallbackScreen() {
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

      try {
        // 1. JWT 저장
        localStorage.setItem('accessToken', token)

        // 2. Zustand 임시 인증 상태 저장
        setAuth({
          token,
          userId: null,
          isNewUser,
        })

        // 3. 백엔드에서 실제 로그인 사용자 확인
        const response = await apiClient.get('/api/users/me')

        const userData = response.data

        console.log('[콜백] 로그인 사용자:', userData)

        const userId = userData.userId ?? userData.id

        if (!userId) {
          throw new Error('사용자 ID를 확인할 수 없습니다.')
        }

        // 4. 실제 사용자 정보로 인증 상태 확정
        setAuth({
          token,
          userId,
          isNewUser,
        })

        // 5. 로그인 완료
        navigate('/', { replace: true })

      } catch (error) {
        console.error('[콜백] 로그인 처리 실패:', error)

        // 잘못 저장된 토큰 제거
        localStorage.removeItem('accessToken')

        // 인증 상태 초기화
        setAuth({
          token: null,
          userId: null,
          isNewUser: false,
        })

        alert('로그인 처리에 실패했습니다.')
        navigate('/login', { replace: true })
      }
    }

    initAuth()
  }, [searchParams, navigate, setAuth])

  return <div>로그인 세션 확인 중...</div>
}

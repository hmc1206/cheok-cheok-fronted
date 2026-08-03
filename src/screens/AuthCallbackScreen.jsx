import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// 백엔드 구글 로그인 완료 후 리다이렉트를 받는 화면. 로그인 버튼/동의화면 UI는 스코프 밖이며
// (백엔드가 처리), 쿼리스트링의 token/isNewUser를 파싱해 authStore에 저장하는 로직만 담당한다
// (기획서 2장, 가이드북 5장 OAuth2 흐름).
export function AuthCallbackScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    const token = searchParams.get('token')
    const isNewUser = searchParams.get('isNewUser') === 'true'

    if (token) {
      // ASSUMPTION: userId는 콜백 쿼리스트링에 없다고 가정. authApi.getMe() 등으로 채우는
      // 것을 전제로 하되, 실제 연결은 로그인 화면 구현 시점(이번 스코프 밖)으로 남겨둔다.
      setAuth({ token, userId: null, isNewUser })
    }

    navigate('/', { replace: true })
  }, [navigate, searchParams, setAuth])

  return null // 스펙: UI 없음, 파싱/저장 로직만 구현
}

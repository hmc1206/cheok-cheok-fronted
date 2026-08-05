import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

// 구글 로그인 화면. GoogleLogin 팝업으로 idToken을 받아 백엔드에 검증을 맡기고,
// 응답에 userId가 어디에 들어있는지(response body vs JWT payload) 콘솔로 확인한다.
export function LoginPage({ setToken }) {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential
    if (!idToken) {
      alert('구글 로그인에 실패했습니다.')
      return
    }

    try {
      // authApi.loginWithGoogle이 이미 axios 응답의 .data를 반환하므로,
      // 아래 response는 백엔드 스펙상의 response.data 그 자체다.
      const response = await authApi.loginWithGoogle(idToken)
      console.log('[구글 로그인] 백엔드 응답(response.data):', response)

      const accessToken = response.accessToken
      localStorage.setItem('accessToken', accessToken)
      setToken?.(accessToken)

      if (response.userId !== undefined) {
        console.log('[구글 로그인] userId가 response.data.userId에 있음:', response.userId)
      } else {
        console.warn('[구글 로그인] response.data에 userId가 없음. accessToken(JWT) payload 확인 중...')
        const payload = decodeJwtPayload(accessToken)
        console.log('[구글 로그인] accessToken JWT payload:', payload)
        for (const key of ['sub', 'userId', 'email']) {
          if (payload?.[key] !== undefined) {
            console.log(`[구글 로그인] JWT payload.${key} =`, payload[key])
          }
        }
      }

      // ASSUMPTION: 새 팝업 방식 응답엔 isNewUser가 없어 false로 둔다. userId는 응답에
      // 있으면 그 값을, 없으면 JWT의 sub을 그대로 authStore에 반영해 나머지 화면(voiceApi 등)의
      // userId 전달이 끊기지 않게 한다.
      const payload = response.userId === undefined ? decodeJwtPayload(accessToken) : null
      setAuth({
        token: accessToken,
        userId: response.userId ?? payload?.sub ?? payload?.userId ?? null,
        isNewUser: false,
      })

      alert('성공적으로 로그인되었습니다!')
      // ASSUMPTION: 요청엔 "/search"로 이동하라고 되어 있었지만 이 앱엔 그런 라우트가 없어
      // 실제 홈 화면("/")으로 대체했다.
      navigate('/')
    } catch (error) {
      console.error('[구글 로그인] 실패:', error)
      alert(error.response?.data?.message ?? '로그인에 실패했습니다.')
    }
  }

  const handleError = () => {
    alert('로그인에 실패했습니다.')
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh gap-4 p-6">
      <h1 style={{ fontSize: 'var(--font-size-xl)' }}>로그인</h1>
      <GoogleLogin onSuccess={handleSuccess} onError={handleError} />
    </main>
  )
}

// JWT는 서명 검증 없이 payload(가운데 세그먼트)만 base64url 디코딩해 구조 확인용으로 읽는다.
function decodeJwtPayload(token) {
  try {
    const payloadSegment = token.split('.')[1]
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

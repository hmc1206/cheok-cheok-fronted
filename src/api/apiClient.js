import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// VITE_API_BASE_URL만 .env에서 바꾸면 mock 없이 실서버와 바로 붙는 구조.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// JWT 자동 첨부. Zustand 스토어를 컴포넌트 밖(axios 인터셉터)에서 읽어야 하므로
// 훅이 아니라 getState()로 직접 접근한다.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// API 명세서 6장: Refresh Token은 http-only 쿠키로 관리되고, POST /auth/refresh는
// { token }을 돌려준다. 인터셉터가 걸린 apiClient 인스턴스를 그대로 쓰면 401이 다시
// 이 인터셉터를 타고 무한 재시도로 이어질 수 있어, 순수 axios 호출로 분리했다.
async function refreshAccessToken() {
  const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, null, {
    withCredentials: true,
  })
  return response.data.token
}

// 가이드북 "공통 에러" 섹션: { errorCode, message, ttsText } 포맷을 공통으로 처리.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const payload = error.response?.data
    const originalRequest = error.config

    if (status === 409 && payload?.errorCode === 'SESSION_EXPIRED') {
      useVoiceSessionStore.getState().resetSession()

      // ASSUMPTION: 인터셉터는 React 트리 밖에서 실행되어 useTTS 훅을 쓸 수 없으므로,
      // Web Speech API를 직접 호출해 ttsText를 재생한다. 서버 오디오(Clova TTS) 폴백은
      // 화면 컴포넌트에서만 다루고 여기서는 생략했다.
      if (payload.ttsText && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(payload.ttsText))
      }
      return Promise.reject(error)
    }

    // 가이드북 6장 인증 흐름: 401이면 /auth/refresh로 갱신 후 원요청을 1회 재시도하고,
    // 갱신마저 실패하면 재로그인을 유도한다.
    if (status === 401 && originalRequest && !originalRequest._retriedAfterRefresh) {
      originalRequest._retriedAfterRefresh = true
      try {
        const token = await refreshAccessToken()
        const { userId, isNewUser } = useAuthStore.getState()
        useAuthStore.getState().setAuth({ token, userId, isNewUser })
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      } catch {
        useAuthStore.getState().clearAuth()
        // 토큰 갱신마저 실패하면 재로그인을 유도한다 (구글 로그인 화면: /login).
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient

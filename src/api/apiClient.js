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

// 가이드북 "공통 에러" 섹션: { errorCode, message, ttsText } 포맷을 공통으로 처리.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const payload = error.response?.data

    if (status === 409 && payload?.errorCode === 'SESSION_EXPIRED') {
      useVoiceSessionStore.getState().resetSession()

      // ASSUMPTION: 인터셉터는 React 트리 밖에서 실행되어 useTTS 훅을 쓸 수 없으므로,
      // Web Speech API를 직접 호출해 ttsText를 재생한다. 서버 오디오(Clova TTS) 폴백은
      // 화면 컴포넌트에서만 다루고 여기서는 생략했다.
      if (payload.ttsText && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(payload.ttsText))
      }
    }

    if (status === 401 || payload?.errorCode === 'UNAUTHORIZED') {
      useAuthStore.getState().clearAuth()
      // ASSUMPTION: "/auth/callback 이전 상태로 리다이렉트"의 정확한 목적지가 명세서에
      // 없어, 로그인 화면이 이번 스코프 밖인 점을 감안해 홈으로 되돌리는 것으로 가정했다.
      window.location.href = '/'
    }

    return Promise.reject(error)
  },
)

export default apiClient

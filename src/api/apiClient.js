import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true // 로컬 기본값 지정
})

// JWT 자동 첨부
apiClient.interceptors.request.use((config) => {
  // 💡 [수정 사항 1] 스토어에 아직 토큰이 채워지기 전(콜백 스크린 시점)일 수 있으므로, 
  // 로컬 스토리지에 임시 저장된 토큰까지 더블 체크해서 헤더에 확실하게 실어줍니다.
  const token = useAuthStore.getState().token || localStorage.getItem('accessToken');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 💡 [수정 사항 2] 백엔드 실제 주소 스펙인 '/api/auth/refresh'로 정확하게 정정합니다.
async function refreshAccessToken() {
  const response = await axios.post(`${apiClient.defaults.baseURL}/api/auth/refresh`, null, {
    withCredentials: true,
  })
  // 명세서 규격상 백엔드가 리턴하는 필드명이 'accessToken'인지 'token'인지 확인 후 맞춰줍니다.
  return response.data.accessToken || response.data.token;
}

// 공통 에러 및 401 리프레시 처리
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const payload = error.response?.data
    const originalRequest = error.config

    if (status === 409 && payload?.errorCode === 'SESSION_EXPIRED') {
      useVoiceSessionStore.getState().resetSession()

      if (payload.ttsText && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(payload.ttsText))
      }
      return Promise.reject(error)
    }

    // 401이면 토큰 갱신 후 원요청 1회 재시도
    if (status === 401 && originalRequest && !originalRequest._retriedAfterRefresh) {
      originalRequest._retriedAfterRefresh = true
      try {
        const token = await refreshAccessToken()
        const { userId, isNewUser } = useAuthStore.getState()
        
        // 브라우저 보존용 로컬 스토리지와 스토어 동시 갱신
        localStorage.setItem('accessToken', token);
        useAuthStore.getState().setAuth({ token, userId, isNewUser })
        
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        console.error('[인터셉터] 토큰 갱신 최종 실패:', refreshError)
        localStorage.removeItem('accessToken')
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient

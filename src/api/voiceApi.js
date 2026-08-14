import apiClient from './apiClient'

// API 명세서 v2.0 2장: audio(base64), text 중 최소 1개는 필수 (둘 다 없으면 400 INVALID_REQUEST).
export const voiceApi = {
  process: ({ userId, text, audio }) =>
    apiClient.post('/voice/process', { userId, text, audio }).then((res) => res.data),
}

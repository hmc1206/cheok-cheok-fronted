import apiClient from './apiClient'

// API 명세서 1장: text, audioBase64 중 최소 1개는 필수 (둘 다 없으면 400 INVALID_REQUEST).
export const voiceApi = {
  process: ({ userId, text, audioBase64 }) =>
    apiClient.post('/voice/process', { userId, text, audioBase64 }).then((res) => res.data),
}

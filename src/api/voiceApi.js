import apiClient from './apiClient'

// API 명세서 v2.0 2장: audio(base64), text 중 최소 1개는 필수 (둘 다 없으면 400 INVALID_REQUEST).
// latitude/longitude는 날씨 API 명세서 v1.0 4장 추가 필드 — "현재 위치" 기준 조회일
// 때만 선택적으로 실어 보낸다(선택값이라 안 보내면 undefined, JSON.stringify가
// undefined 필드는 그냥 생략해줘서 다른 intent 요청엔 아무 영향이 없다).
export const voiceApi = {
  process: ({ userId, text, audio, latitude, longitude }) =>
    apiClient.post('/voice/process', { userId, text, audio, latitude, longitude }).then((res) => res.data),
}

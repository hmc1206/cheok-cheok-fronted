import apiClient from './apiClient'

export const voiceApi = {
  // ASSUMPTION: MapRouteScreen에서 위치 권한이 허용되면 ASK_ORIGIN 질문을 건너뛰기 위해
  // originCoords를 함께 보낸다. 정확한 파라미터명은 API 명세서 v1.0에 없어 임의로 정한 것으로,
  // 백엔드 확정 시 이 필드명을 맞춰야 한다.
  process: ({ userId, text, audioBase64, originCoords }) =>
    apiClient
      .post('/voice/process', { userId, text, audioBase64, originCoords })
      .then((res) => res.data),
}

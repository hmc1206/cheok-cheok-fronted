import apiClient from './apiClient'

export const kioskApi = {
  getScenarios: () => apiClient.get('/kiosk/scenarios').then((res) => res.data),

  startScenario: (scenarioId) =>
    apiClient.post(`/kiosk/scenarios/${scenarioId}/start`).then((res) => res.data),

  submitAction: (scenarioId, { sessionId, tappedElementId }) =>
    apiClient
      .post(`/kiosk/scenarios/${scenarioId}/action`, { sessionId, tappedElementId })
      .then((res) => res.data),

  // TODO(backend): /kiosk/live/analyze는 API 명세서 v1.0에 없는 신규 엔드포인트다.
  // 백엔드팀에 추가를 요청해야 한다 (기획서 4-4장 참고).
  // ASSUMPTION: 응답 형태를 { ttsText, guideText, highlightArea? }로 가정해
  // 프론트 클라이언트 함수만 먼저 만들어둔다.
  analyzeLiveFrame: (imageBase64) =>
    apiClient.post('/kiosk/live/analyze', { imageBase64 }).then((res) => res.data),
}

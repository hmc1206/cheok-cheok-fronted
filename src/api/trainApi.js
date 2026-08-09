import apiClient from './apiClient'

export const trainApi = {
  // 마이페이지 화면 스펙이 아직 없어 함수만 만들어두고 화면 연결은 이번 스코프에서 제외.
  cancel: (reservationId) =>
    apiClient.post(`/train/reservations/${reservationId}/cancel`).then((res) => res.data),
  list: () => apiClient.get('/train/reservations').then((res) => res.data),
}

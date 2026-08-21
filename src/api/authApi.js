import apiClient from './apiClient'

// API 명세서 v2.0: /auth/refresh는 /api 없이, /api/users/me는 /api를 포함해서 호출한다
// (Base URL 자체엔 /api가 없음 — apiClient.js, .env 주석 참고).
export const authApi = {
  refresh: () => apiClient.post('/auth/refresh').then((res) => res.data),
  getMe: () => apiClient.get('/api/users/me').then((res) => res.data),
}

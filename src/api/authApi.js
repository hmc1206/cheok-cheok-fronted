import apiClient from './apiClient'

export const authApi = {
  refresh: () => apiClient.post('/auth/refresh').then((res) => res.data),
  getMe: () => apiClient.get('/users/me').then((res) => res.data),
}

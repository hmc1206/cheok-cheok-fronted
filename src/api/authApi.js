import apiClient from './apiClient'

export const authApi = {
  refresh: () => apiClient.post('/auth/refresh').then((res) => res.data),
  getMe: () => apiClient.get('/users/me').then((res) => res.data),
  // 구글 로그인(팝업) 흐름: idToken을 백엔드로 보내면 accessToken을 담아 돌려준다.
  // 백엔드가 request.get("token")으로 받는 스펙에 맞춰 바디 키를 token으로 고정.
  loginWithGoogle: (idToken) =>
    apiClient.post('/users/google', { token: idToken }).then((res) => res.data),
}

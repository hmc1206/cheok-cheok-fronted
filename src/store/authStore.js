import { create } from 'zustand'

// 구글 로그인(팝업) 성공 시 LoginPage가 여기에 토큰을 저장하고,
// 이후 apiClient의 요청 인터셉터가 token을 Authorization 헤더에 자동 첨부한다.
export const useAuthStore = create((set) => ({
  token: null,
  userId: null,
  isNewUser: false,

  setAuth: ({ token, userId, isNewUser }) => set({ token, userId, isNewUser }),
  clearAuth: () => set({ token: null, userId: null, isNewUser: false }),
}))

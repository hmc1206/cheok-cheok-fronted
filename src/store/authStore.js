import { create } from 'zustand'

// 가이드북 5장 OAuth2 흐름: AuthCallbackScreen이 쿼리스트링을 파싱해 여기에 저장하고,
// 이후 apiClient의 요청 인터셉터가 token을 Authorization 헤더에 자동 첨부한다.
export const useAuthStore = create((set) => ({
  token: null,
  userId: null,
  isNewUser: false,

  setAuth: ({ token, userId, isNewUser }) => set({ token, userId, isNewUser }),
  clearAuth: () => set({ token: null, userId: null, isNewUser: false }),
}))

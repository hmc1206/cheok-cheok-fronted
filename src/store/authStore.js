import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// AuthCallbackScreen이 구글 로그인 리다이렉트로 받은 token/isNewUser를 여기에 저장하고,
// 이후 apiClient의 요청 인터셉터가 token을 Authorization 헤더에 자동 첨부한다.
//
// persist 미들웨어로 localStorage에 자동 동기화한다: 새로고침/탭 재방문 시에도 로그인
// 상태가 풀리지 않아야 하므로. 별도로 localStorage.getItem/setItem을 여기저기서 직접
// 호출하지 않고 이 스토어 하나만 진실의 원천으로 둔다.
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      userId: null,
      isNewUser: false,

      setAuth: ({ token, userId, isNewUser }) => set({ token, userId, isNewUser }),
      clearAuth: () => set({ token: null, userId: null, isNewUser: false }),
    }),
    { name: 'chuckchuck-auth' },
  ),
)

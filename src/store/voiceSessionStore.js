import { create } from 'zustand'

// /voice/process 응답을 화면 간 이동 후에도 유지하기 위한 스토어.
// 백엔드가 Redis로 대화 세션(step/slots)을 들고 있어도, 프론트는 마지막 응답을
// 이 스토어에 반영해두어야 라우팅 이동 후의 화면이 바로 렌더링할 데이터를 가질 수 있다.
const initialState = {
  intent: null,
  step: null,
  screen: null,
  slots: {},
  data: null,
}

export const useVoiceSessionStore = create((set) => ({
  ...initialState,

  setSession: (partial) => set((state) => ({ ...state, ...partial })),
  resetSession: () => set({ ...initialState }),
}))

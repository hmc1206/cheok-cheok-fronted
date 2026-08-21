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
  quickReplies: null,
  // ttsText도 intent/step/data와 마찬가지로 스토어에 둔다 — useVoiceAssistant를
  // 화면마다 새로 호출하면(예: 홈 화면에서 보낸 요청 -> 다른 화면으로 라우팅) 그
  // 화면의 훅 인스턴스는 원래 응답을 직접 받은 적이 없어 로컬 ttsCaption이 빈
  // 채로 남는다 — 그래서 "ttsText를 화면에도 큰 글자로 표시"해야 하는 화면(날씨
  // 결과 화면 등)은 이 스토어 값을 읽어야 어느 화면에서 요청을 보냈든 항상 최신
  // 문구를 볼 수 있다.
  ttsText: null,
}

export const useVoiceSessionStore = create((set) => ({
  ...initialState,

  setSession: (partial) => set((state) => ({ ...state, ...partial })),
  resetSession: () => set({ ...initialState }),
}))

import { create } from 'zustand'

// 홈 화면에서 쌓이는 "도움 기록"(질문/답변)을 화면 간에 공유하기 위한 스토어.
// 원래는 HomeScreen.jsx의 로컬 state였고 SidePanel 드로어가 그 자리에서 바로
// 보여줬는데, 도움 기록 기능 자체를 설정 화면(SettingsScreen.jsx) 안으로
// 옮기면서 서로 다른 라우트(컴포넌트)끼리 같은 기록을 봐야 해 스토어로 뺐다.
export const useHistoryStore = create((set) => ({
  history: [],
  addEntry: (entry) => set((state) => ({ history: [...state.history, entry] })),
}))

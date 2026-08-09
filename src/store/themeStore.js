import { create } from 'zustand'

// 고대비 테마 on/off 상태만 들고 있는 자리. 실제 값 적용은 tokens.css +
// ThemeProvider(components/common/ThemeProvider.jsx)가 담당한다.
export const useThemeStore = create((set) => ({
  highContrast: false,
  toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
}))

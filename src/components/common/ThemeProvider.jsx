import { useEffect } from 'react'
import { useThemeStore } from '../../store/themeStore'

// themeStore.highContrast 값을 document root의 data-theme 속성으로 반영한다.
// 실제 색상값은 styles/tokens.css의 [data-theme='high-contrast'] 블록이 담당한다.
export function ThemeProvider({ children }) {
  const highContrast = useThemeStore((state) => state.highContrast)

  useEffect(() => {
    document.documentElement.dataset.theme = highContrast ? 'high-contrast' : 'default'
  }, [highContrast])

  return children
}

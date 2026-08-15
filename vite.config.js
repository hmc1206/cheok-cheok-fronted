import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 브랜드/화면 상태 판별처럼 UI와 분리된 순수 함수를 검증하기 위해 vitest 설정을 추가했다.
  // React 컴포넌트를 렌더링하지 않는 순수 로직 테스트만 돌리므로 jsdom 등은 필요 없다
  // (환경은 node로 충분 - 불필요한 의존성을 더 늘리지 않기 위해 최소 설정만 둔다).
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})

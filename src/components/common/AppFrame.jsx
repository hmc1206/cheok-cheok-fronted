import { useEffect, useState } from 'react'

// iPhone 16 Pro의 CSS px 기준 크기. 웹이 아니라 "앱"처럼 보이게 하기 위해 화면
// 크기와 무관하게 이 비율의 컨테이너를 화면 중앙에 고정한다.
const APP_WIDTH = 393
const APP_HEIGHT = 852

/**
 * 앱처럼 보이도록 393x852 크기의 컨테이너를 화면 중앙에 고정 배치하고,
 * 남는 바깥 영역은 검정으로 채우는 래퍼. 내부 콘텐츠는 이 컨테이너 크기에
 * 맞춰 고정 px 레이아웃으로 짤 수 있다(반응형으로 늘어나지 않음).
 *
 * 브라우저 창(또는 실제 모바일 화면)이 393x852보다 작으면, 레이아웃이 잘리거나
 * 스크롤이 생기는 대신 비율을 유지한 채 scale transform으로 축소한다 — 항상
 * 디자인 그대로의 비율을 유지하는 게 실기기 대응에 더 자연스럽기 때문이다
 * (사용자 확인: 작은 화면에서는 "비율 유지 축소" 방식으로 결정).
 */
export function AppFrame({ children }) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      const widthScale = window.innerWidth / APP_WIDTH
      const heightScale = window.innerHeight / APP_HEIGHT
      // 가로/세로 중 더 빡빡한 쪽(더 작은 비율)에 맞춰야 어느 쪽으로도 화면을
      // 벗어나지 않는다. 화면이 393x852보다 크더라도 1을 넘겨 확대하지는 않는다
      // (요구사항: "반응형으로 늘어나지 않고 고정 크기를 유지").
      setScale(Math.min(widthScale, heightScale, 1))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: APP_WIDTH,
          height: APP_HEIGHT,
          flexShrink: 0,
          transform: `scale(${scale})`,
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

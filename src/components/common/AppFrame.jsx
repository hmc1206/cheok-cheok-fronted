import { useEffect, useRef, useState } from 'react'

// iPhone 16 Pro의 CSS px 기준 크기. 웹이 아니라 "앱"처럼 보이게 하기 위해 화면
// 크기와 무관하게 이 비율의 컨테이너를 화면 중앙에 고정한다.
const APP_WIDTH = 393
const APP_HEIGHT = 852
// 실제 기기 베젤 느낌을 내기 위한 모서리 둥글기 (사용자 확인: 48px).
const APP_BORDER_RADIUS = 48
// 컨테이너가 화면에 너무 꽉 차 보인다는 피드백으로 92%까지만 키우도록 상한을 낮췄다
// (사용자 확인: 92% = 363x784). 내부 화면들은 여전히 393x852 논리 좌표계로 짜여
// 있고, 이 컨테이너 전체를 transform: scale로 축소하는 방식이라 폰트/버튼 등 내부
// 요소도 이 배율만큼 함께 작아진다 — 화면별로 크기를 따로 조정할 필요가 없다.
const DISPLAY_SCALE = 0.92

/**
 * 모든 화면 공통: 393x852 크기의 컨테이너를 화면 중앙에 고정 배치하고, 모서리를
 * 둥글게 처리해 실제 기기 느낌을 낸다. 남는 바깥 영역은 검정으로 채운다.
 * 내부 콘텐츠는 이 컨테이너 크기에 맞춰 고정 px 레이아웃으로 짤 수 있다
 * (반응형으로 늘어나지 않음). flex 중앙 정렬 덕분에 뷰포트가 852px보다 크면
 * 위아래로도 자연스럽게 검정 여백이 생겨 화면에 꽉 차 붙지 않는다.
 *
 * 브라우저 창(또는 실제 모바일 화면)이 DISPLAY_SCALE 기준 크기보다 작으면, 레이아웃이
 * 잘리거나 스크롤이 생기는 대신 비율을 유지한 채 더 작게 scale transform한다 — 항상
 * 디자인 그대로의 비율을 유지하는 게 실기기 대응에 더 자연스럽기 때문이다
 * (사용자 확인: 작은 화면에서는 "비율 유지 축소" 방식으로 결정).
 *
 * 버그 수정 1: window.innerWidth/innerHeight + window 'resize' 이벤트 대신
 * ResizeObserver로 바깥 wrapper 엘리먼트 자체의 실제 렌더링 크기를 직접 관찰한다 —
 * 모바일 브라우저는 주소창이 접히고 펼쳐질 때 실제 뷰포트 높이가 바뀌어도 window
 * 'resize'가 안정적으로 안 뜨는 경우가 있어서다.
 *
 * 버그 수정 2(더 근본적인 원인): 안쪽 프레임을 flexbox(align-items/justify-content:
 * center)로 가운데 정렬하면서 동시에 transform: scale()로 축소하면, 뷰포트 높이가
 * 852px(APP_HEIGHT)보다 많이 작아서 heightScale이 widthScale/DISPLAY_SCALE보다
 * 작아지는 경우(좁고 짧은 모바일 화면 등) 위쪽이 통째로 잘려 보이는 문제가 있었다.
 * 원인은 CSS transform이 화면에 그려지는 모습만 바꿀 뿐 flexbox가 계산하는 레이아웃
 * 크기에는 영향을 주지 않는다는 점 — flexbox는 축소되기 전 852px 기준으로 "가운데"를
 * 계산해버려서, 뷰포트보다 훨씬 큰 박스를 억지로 가운데 두려다 위쪽으로 크게
 * 밀려나고, 그 상태에서 scale이 적용되니 실제로 보이는 프레임은 화면 위로 잘려
 * 나간다. 그래서 flexbox 중앙정렬을 쓰지 않고, position: absolute + top/left: 50% +
 * transform: translate(-50%, -50%) scale(...) 조합으로 바꿨다 — translate(-50%,-50%)가
 * "축소되기 전 크기의 절반"만큼 되돌려서 먼저 정확히 중앙에 위치시키고, 그 다음
 * scale이 같은 transform 안에서 그 중앙 지점을 기준으로 축소되기 때문에 뷰포트
 * 크기와 무관하게 항상 정확히 가운데 유지된다.
 */
export function AppFrame({ children }) {
  const outerRef = useRef(null)
  const [scale, setScale] = useState(DISPLAY_SCALE)

  useEffect(() => {
    const outerEl = outerRef.current
    if (!outerEl) return

    const updateScale = () => {
      const { width, height } = outerEl.getBoundingClientRect()
      const widthScale = width / APP_WIDTH
      const heightScale = height / APP_HEIGHT
      // 가로/세로 중 더 빡빡한 쪽(더 작은 비율)에 맞춰야 어느 쪽으로도 화면을
      // 벗어나지 않는다. 화면이 아무리 커도 DISPLAY_SCALE(92%)을 넘겨 확대하지는
      // 않는다 — "꽉 차 보이지 않게 여유를 준다"는 요구사항 그대로.
      setScale(Math.min(widthScale, heightScale, DISPLAY_SCALE))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(outerEl)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={outerRef}
      style={{
        width: '100vw',
        height: '100dvh',
        background: '#000000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* flexbox 중앙정렬 대신 absolute + top/left:50% + translate(-50%,-50%)로
          바꾼 이유는 위 주석의 "버그 수정 2" 참고. */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: APP_WIDTH,
          height: APP_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          background: 'var(--color-bg)',
          borderRadius: APP_BORDER_RADIUS,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

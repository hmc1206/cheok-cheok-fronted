import { useEffect, useRef, useState } from 'react'

/** Design reminder — one fixed 375 × 812 device canvas. Desktop never widens the app. */

// 앱 프레임의 논리적(디자인 기준) 크기. 화면 안 모든 요소(텍스트, 버튼, 카드 등)는
// 이 375x812 좌표계를 기준으로 고정 px로 짜여 있다 — 뷰포트가 이보다 작아지면
// 이 값 자체를 바꾸는 게 아니라, 박스 전체를 축소(scale)해서 담는다.
const APP_WIDTH = 375
const APP_HEIGHT = 812

/**
 * 원인 점검(이번 수정 전 상태): 기존 AppFrame은 바깥 컨테이너를 flexbox로 가운데
 * 정렬하고, 안쪽 박스는 `w-[375px] h-[812px] max-w-full max-h-dvh`로만 잡혀
 * 있었다 — 즉 "뷰포트가 작아지면 폭/높이 각각 뷰포트 크기까지만 줄어든다"는
 * 뜻이라, **가로세로 비율을 유지하는 축소 로직이 아예 없었다**. 그 결과 두 가지
 * 문제가 실제로 재현됐다:
 *  1) 가로/세로가 서로 다른 비율로 줄어들면서 내용물이 찌그러져 보임(예: 500x500
 *     뷰포트에서는 폭 375 x 높이 500으로 눌린 박스가 됨 — 원래 375x812 비율이
 *     아님).
 *  2) `max-w-full`은 부모(.control-stage)의 100%까지 허용하는데, 부모 자체가
 *     뷰포트 폭과 정확히 같지 않게 계산되는 경우(예: 300x600 뷰포트에서 실제
 *     렌더된 박스 폭이 320px로 뷰포트보다 커짐) 실제로 뷰포트 밖으로 잘려
 *     보이는 현상까지 있었다.
 *
 * 수정 방식: 바깥 wrapper의 실제 렌더 크기를 ResizeObserver로 관찰해서, 그
 * 크기 안에 375x812 비율을 그대로 유지한 채 들어갈 수 있는 최대 배율(scale)을
 * JS로 계산하고, `transform: scale()`로 박스 전체를 축소한다 — 내부 요소는
 * 전부 이 하나의 transform에 함께 축소되므로 별도 조정이 필요 없다(요청사항:
 * "내부 요소 비율/정렬이 깨지지 않아야 함"이 transform: scale()의 기본 특성으로
 * 자동 충족됨). `position: absolute + top/left: 50% + translate(-50%,-50%)`로
 * 중앙 고정 후 같은 transform 안에서 scale하는 이유: flexbox로 가운데 정렬하면서
 * 동시에 scale하면, 축소되기 "전" 크기 기준으로 가운데 정렬이 계산돼 버려 뷰포트가
 * 아주 작을 때 위쪽이 잘리는 별도 버그가 생긴다(과거 실제로 겪었던 문제) —
 * translate(-50%,-50%)는 축소 전 크기의 절반만큼 되돌려 먼저 정확히 중앙에
 * 위치시키고, 그다음 같은 transform 안에서 scale이 그 중앙 지점을 기준으로
 * 적용되기 때문에 뷰포트 크기와 무관하게 항상 정확히 중앙 유지된다.
 *
 * 최소 배율 하한: 사용자 확인 — 하한 없이 항상 뷰포트에 꽉 맞춰 축소한다("절대
 * 잘리지 않게"가 우선 요구사항이라, 너무 작아지면 글씨가 작아지는 쪽을 택함).
 * 반대로 뷰포트가 375x812보다 커지는 경우엔 1배(원본 크기)를 넘겨 확대하지
 * 않는다 — "Desktop never widens the app" 원칙 그대로 유지.
 */
export function AppFrame({ children }) {
  const outerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const outerEl = outerRef.current
    if (!outerEl) return

    const updateScale = () => {
      const { width, height } = outerEl.getBoundingClientRect()
      const widthScale = width / APP_WIDTH
      const heightScale = height / APP_HEIGHT
      // 가로/세로 중 더 빡빡한(작은) 비율에 맞춰야 어느 쪽으로도 뷰포트를
      // 벗어나지 않는다. 1을 넘기지 않게 캡을 걸어 원본 크기 이상으로는
      // 확대되지 않게 한다.
      setScale(Math.min(widthScale, heightScale, 1))
    }

    updateScale()
    // window.innerWidth/resize 대신 ResizeObserver를 쓰는 이유: 모바일
    // 브라우저는 주소창이 접히고 펼쳐질 때 실제 뷰포트 높이가 바뀌어도 window
    // 'resize' 이벤트가 안정적으로 안 뜨는 경우가 있다 — wrapper 엘리먼트
    // 자체의 렌더링 크기를 직접 관찰하면 그런 경우도 놓치지 않는다.
    const observer = new ResizeObserver(updateScale)
    observer.observe(outerEl)
    return () => observer.disconnect()
  }, [])

  return (
    // 배경색은 예전과 마찬가지로 className(.control-stage/.control-shell, index.css)에
    // 맡긴다 — 이 프로젝트는 Tailwind 유틸리티보다 일반 CSS 클래스 규칙이 캐스케이드
    // 우선순위가 높아서(레이어 없이 쌓인 plain CSS), 배경은 그대로 CSS 클래스가
    // 정하게 두고 여기서는 위치/크기 관련 인라인 스타일만 새로 추가한다 — 인라인
    // style로 배경까지 같이 지정하면 클래스 규칙을 덮어써서 색이 바뀌어버린다.
    <div
      ref={outerRef}
      className="control-stage"
      style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden' }}
    >
      {/* text-[var(--cb-navy)]는 원래 이 엘리먼트에 있던 유일한 텍스트 색 지정이라
          (.control-shell CSS 클래스는 배경/그림자만 정하고 color는 안 건드림)
          그대로 남겨뒀다 — 안 그러면 화면 전체 기본 글자색이 빠진다. */}
      <div
        className="control-shell text-[var(--cb-navy)]"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: APP_WIDTH,
          height: APP_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

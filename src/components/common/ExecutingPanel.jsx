import { useEffect, useState } from 'react'

// 점(.) 하나가 늘어나는 간격(ms). 길찾기 화면에서 사용자 확인을 거쳐 500ms로
// 확정했고, 영상 도움 화면도 "길찾기와 동일한 패턴 재사용"으로 확인받아 같은
// 값을 그대로 쓴다 — 두 화면이 각자 상수를 따로 두면 나중에 하나만 고치고
// 다른 하나를 깜빡할 수 있어 여기 한 곳에만 정의한다.
const LOADING_DOT_INTERVAL_MS = 500

// 길찾기(MapRouteScreen.jsx)의 "실행하는 중..." 점 반복 애니메이션을 영상
// 도움(YoutubePlayerScreen.jsx)에도 그대로 써야 해서(요청사항: "로딩 애니메이션
// 컴포넌트는 새로 만들지 말고 공통 컴포넌트로 재사용") 공용 컴포넌트로 뺐다.
// label만 다르게 받아 두 화면이 서로 다른 문구("실행하는 중"/"검색하는 중"/
// "유튜브를 여는 중" 등)를 쓸 수 있게 하고, 애니메이션 로직/타이밍은 완전히
// 동일하게 유지된다.
export function ExecutingPanel({ label, description }) {
  const [dotCount, setDotCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((previous) => (previous + 1) % 4) // 0 -> 1 -> 2 -> 3 -> 0 반복
    }, LOADING_DOT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5">
      {/* 점 개수만큼 너비가 바뀌어도 글자가 화면 안에서 좌우로 흔들리지 않도록,
          점 3개 폭을 항상 확보해두는 뒤쪽 placeholder 텍스트 위에 실제 텍스트를
          겹쳐 그린다. */}
      <p className="relative max-w-full text-center text-[24px] font-extrabold tracking-[-0.04em]">
        <span className="invisible" aria-hidden="true">
          {label}...
        </span>
        <span className="absolute left-0 top-0 w-full">
          {label}
          {'.'.repeat(dotCount)}
        </span>
      </p>
      {description ? (
        <p className="mt-4 max-w-full text-center text-[15px] font-medium leading-6 text-[var(--cb-slate)]">
          {description}
        </p>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'

// 스플래시가 보인 뒤 로그인 화면으로 자동 전환되기까지의 대기 시간(ms).
// 사용자 확인: "2초 후, 부드럽게 페이드".
const SPLASH_DURATION_MS = 2000

// index.css의 .splash-fade-out transition-duration(300ms)과 반드시 같은
// 값이어야 한다 — 페이드 트랜지션이 실제로 끝나는 시점에 맞춰 라우팅해야
// 화면이 끊겨 보이지 않는다.
const FADE_DURATION_MS = 300

// 앱 최초 진입("/") 화면. 로그인 화면(LoginPage)보다 먼저 노출되며, "척척"
// 타이틀이 아래에서 위로 슬라이드업된 뒤 일정 시간 후 자동으로 /login으로
// 전환된다. 순수 화면 전환/타이밍 로직이라 API 호출이 전혀 없어 API
// 명세서와는 무관하다.
//
// 노출 빈도: 처음엔 "같은 브라우저 탭에서 최초 1회"만 보이도록 sessionStorage로
// 막아뒀었는데, 실사용/테스트해보니 같은 탭에서 계속 새로고침하며 화면을
// 확인하는 흐름과 맞지 않아 혼란만 줬다(스플래시가 왜 안 뜨는지 헷갈림).
// 그래서 네이티브 앱처럼 "매번 앱을 열 때마다" 보이는 방식으로 바꿨다(사용자
// 확인) — /"에 진입할 때마다 항상 재생된다.
export function SplashScreen() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // 대기 시간이 끝나면 페이드아웃을 시작하고, 그 트랜지션(FADE_DURATION_MS)이
    // 끝나는 시점에 맞춰 로그인 화면으로 이동한다 — 페이드가 채 끝나기 전에
    // 화면이 바뀌면 전환이 끊겨 보이므로 두 타이머를 순서대로 건다. replace:
    // true로 이동해 브라우저 히스토리에 스플래시가 남지 않게 한다 — 로그인
    // 화면에서 뒤로가기를 눌러도 스플래시로 돌아가지 않아야 하기 때문.
    const fadeTimer = setTimeout(() => setIsFadingOut(true), SPLASH_DURATION_MS)
    const navigateTimer = setTimeout(
      () => navigate('/login', { replace: true }),
      SPLASH_DURATION_MS + FADE_DURATION_MS,
    )

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(navigateTimer)
    }
  }, [navigate])

  return (
    <AppFrame>
      <main
        className={`flex h-full flex-col items-center justify-center bg-white ${isFadingOut ? 'splash-fade-out' : ''}`}
      >
        <h1
          className="splash-title text-[44px] font-extrabold tracking-[-0.04em] text-[var(--cb-navy)]"
          style={{ animation: 'splash-title-rise 560ms ease-out both' }}
        >
          척척
        </h1>
      </main>
    </AppFrame>
  )
}

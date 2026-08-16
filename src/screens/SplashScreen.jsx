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

// 같은 브라우저 탭 안에서는 스플래시를 다시 보여주지 않기 위한 sessionStorage
// 키. 사용자 확인: "같은 브라우저 탭에서 최초 1회" — 네이티브 앱과 달리 웹은
// "설치 후 최초 1회"라는 개념이 없어, 탭 생명주기와 함께 사라지는
// sessionStorage로 범위를 좁혔다(localStorage였다면 브라우저를 껐다 켜도
// 다시 안 보이는 "이 기기에서 평생 1회"가 됐을 것 — 그건 사용자가 고른
// 옵션이 아니다).
const SPLASH_SEEN_KEY = 'chuckchuck:splashSeen'

// 앱 최초 진입("/") 화면. 로그인 화면(LoginPage)보다 먼저 노출되며, "척척"
// 타이틀이 아래에서 위로 슬라이드업된 뒤 일정 시간 후 자동으로 /login으로
// 전환된다. 순수 화면 전환/타이밍 로직이라 API 호출이 전혀 없어 API
// 명세서와는 무관하다.
export function SplashScreen() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // 이미 이 탭에서 스플래시를 본 적 있으면 애니메이션 없이 바로 로그인
    // 화면으로 넘어간다. replace: true로 이동해 브라우저 히스토리에 스플래시가
    // 남지 않게 한다 — 로그인 화면에서 뒤로가기를 눌러도 스플래시로 돌아가지
    // 않아야 하기 때문.
    if (sessionStorage.getItem(SPLASH_SEEN_KEY)) {
      navigate('/login', { replace: true })
      return
    }

    // 버그 수정: sessionStorage 기록을 이펙트 본문에서 바로(동기적으로) 하면
    // 개발 모드 React.StrictMode가 마운트를 일부러 두 번 실행할 때(마운트 →
    // 클린업 → 재마운트) 첫 번째 실행이 즉시 플래그를 남기고, 클린업으로
    // 타이머가 취소되기도 전에 두 번째 실행이 그 플래그를 보고 "이미 봤음"으로
    // 오판해 스플래시를 건너뛰고 곧장 로그인으로 넘어가 버리는 문제가 있었다
    // (실기기 프로덕션 빌드에선 StrictMode 이중 실행이 없어 안 보이지만, 로컬
    // 개발 서버에서는 매번 재현됨). 그래서 플래그 기록을 "실제로 페이드아웃이
    // 시작되는 시점"(= 타이머가 끝까지 살아남아 정말 발동한 시점)으로 미뤘다 —
    // StrictMode가 첫 실행의 타이머를 클린업으로 취소해버리면 플래그가 아예
    // 안 남으므로, 실제로 화면을 처음부터 끝까지 보여준 마지막 실행만 플래그를
    // 남기게 된다.
    const fadeTimer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_SEEN_KEY, 'true')
      setIsFadingOut(true)
    }, SPLASH_DURATION_MS)
    // 대기 시간이 끝나고 페이드아웃 트랜지션(FADE_DURATION_MS)까지 끝나는
    // 시점에 맞춰 로그인 화면으로 이동한다 — 페이드가 채 끝나기 전에 화면이
    // 바뀌면 전환이 끊겨 보이므로 두 타이머를 순서대로 건다.
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

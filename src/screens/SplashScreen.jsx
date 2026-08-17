import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'

// 스플래시가 보인 뒤 로그인 화면으로 자동 전환되기까지의 대기 시간(ms).
// 사용자 확인: "2초 후, 부드럽게 페이드". 리디자인(서브 문구 추가) 때도 이
// 총 노출 시간(대기 2000ms + 페이드 300ms = 2.3초)을 그대로 유지하기로
// 다시 확인받았다 — 서브 문구가 늦게 등장해도(아래 SUBTITLE_DELAY_MS) 다 읽을
// 시간은 충분하다고 판단.
const SPLASH_DURATION_MS = 2000

// index.css의 .splash-fade-out transition-duration(300ms)과 반드시 같은
// 값이어야 한다 — 페이드 트랜지션이 실제로 끝나는 시점에 맞춰 라우팅해야
// 화면이 끊겨 보이지 않는다.
const FADE_DURATION_MS = 300

// "척척" 타이틀 슬라이드업 애니메이션(index.css의 splash-title-rise, 560ms)이
// 끝나갈 즈음 서브 문구가 자연스럽게 이어서 나타나도록 살짝 겹치는 시점(450ms)
// 에 시작한다 — 완전히 끝난 뒤(560ms) 시작하면 두 모션 사이에 정지 구간이
// 생겨 뚝뚝 끊겨 보인다(사용자 확인: 타이밍은 이 값으로 제안 후 승인받음).
const SUBTITLE_DELAY_MS = 450

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
//
// 리디자인(요청사항): (1) "무엇이든 척척 알려드립니다" 서브 문구 추가(홈
// 화면의 진입 모션 패턴 — opacity/y 페이드업, framer-motion — 을 그대로
// 재사용), (2) 은은한 파란 글로우 배경 포인트 추가(사용자 확인 — 마이크/
// 음파 같은 구체적 장식 아이콘은 넣지 않기로 함, "과한 장식 없이 정돈된
// 느낌" 유지). 타이틀/서브 문구 색상은 처음엔 "척척"을 브랜드 파란색(--cb-
// tomato)으로 바꿨었는데, 사용자 재요청으로 "척척"은 검정(--cb-navy) 그대로
// 두고 서브 문구를 파란색으로 옮겼다(아래 렌더링부 참고) — 브랜드 파란색
// 자체는 여전히 화면에 남아있다.
export function SplashScreen() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const reducedMotion = useReducedMotion()

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
        className={`relative flex h-full flex-col items-center justify-center overflow-hidden bg-white ${isFadingOut ? 'splash-fade-out' : ''}`}
      >
        {/* 장식용 글로우 — 콘텐츠가 아니라 aria-hidden 처리, 스크린리더는
            "척척"/서브 문구만 순서대로 읽는다. */}
        <div className="splash-glow" aria-hidden="true" />

        {/* 사용자 확인(재조정 2회차): 타이틀/서브 문구 둘 다 --cb-navy(검정에
            가까운 다크 네이비)로 통일했다 — 브랜드 파란색은 이제 텍스트가
            아니라 뒤의 은은한 글로우로만 남아있다. 색이 같아진 대신 굵기
            (extrabold 800 vs medium 500)와 크기(44px vs 15px) 차이로 위계를
            구분한다. */}
        <h1
          className="splash-title relative text-[44px] font-extrabold tracking-[-0.04em] text-[var(--cb-navy)]"
          style={{ animation: 'splash-title-rise 560ms ease-out both' }}
        >
          척척
        </h1>
        <motion.p
          className="relative mt-2 text-[15px] font-medium tracking-[-0.02em] text-[var(--cb-navy)]"
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: SUBTITLE_DELAY_MS / 1000 }}
        >
          무엇이든 척척 알려드립니다
        </motion.p>
      </main>
    </AppFrame>
  )
}

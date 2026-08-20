import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'

// ── 애니메이션 단계 및 지속시간 (요청사항: "채우기 -> 채우기 완료 -> 헤더로
// 이동"이 뒤섞이거나 겹치지 않는, 명확히 구분된 두 단계로 구현) ─────────────
// 각 상수는 정확히 "다음 단계로 넘어가는 시점"을 의미한다 — 아래 useEffect가
// 이 상수들을 그대로 setTimeout 지연시간으로 써서 단계를 순서대로만 진행시키고
// 절대 겹치지 않게 한다. 구체적인 값 자체는 명세서에 없어(순수 화면 전환
// 연출이라 API와 무관) 이전 스플래시 라운드들과 동일한 방식 — 우선 합리적인
// 값으로 구현하고, 이후 "더 빠르게/느리게" 같은 피드백을 받으면 바로 조정한다.

// 1단계: "척척" 텍스트가 흐린 상태에서 아래 -> 위로(요청사항: 방향을
// 왼쪽->오른쪽에서 아래->위로 변경) 물결 경계선과 함께 채워지는 데 걸리는
// 시간. 이 구간 동안은 텍스트 위치/크기가 전혀 바뀌지 않는다(요청사항: "이
// 단계에서는... 위치나 크기 이동은 일어나지 않는다"). 실제 채우기/물결
// 애니메이션은 index.css의 .splash-title-fill::after가 담당하며, 그 CSS
// 애니메이션 duration도 이 상수와 반드시 같은 값(1100ms)으로 맞춰뒀다.
const FILL_DURATION_MS = 1100
// 채우기가 "완료된 뒤에만"(요청사항) 서브 문구가 페이드인되기 시작한다 — 이
// 값은 그 페이드인 트랜지션 자체의 길이. FILL_DURATION_MS가 다 끝난 시점에
// 시작하므로 채우기 애니메이션과 절대 겹치지 않는다.
const SUBTITLE_FADE_IN_MS = 300
// 서브 문구가 다 보인 뒤, 2단계(헤더로 이동)로 넘어가기 전 잠깐 멈추는
// 시간 — 흐름도(요청사항 3)에 명시된 "(짧은 대기)" 구간. 사용자가 문구를
// 읽을 시간을 준다.
const PAUSE_BEFORE_MORPH_MS = 450
// 2단계: 화면 중앙의 큰 텍스트가 로그인 화면 헤더 자리(크기/위치)로 이동하는
// 데 걸리는 시간 — 서브 문구/글로우도 이 시간 동안 함께 페이드아웃된다
// (요청사항: "서브 문구와 배경 요소는 자연스럽게 페이드아웃"). 이 값은
// motion.h1의 layout transition과 아래 opacity transition 양쪽에 그대로
// 쓰여서 이동/페이드아웃이 정확히 같은 타이밍에 끝난다.
const MORPH_DURATION_MS = 550
// 총 노출 시간(참고용): 1100 + 300 + 450 + 550 = 2400ms — 이전 스플래시
// (약 2.3초)와 비슷한 수준으로 맞춰졌다.

// 로그인 화면(LoginPage.jsx) 헤더의 실제 좌표. "척척" 텍스트가 2단계에서
// 정확히 이 자리로 이동해야 한다(요청사항: "실제 좌표는... 다음 화면 헤더에서
// 실제로 위치하는 곳에 맞춰 정확히 일치시킬 것"). LoginPage.jsx를 다시 확인한
// 결과:
//   <main className="... px-6 ... pt-6"><header className="flex items-center
//   gap-2"><BrandWordmark className="text-[19px] font-bold tracking-[-0.05em]
//   text-[#111]" /></header>
// 로고는 화면 "중앙"이 아니라 좌측 상단(px-6=24px, pt-6=24px)에 있고, header
// 자체엔 별도 여백이 없어 그 지점에 텍스트가 바로 붙는다 — 그래서 이동 목표
// 좌표는 (top: 24px, left: 24px), 최종 스타일은 text-[19px]/font-bold/
// tracking-[-0.05em]/#111로 LoginPage.jsx의 값과 완전히 동일하게 맞춘다.
//
// 참고로 받은 CSS(position: fixed; left: 50%; transform: translateX(-50%))는
// 그대로 쓰지 않았다 — 두 가지 이유:
//   1) 이 앱은 AppFrame(components/common/AppFrame.jsx)이 375×812 폰 프레임을
//      데스크톱 화면 "중앙에 띄우는" 구조다. 진짜 position: fixed를 쓰면
//      뷰포트 전체 기준으로 좌표가 계산돼, 폰 프레임 폭보다 넓은 화면에서는
//      로고가 프레임 밖(진짜 화면 정중앙)으로 튀어버린다. 그래서 이 화면의
//      main(아래에서 position: relative)을 기준으로 하는 position: absolute를
//      대신 쓴다 — 프레임 안에서만 좌표가 계산되도록.
//   2) 참고 CSS는 가운데 정렬이지만 실제 로그인 헤더는 좌측 정렬이라, 위에서
//      확인한 실제 좌표(top/left: 24px)를 그대로 쓴다.
const HEADER_LOGO_TOP_PX = 24
const HEADER_LOGO_LEFT_PX = 24

// 로그인 헤더와 완전히 동일한 최종 스타일 — LoginPage.jsx의 BrandWordmark
// className과 반드시 같은 값으로 유지해야 2단계가 끝나는 순간 화면이 바뀌어도
// (스플래시 -> /login 라우팅) 로고가 튀어 보이지 않는다.
const HEADER_LOGO_CLASSNAME = 'text-[19px] font-bold tracking-[-0.05em] text-[#111]'

// 앱 최초 진입("/") 화면. 로그인 화면(LoginPage)보다 먼저 노출되며, 순수 화면
// 전환/타이밍 로직이라 API 호출이 전혀 없어 API 명세서와는 무관하다.
//
// 노출 빈도: 네이티브 앱처럼 "매번 앱을 열 때마다" 보인다(사용자 확인) —
// "/"에 진입할 때마다 항상 재생된다.
//
// 요청사항(애니메이션 순서 정정): 이전엔 슬라이드업 한 번으로 끝나고 화면
// 전체가 페이드아웃되며 /login으로 넘어갔는데, 이번엔 "텍스트 채우기 완료 ->
// 완성된 텍스트가 고정 헤더 로고 자리로 이동" 순서로 명확히 두 단계로 나눠야
// 한다. 그래서 로컬 상태를 boolean 하나(isFadingOut)가 아니라 3단계
// phase('fill' | 'subtitle' | 'morph')로 바꿨다 — 각 단계가 렌더링(텍스트
// 스타일/서브 문구 노출 여부)과 다음 단계로 넘어가는 트리거(useEffect의
// setTimeout 체인) 양쪽을 함께 결정한다.
export function SplashScreen() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('fill')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    // prefers-reduced-motion: 채우기/이동 모션 자체는 생략하지만(아래 렌더링부의
        // animation: 'none', layout={false} 참고), "채우기 -> 서브 문구 -> 이동"이라는
    // 단계 순서 자체와 총 노출 시간은 동일하게 유지한다 — 갑자기 화면이
    // 통째로 바뀌어 보이지 않도록.
    const subtitleDelay = reducedMotion ? 0 : FILL_DURATION_MS
    const morphDelay = subtitleDelay + SUBTITLE_FADE_IN_MS + PAUSE_BEFORE_MORPH_MS
    const navigateDelay = morphDelay + MORPH_DURATION_MS

    // 1단계(채우기)가 완전히 끝나야만 2단계(서브 문구 -> 이동)로 넘어간다 —
    // 두 단계가 겹치지 않도록 각 setTimeout을 이전 단계가 끝나는 시점에 맞춰
    // 순서대로 건다(요청사항: "채워지는 도중에 위치 이동이 같이 일어나는 것
    // 금지"). replace: true로 이동해 브라우저 히스토리에 스플래시가 남지
    // 않게 한다 — 로그인 화면에서 뒤로가기를 눌러도 스플래시로 돌아가지
    // 않아야 하기 때문.
    const subtitleTimer = setTimeout(() => setPhase('subtitle'), subtitleDelay)
    const morphTimer = setTimeout(() => setPhase('morph'), morphDelay)
    const navigateTimer = setTimeout(() => navigate('/login', { replace: true }), navigateDelay)

    return () => {
      clearTimeout(subtitleTimer)
      clearTimeout(morphTimer)
      clearTimeout(navigateTimer)
    }
  }, [navigate, reducedMotion])

  const isMorphing = phase === 'morph'

  return (
    <AppFrame>
      {/* main을 position: relative로 유지해야, 2단계에서 h1에 쓰는 position:
          absolute(top/left: 24px)가 브라우저 뷰포트가 아니라 이 폰 프레임
          안쪽 기준으로 계산된다(위 HEADER_LOGO_* 주석의 이유 1 참고). */}
      <main className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-white">
        {/* 장식용 글로우 — 콘텐츠가 아니라 aria-hidden 처리, 스크린리더는
            "척척"/서브 문구만 순서대로 읽는다. 2단계(morph)에서 서브 문구와
            함께 페이드아웃된다(요청사항: "서브 문구와 배경 요소는 자연스럽게
            페이드아웃") — MORPH_DURATION_MS와 같은 시간으로 트랜지션해 로고
            이동과 정확히 같은 타이밍에 끝난다. */}
        <div
          className="splash-glow"
          aria-hidden="true"
          style={{
            opacity: isMorphing ? 0 : 1,
            transition: reducedMotion ? 'none' : `opacity ${MORPH_DURATION_MS}ms ease-out`,
          }}
        />

        {/* "척척" — 1단계에선 화면 중앙에 큰 글씨로 흐린 상태에서 물결
            경계선과 함께 아래->위로 채워지고, 2단계에선 채워진 그대로
            로그인 헤더 자리(작은 크기/좌측 상단)로 이동한다. 같은 h1
            인스턴스를 그대로 두고 className/style만 바꾸는 이유:
            framer-motion의 layout 애니메이션이 "같은 엘리먼트가 렌더링
            사이에 크기/위치가 바뀌면" 그 변화를 자동으로 부드러운
            transform으로 보간해주기 때문 — 별도의 좌표 계산 없이 진짜
            "모핑"처럼 보인다.
            data-text: index.css의 .splash-title-fill::after가
            content: attr(data-text)로 이 값을 그대로 복제해 물결 마스크를
            씌운 "채워진" 레이어를 만든다(h1 자신은 흐린 밑바탕 역할) —
            모핑 단계에선 이 클래스 자체를 안 쓰므로 무시된다.
            채우기/물결 애니메이션 자체는 전부 index.css의 CSS 애니메이션이
            담당해서 여기선 별도 인라인 style이 필요 없다 — prefers-
            reduced-motion 환경은 index.css 상단의 전역 규칙
            (animation-duration: 0.01ms !important)이 ::after의 애니메이션
            에도 그대로 적용돼 자동으로 순식간에 "채워진 뒤" 상태로
            건너뛴다(별도 처리 불필요). */}
        <motion.h1
          layout={!reducedMotion}
          transition={reducedMotion ? { duration: 0 } : { duration: MORPH_DURATION_MS / 1000, ease: 'easeInOut' }}
          data-text="척척"
          className={
            isMorphing
              ? `splash-title absolute font-bold ${HEADER_LOGO_CLASSNAME}`
              : 'splash-title splash-title-fill relative text-[44px] font-black tracking-[-0.04em]'
          }
          style={isMorphing ? { top: HEADER_LOGO_TOP_PX, left: HEADER_LOGO_LEFT_PX } : undefined}
        >
          척척
        </motion.h1>

        {/* 서브 문구 — 1단계(fill) 동안은 아예 렌더링하지 않는다(요청사항:
            "채우기가 완료되면... 페이드인된다" — 채우기 도중엔 존재 자체가
            없어야 순서가 뒤섞이지 않는다). phase가 'subtitle'로 바뀌는 순간
            새로 마운트되며 initial->animate로 페이드인되고, 'morph' 단계에서
            글로우와 함께 페이드아웃된다. */}
        {phase !== 'fill' && (
          <motion.p
            className="relative mt-2 text-[15px] font-medium tracking-[-0.02em] text-[var(--cb-navy)]"
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: isMorphing ? 0 : 1, y: 0 }}
            transition={{
              duration: (isMorphing ? MORPH_DURATION_MS : SUBTITLE_FADE_IN_MS) / 1000,
            }}
          >
            무엇이든 척척 알려드립니다
          </motion.p>
        )}
      </main>
    </AppFrame>
  )
}

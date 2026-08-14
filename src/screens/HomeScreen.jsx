import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usageApi } from '../api/usageApi'
import { AppFrame } from '../components/common/AppFrame'
import { IconChipButton } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { SidePanel } from '../components/home/SidePanel'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

// 로그인 이후 진입하는 메인 화면 (기획서 4-1장).
// 디자인 개편(feature/fe-redesign): 반투명 유리(glassmorphism) 버튼 시스템을
// 걷어내고, 브리프의 flat 디자인(단일 accent 컬러, 카드 외엔 그림자 없음)으로
// 다시 짰다. 기존 기능(햄버거 메뉴, 음성 비서, 3개 바로가기)은 하나도 빼지 않고
// 그대로 유지 — 레이아웃/톤만 바뀐다.
//
// 후속 요청("현재 이용 상태" 카드 추가 등): 세로로 쌓인 카드형 박스 레이아웃으로
// 재구성 — 마이크 버튼/3개 바로가기/이용 상태를 각각 독립된 카드로 감싼다.
const NAV_ITEMS = [
  { label: '길 찾기', path: '/map', Icon: MapIcon },
  { label: '기차예매', path: '/train', Icon: TrainIcon },
  { label: '키오스크 도움', path: '/kiosk', Icon: KioskIcon },
]

export function HomeScreen() {
  const navigate = useNavigate()
  const { status, sttCaption, ttsCaption, startListening } = useVoiceAssistant()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [history, setHistory] = useState([])

  // "현재 이용 상태" 카드에 쓸 남은 무료 이용 횟수. null이면 아직 응답을 못 받은
  // 상태(로딩 중)라 카드에 "확인 중..."을 보여준다. usageApi.js 주석 참고 —
  // API 명세서에 없는 값이라 지금은 mock으로 채워진다.
  const [remainingFreeUsage, setRemainingFreeUsage] = useState(null)

  useEffect(() => {
    let cancelled = false
    usageApi.getUsageStatus().then((data) => {
      if (!cancelled) setRemainingFreeUsage(data.remainingFreeUsage)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // sttCaption의 "그때그때 최신값"을 ref에 미러링해둔다. 렌더마다 대입만 하므로
  // effect 의존성에 넣지 않고도 아래 effect에서 항상 최신 질문 텍스트를 읽을 수 있다.
  const latestSttCaptionRef = useRef(sttCaption)
  latestSttCaptionRef.current = sttCaption

  // 새 답변(ttsCaption)이 들어올 때만 히스토리에 한 쌍을 추가한다. sttCaption을
  // 의존성에 넣으면, 질문이 막 인식된 시점(응답이 오기 전, ttsCaption은 아직 이전
  // 값)에도 effect가 돌아 "새 질문 + 이전 답변"이 잘못 짝지어 기록되므로,
  // ttsCaption 하나만 트리거로 두고 sttCaption은 ref로 그 시점 값만 꺼내 쓴다.
  useEffect(() => {
    if (!ttsCaption) return
    setHistory((prev) => [
      ...prev,
      { id: Date.now(), question: latestSttCaptionRef.current, answer: ttsCaption },
    ])
  }, [ttsCaption])

  return (
    // AppFrame이 393x852로 고정하므로, 여기서는 실제 뷰포트 높이(min-h-dvh) 대신
    // 프레임이 준 100%(h-full)를 채운다.
    <AppFrame>
      {/* 카드가 여러 개 쌓이면 852px 높이를 넘을 수 있어 세로 스크롤을 허용한다
          (다른 화면들의 overflow-y-auto 패턴과 동일). */}
      <main
        className="relative flex h-full flex-col overflow-y-auto"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* 좌측 상단 고정 메뉴 버튼. 요청사항: 초록 배경 칩을 없애고 아이콘만 남기되,
            클릭 영역은 접근성 때문에 44px 이상 유지해야 해서 IconChipButton(배경 있는
            칩 스타일) 대신 배경/테두리/그림자 없는 순수 버튼을 쓴다 — 보이는 아이콘은
            22px지만 버튼 자체 크기(44px)만큼 보이지 않는 padding으로 클릭 영역을
            넓혀뒀다. onClick/aria-label 등 기능은 그대로. */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="메뉴 열기"
          className="absolute left-4 top-4 z-20 flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: 'var(--color-text)',
          }}
        >
          <MenuIcon />
        </button>

        {/* 상단 섹션: 인사말. 화면 타이틀 급(--text-title, 26px/700)으로 키워서 첫
            시선이 여기 먼저 가게 한다 — "무엇"만 accent 컬러로 포인트를 줘서 클릭
            유도 없이도 시선을 붙잡는다(브리프: accent는 클릭 유도 색이지 강조
            전용은 아니지만, 텍스트 강조 정도는 브랜드 톤 일관성 차원에서 허용). */}
        <div className="px-6 pb-16 pt-24 text-center">
          <p
            className="home-greeting-line-1"
            style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text)' }}
          >
            안녕하세요?
          </p>
          <p
            className="home-greeting-line-2"
            style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text)' }}
          >
            <span style={{ color: 'var(--color-primary)' }}>무엇</span>을 도와드릴까요?
          </p>
        </div>

        {/* 카드형 박스가 세로로 쌓인 레이아웃(참고 이미지의 구조만 차용 — 색/텍스트는
            브리프 톤 그대로). 마이크 버튼, 3개 바로가기, 이용 상태를 각각 독립된
            카드로 감싸고 gap-4(--space-md 상당)로 균일하게 띄운다. */}
        <div className="flex flex-1 flex-col gap-4 px-6 pb-10">
          {/* 마이크 카드: 화면의 메인 액션이라 흰 카드가 아니라 accent 컬러로 채운
              박스로 구분했다. VoiceButton은 다른 화면에서도 재사용하는 공용
              컴포넌트라 여기서 새로 만들지 않고 그대로 가져다 썼다(모양만 원형에서
              둥근 박스로 바뀜 — VoiceButton.jsx 참고, 클릭/상태 로직은 불변).
              상태 텍스트("눌러서 말하기" 등)는 이제 박스 바깥이 아니라 VoiceButton
              내부에 아이콘과 함께 표시되므로, 여기서 따로 캡션을 그리지 않는다. */}
          <VoiceButton status={status} onPress={startListening} />

          {/* 바로가기 카드: 길찾기/기차예매/키오스크 도움 3개 버튼을 유지하되, 흰
              카드 하나로 감싸 다른 카드들과 톤을 맞췄다(요구사항 2). */}
          <Card className="flex justify-center gap-6">
            {NAV_ITEMS.map(({ label, path, Icon }) => (
              <div key={path} className="flex flex-col items-center gap-2">
                {/* 72px — 공용 최소 규격(56px)보다 조금 키워서 3개뿐인 주요
                    바로가기가 카드 안에서 눈에 잘 띄게 했다. */}
                <IconChipButton onClick={() => navigate(path)} size={72} ariaLabel={label}>
                  <Icon />
                </IconChipButton>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text)' }}>
                  {label}
                </span>
              </div>
            ))}
          </Card>

          {/* "현재 이용 상태" 카드(신규). remainingFreeUsage는 usageApi.js를 통해
              가져오는데, 실제 API 명세서에 이 데이터가 정의돼 있지 않아 지금은
              mock 값이다(usageApi.js 주석 참고) — 절대 이 컴포넌트 안에서 숫자를
              하드코딩하지 않고, API 응답 값을 그대로 표시한다. */}
          <Card className="flex flex-col gap-1">
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-text)' }}>
              현재 이용 상태
            </h2>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text)' }}>
              {remainingFreeUsage === null
                ? '확인 중...'
                : `이번 달 무료 이용 ${remainingFreeUsage}회 남았어요`}
            </p>
            <button
              type="button"
              onClick={() => navigate('/usage-limit')}
              className="mt-1 self-start"
              style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}
            >
              이용한도 확인하기
            </button>
          </Card>
        </div>

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />

        <SidePanel isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} history={history} />
      </main>
    </AppFrame>
  )
}

// 아래 아이콘들은 새 의존성을 추가하지 않기 위해 직접 그린 최소한의 선 아이콘이다
// (stroke=currentColor라 버튼의 글자색을 그대로 물려받는다).

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 20 3.6 17.7A1 1 0 0 1 3 16.8V5.2a1 1 0 0 1 1.4-.9L9 6.5m0 13.5 6-3m-6 3v-13.5m6 13.5 4.6 2.3a1 1 0 0 0 1.4-.9V6.8a1 1 0 0 0-.6-.9L15 3.5m0 13.5v-13.5m0 0L9 6.5" />
    </svg>
  )
}

function TrainIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="12" rx="4" />
      <path d="M5 11h14M9 19l-2 3M15 19l2 3M9.5 7h.01M14.5 7h.01" />
    </svg>
  )
}

function KioskIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="18" rx="2" />
      <rect x="8.5" y="5.5" width="7" height="6" rx="0.5" />
      <path d="M9 17h6" />
    </svg>
  )
}

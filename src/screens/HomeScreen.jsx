import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { GlassCircleButton } from '../components/common/Glass'
import { GLASS_BACKGROUND_STYLE, GLASS_BRAND_COLOR } from '../components/common/glassTokens'
import { SidePanel } from '../components/home/SidePanel'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

// 아이콘+라벨이 함께 들어가는 원형 버튼 3개의 목록. path만 있으면 되므로 데이터로 뺐다.
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

  const micStatusLabel =
    status === 'listening' ? '듣고 있어요...' : status === 'processing' ? '처리 중이에요...' : '눌러서 말하기'

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
      <main className="relative flex h-full flex-col items-center p-6" style={GLASS_BACKGROUND_STYLE}>
        {/* 좌측 상단 고정 메뉴 버튼. 드로어가 열려도 위치는 그대로 두고, 오버레이가
            위(z-40)에서 덮으므로 열려있는 동안은 자연스럽게 클릭이 막힌다. */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="메뉴 열기"
          className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 shadow-sm backdrop-blur-sm"
          style={{ color: GLASS_BRAND_COLOR }}
        >
          <MenuIcon />
        </button>

        <div className="mt-16 text-center">
          <p className="home-greeting-line-1" style={{ fontSize: 'var(--font-size-lg)' }}>
            안녕하세요?
          </p>
          <p className="home-greeting-line-2" style={{ fontSize: 'var(--font-size-lg)' }}>
            {/* "무엇"만 브랜드 컬러+굵게로 포인트, 나머지는 기본 스타일 유지 */}
            <span style={{ color: GLASS_BRAND_COLOR, fontWeight: 800 }}>무엇</span>을 도와드릴까요?
          </p>
        </div>

        {/* 중앙: 마이크가 이 화면의 메인 액션이라 하단 버튼보다 눈에 띄게 크게(150px) 둔다. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <GlassCircleButton
            onClick={startListening}
            disabled={status === 'processing'}
            size={150}
            ariaLabel="음성 비서 시작"
          >
            <MicIcon size={38} />
          </GlassCircleButton>
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>
            {micStatusLabel}
          </p>
        </div>

        <div className="flex gap-3 pb-6">
          {NAV_ITEMS.map(({ label, path, Icon }) => (
            <GlassCircleButton key={path} onClick={() => navigate(path)} ariaLabel={label}>
              <Icon />
              <span className="px-1 text-[11px] leading-tight">{label}</span>
            </GlassCircleButton>
          ))}
        </div>

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />

        <SidePanel isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} history={history} />
      </main>
    </AppFrame>
  )
}

// 아래 아이콘들은 새 의존성을 추가하지 않기 위해 직접 그린 최소한의 선 아이콘이다
// (stroke=currentColor라 버튼의 text-white를 그대로 물려받는다).

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 20 3.6 17.7A1 1 0 0 1 3 16.8V5.2a1 1 0 0 1 1.4-.9L9 6.5m0 13.5 6-3m-6 3v-13.5m6 13.5 4.6 2.3a1 1 0 0 0 1.4-.9V6.8a1 1 0 0 0-.6-.9L15 3.5m0 13.5v-13.5m0 0L9 6.5" />
    </svg>
  )
}

function TrainIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="12" rx="4" />
      <path d="M5 11h14M9 19l-2 3M15 19l2 3M9.5 7h.01M14.5 7h.01" />
    </svg>
  )
}

function KioskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="18" rx="2" />
      <rect x="8.5" y="5.5" width="7" height="6" rx="0.5" />
      <path d="M9 17h6" />
    </svg>
  )
}

function MicIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
    </svg>
  )
}

import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

// 로그인 이후 진입하는 메인 화면 (기획서 4-1장).
// 이 화면 전용 브랜드 포인트 컬러. 다른 화면은 아직 회색조 placeholder를 유지하고
// 있어 전역 토큰으로 승격하지 않고 로컬 상수로만 둔다 — 이번 요청이 홈 화면
// 한정이라, 이 색이 다른 화면에 영향을 주지 않게 하기 위함이다.
const BRAND_COLOR = '#146156'

// 아이콘+라벨이 함께 들어가는 원형 버튼 3개의 목록. path만 있으면 되므로 데이터로 뺐다.
const NAV_ITEMS = [
  { label: '길 찾기', path: '/map', Icon: MapIcon },
  { label: '기차예매', path: '/train', Icon: TrainIcon },
  { label: '키오스크 도움', path: '/kiosk', Icon: KioskIcon },
]

// 유리 재질(glassmorphism) 원형 버튼 공용 스타일. Tailwind는 클래스 문자열을 빌드
// 타임에 정적으로 스캔하므로, 여기 하이라이트된 값들(bg-[#146156]/60 등)은 변수로
// 만들지 않고 리터럴로 고정한다 — 그래야 실제로 CSS가 생성된다.
const GLASS_BUTTON_CLASS =
  'flex flex-col items-center justify-center gap-1 rounded-full border border-white/30 ' +
  'text-white text-center backdrop-blur-md transition-colors duration-200 ' +
  'bg-[#146156]/60 hover:bg-[#0f4a41]/75 active:bg-[#0f4a41]/85 ' +
  'disabled:opacity-50 disabled:hover:bg-[#146156]/60 disabled:cursor-not-allowed'

function GlassCircleButton({ children, onClick, disabled, size = 100, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={GLASS_BUTTON_CLASS}
      style={{
        width: size,
        height: size,
        // Tailwind shadow-*는 무채색이라, 유리 버튼이 브랜드 컬러 위에 떠 있는
        // 느낌을 내려고 색이 들어간 그림자를 인라인으로 준다.
        boxShadow: '0 8px 24px rgba(20, 97, 86, 0.28)',
      }}
    >
      {children}
    </button>
  )
}

export function HomeScreen() {
  const navigate = useNavigate()
  const { status, sttCaption, ttsCaption, startListening } = useVoiceAssistant()

  const micStatusLabel =
    status === 'listening' ? '듣고 있어요...' : status === 'processing' ? '처리 중이에요...' : '눌러서 말하기'

  return (
    // AppFrame이 393x852로 고정하므로, 여기서는 실제 뷰포트 높이(min-h-dvh) 대신
    // 프레임이 준 100%(h-full)를 채운다.
    <AppFrame>
      <main
        className="relative flex h-full flex-col items-center justify-between overflow-hidden p-6"
        style={{
          // 유리 버튼은 반투명이라 배경이 밋밋한 흰색이면 "유리" 느낌이 거의 안 보인다.
          // 브랜드 컬러를 위에서 아래로 은은하게 깔아 블러/반투명 효과가 실제로
          // 눈에 띄게 한다 (톤은 옅게 유지해 나머지 화면들과 크게 튀지 않도록).
          background: `linear-gradient(180deg, ${BRAND_COLOR}26 0%, #ffffff 55%)`,
        }}
      >
        <h1 className="mt-4 text-center" style={{ fontSize: 'var(--font-size-xl)' }}>
          {/* "척척"만 브랜드 컬러+굵게로 포인트, 나머지는 기본 스타일 유지 */}
          <span style={{ color: BRAND_COLOR, fontWeight: 800 }}>척척</span> 알려드릴게요
        </h1>

        <div className="flex gap-3">
          {NAV_ITEMS.map(({ label, path, Icon }) => (
            <GlassCircleButton key={path} onClick={() => navigate(path)} ariaLabel={label}>
              <Icon />
              <span className="px-1 text-[11px] leading-tight">{label}</span>
            </GlassCircleButton>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 pb-6">
          <GlassCircleButton
            onClick={startListening}
            disabled={status === 'processing'}
            size={112}
            ariaLabel="음성 비서 시작"
          >
            <MicIcon />
          </GlassCircleButton>
          {/* 위쪽 원형 버튼들과 톤을 맞추면서도, 문구 자체는 화면 어디서나 쓰는
              기존 톤(--color-text-muted)을 그대로 따른다. */}
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>
            {micStatusLabel}
          </p>
        </div>

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
      </main>
    </AppFrame>
  )
}

// 아래 아이콘들은 새 의존성을 추가하지 않기 위해 직접 그린 최소한의 선 아이콘이다
// (stroke=currentColor라 버튼의 text-white를 그대로 물려받는다).

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

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
    </svg>
  )
}

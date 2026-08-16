/** Design reminder — same board language as MapRouteScreen: quiet cards, one decisive action bar. */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { ExecutingPanel } from '../components/common/ExecutingPanel'
import { MobileHeader } from '../components/common/MobileHeader'
import { ProgressStrip } from '../components/common/ProgressStrip'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useVoiceAutoLaunch } from '../hooks/useVoiceAutoLaunch'
import { getCurrentPositionOrNull } from '../lib/geolocation'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 기차 예매(TRAIN_BOOKING)를 대체한 신규 기능. 처음엔 실제 API 명세가 없어 mock
// 모듈(api/nearbyPlaceApi.js, 삭제됨)로 화면 흐름만 만들어뒀었는데, 실제 API
// 명세서(v2.0 5장, intent: SEARCH_MEDICAL)를 받아 그대로 다시 연결했다 — 길찾기
// (MAP_ROUTE)와 완전히 같은 POST /voice/process 파이프라인이고, 응답도 같은
// { naverMapAppUrl, naverMapWebUrl } 형태라 길찾기에서 뽑아낸 useVoiceAutoLaunch
// 훅을 그대로 재사용한다. 길찾기와 다른 점: "출발지"가 사용자가 입력하는 텍스트가
// 아니라 GPS 좌표이고, 요청에 지역명 대신 카테고리(type: HOSPITAL/PHARMACY)를
// 실어 보낸다는 것 — 그래서 길찾기의 ASK_ORIGIN 같은 "출발지를 되묻는" 단계가
// 없고, 대신 이 화면 자체가 카테고리를 먼저 고르게 한다.
const STEP_LABELS = ['입력', '실행']

const CATEGORY_LABEL = { hospital: '병원', pharmacy: '약국' }
// 요청 필드명(명세서 5장 예시: "type": "PHARMACY" | "HOSPITAL")과 이 화면의 내부
// 상태값(hospital/pharmacy, 다른 화면들과 마찬가지로 소문자 관례)을 서로 변환한다.
const CATEGORY_TO_TYPE = { hospital: 'HOSPITAL', pharmacy: 'PHARMACY' }

// 음성으로만("병원 찾아줘"라고 마이크에 대고 말한 경우, 이 화면의 카테고리
// 버튼을 거치지 않은 경우) 들어온 경우 카테고리 표시용 문구를 알아내야 한다.
// 명세서 5장 응답 예시엔 slots 필드가 아예 없어(다른 intent와 달리) 서버가
// 카테고리를 다시 알려주는지 확정할 수 없다 — 그래서 서버 slots도 관대하게
// 먼저 확인하고, 없으면 사용자가 실제로 말한 문장(transcript)에서 "병원"/"약국"
// 단어를 직접 찾는다. 실패해도 화면 실행 자체엔 지장 없다(문구 표시만 못 할 뿐).
function inferCategory({ slotsValue, transcript }) {
  const source = String(slotsValue ?? transcript ?? '').toLowerCase()
  if (!source) return null
  if (source.includes('pharmacy') || source.includes('약국')) return 'pharmacy'
  if (source.includes('hospital') || source.includes('병원')) return 'hospital'
  return null
}

export function NearbyPlaceScreen() {
  const navigate = useNavigate()

  const { status, sendText, outcome, ttsCaption } = useVoiceAssistant()
  const intent = useVoiceSessionStore((state) => state.intent)
  const voiceStep = useVoiceSessionStore((state) => state.step)
  const voiceSlots = useVoiceSessionStore((state) => state.slots)
  const voiceData = useVoiceSessionStore((state) => state.data)
  const voiceTranscript = useVoiceSessionStore((state) => state.transcript)
  const resetSession = useVoiceSessionStore((state) => state.resetSession)
  const isVoiceSession = intent === 'SEARCH_MEDICAL'

  // 카테고리는 표시 문구("내 주변 약국을 확인하고 있어요" 등)에만 쓰인다 —
  // 버튼으로 골랐으면 클릭 즉시 알고, 음성으로만 들어왔으면 위 inferCategory로
  // 최선의 추측만 한다.
  const [category, setCategory] = useState(null)
  // GPS를 기다리는 동안(최대 8초, lib/geolocation.js 타임아웃)엔 아직 sendText를
  // 안 불러서 status가 'processing'으로 안 바뀐다 — 그 사이 화면이 아무 반응
  // 없어 보이지 않도록 별도로 표시한다(HomeScreen.jsx의 "오늘의 날씨" 버튼과
  // 동일한 이유로 동일하게 처리).
  const [isLocating, setIsLocating] = useState(false)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // mode는 길찾기/날씨 화면과 동일하게 로컬 stage state 없이 서버 세션 상태
  // 그대로에서 계산한다 — "실행" 단계가 곧 "서버가 DONE으로 답했다"는 뜻이라
  // 별도 상태를 따로 들고 다닐 필요가 없다.
  const mode = isLocating
    ? 'locating'
    : status === 'processing'
      ? 'loading'
      : isVoiceSession && voiceStep === 'DONE' && voiceData
        ? 'executing'
        : 'choose'

  // DONE 응답 자동 실행 — 길찾기에서 뽑아낸 공용 훅(hooks/useVoiceAutoLaunch.js)을
  // 그대로 재사용한다. 카테고리 버튼 클릭이든 음성 발화든 결과가 도착하는
  // 경로(voiceSessionStore)가 같아서 이 훅 하나로 두 진입 경로를 다 커버한다.
  useVoiceAutoLaunch({
    isActive: isVoiceSession && voiceStep === 'DONE',
    appUrl: voiceData?.naverMapAppUrl,
    webUrl: voiceData?.naverMapWebUrl,
    onLaunch: () => {
      const inferred = inferCategory({ slotsValue: voiceSlots?.type ?? voiceSlots?.category, transcript: voiceTranscript })
      if (inferred) setCategory(inferred)
    },
  })

  // 카테고리 버튼 클릭: GPS를 먼저 시도한 뒤(실패해도 좌표 없이 계속 진행 —
  // 날씨 화면의 "오늘의 날씨" 버튼과 동일한 원칙, 명세서 5장 요청 예시에도
  // 좌표 필드가 필수로 보이지 않는다) type 필드에 카테고리를 실어 보낸다.
  // fallbackRoute: 이 요청이 실패하면(예: GEOCODE_NOT_FOUND) 항상 이 화면으로
  // 돌아와야 한다 — 그 코드는 길찾기(MAP_ROUTE)와도 공유되는 코드라
  // useVoiceAssistant의 공통 테이블만 믿으면 엉뚱하게 /map으로 보내질 수 있어
  // 명시적으로 지정한다(hooks/useVoiceAssistant.js의 ERROR_FORCE_NAVIGATE_ROUTES
  // 주석 참고).
  const handleChooseCategory = async (selectedCategory) => {
    setCategory(selectedCategory)
    setIsLocating(true)
    const coords = await getCurrentPositionOrNull()
    if (!isMountedRef.current) return
    setIsLocating(false)
    const label = CATEGORY_LABEL[selectedCategory]
    sendText(
      `근처 ${label} 찾아줘`,
      { type: CATEGORY_TO_TYPE[selectedCategory], ...(coords ?? {}) },
      { fallbackRoute: '/nearby-place' },
    )
  }

  const handleBack = () => {
    if (mode !== 'choose') {
      resetSession()
      setCategory(null)
      return
    }
    navigate('/home')
  }

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="내 주변 병원·약국" onBack={handleBack} />
        <ProgressStrip labels={STEP_LABELS} current={mode === 'choose' ? 1 : 2} />

        {mode === 'locating' ? (
          <ExecutingPanel label="위치를 확인하는 중" description="현재 위치 확인을 위해 위치 접근을 허용해 주세요." />
        ) : mode === 'loading' ? (
          <ExecutingPanel label="검색하는 중" description="잠시만 기다려 주세요." />
        ) : mode === 'executing' ? (
          <ExecutingPanel
            label="실행하는 중"
            description={`네이버 지도에서 내 주변 ${CATEGORY_LABEL[category] ?? '병원·약국'}을 확인하고 있어요.`}
          />
        ) : (
          <section className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-5">
            <h1 className="text-[30px] font-extrabold leading-[1.06] tracking-[-0.08em]">
              어디를
              <br />
              찾아드릴까요?
            </h1>

            {/* 실패 안내 — GEOCODE_NOT_FOUND처럼 강제 이동을 유발하는 코드는
                이 화면(fallbackRoute)으로 바로 돌아오고, 그 외 오류는 화면
                이동 없이 여기서 outcome/ttsCaption으로 안내된다 — 두 경우
                모두 이 한 줄이 커버한다. */}
            {outcome === 'error' && ttsCaption ? (
              <p role="alert" className="control-notice mt-4">
                {ttsCaption}
              </p>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <CategoryCard
                label="병원"
                description="가까운 병원 찾기"
                icon={<HospitalGlyph />}
                onClick={() => handleChooseCategory('hospital')}
              />
              <CategoryCard
                label="약국"
                description="가까운 약국 찾기"
                icon={<PharmacyGlyph />}
                onClick={() => handleChooseCategory('pharmacy')}
              />
            </div>
          </section>
        )}
      </main>
    </AppFrame>
  )
}

function CategoryCard({ label, description, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-3 rounded-2xl border p-4 text-left"
      style={{ borderColor: 'var(--cb-line)' }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--cb-teal)]"
        style={{ background: 'var(--cb-cream)' }}
      >
        {icon}
      </span>
      <span>
        <span className="block text-[18px] font-extrabold tracking-[-0.03em]">{label}</span>
        <span className="mt-1 block text-[13px] font-medium text-[var(--cb-slate)]">{description}</span>
      </span>
    </button>
  )
}

function HospitalGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

function PharmacyGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M9 4h6M12 13v7M9 20h6" />
    </svg>
  )
}

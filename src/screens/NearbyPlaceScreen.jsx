/** Design reminder — same board language as MapRouteScreen: quiet cards, one decisive action bar. */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nearbyPlaceApi } from '../api/nearbyPlaceApi'
import { AppFrame } from '../components/common/AppFrame'
import { ExecutingPanel } from '../components/common/ExecutingPanel'
import { MobileHeader } from '../components/common/MobileHeader'
import { ProgressStrip } from '../components/common/ProgressStrip'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useVoiceAutoLaunch } from '../hooks/useVoiceAutoLaunch'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 기차 예매(TRAIN_BOOKING)를 대체한 신규 기능. 길찾기(MapRouteScreen)와 흐름이
// 비슷해서(요청사항) 상단 탭 인디케이터(ProgressStrip)/로딩 애니메이션
// (ExecutingPanel)/딥링크 자동 실행(useVoiceAutoLaunch, 이번에 길찾기에서 뽑아
// 공용화함)을 그대로 재사용한다. 길찾기와 다른 점은 "출발지"가 사용자가 입력하는
// 값이 아니라 브라우저 GPS(useGeolocation)로 직접 구하는 값이라는 것 — 그래서
// 길찾기의 ASK_ORIGIN 같은 "출발지를 되묻는" 단계 자체가 필요 없다.
const STEP_LABELS = ['입력', '실행']

const CATEGORY_LABEL = { hospital: '병원', pharmacy: '약국' }

// 음성 slots.category가 어떤 형태로 올지 아직 명세서에 없어(백엔드 확인 필요,
// nearbyPlaceApi.js 참고) 'PHARMACY'/'약국'/'pharmacy' 등 흔히 나올 법한 표기를
// 최대한 관대하게 인식한다 — 못 알아들으면 null을 돌려주고, 화면은 그래도
// data.naverMapAppUrl만 있으면 정상 실행된다(카테고리는 화면 문구 표시용일 뿐
// 실행 자체에 필수는 아니다).
function normalizeCategory(rawCategory) {
  if (!rawCategory) return null
  const value = String(rawCategory).toLowerCase()
  if (value.includes('pharmacy') || value.includes('약국')) return 'pharmacy'
  if (value.includes('hospital') || value.includes('병원')) return 'hospital'
  return null
}

export function NearbyPlaceScreen() {
  const navigate = useNavigate()
  const { coords, status: geoStatus, requestLocation } = useGeolocation()

  // 음성 대화 지원. MapRouteScreen과 동일하게, 이 화면에서 대화가 이어질 수도
  // 있어(예: 실행 실패 후 재요청) useVoiceAssistant를 그대로 붙여둔다.
  const { outcome, ttsCaption } = useVoiceAssistant()
  const intent = useVoiceSessionStore((state) => state.intent)
  const voiceStep = useVoiceSessionStore((state) => state.step)
  const voiceSlots = useVoiceSessionStore((state) => state.slots)
  const voiceData = useVoiceSessionStore((state) => state.data)
  const isVoiceNearbySession = intent === 'NEARBY_PLACE'

  // stage: 'choose'(병원/약국 선택) -> 'locating'(GPS 확보 중) -> 'executing'
  // (딥링크 실행, 화면 유지). 음성으로 들어온 경우 서버가 위치/카테고리를 이미
  // 다 처리해서 DONE으로 곧장 응답하므로 'choose'/'locating'을 건너뛰고 바로
  // 'executing'으로 간다(길찾기의 "출발지+목적지 모두 확정 시 DONE" 패턴과 동일).
  const [stage, setStage] = useState('choose')
  const [category, setCategory] = useState(null)
  const [locationError, setLocationError] = useState('')

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 음성 DONE 응답 자동 실행 — 길찾기에서 뽑아낸 공용 훅 재사용(hooks/
  // useVoiceAutoLaunch.js). 실제 딥링크 실행/중복 방지 로직은 그 훅 안에 있다.
  useVoiceAutoLaunch({
    isActive: isVoiceNearbySession && voiceStep === 'DONE',
    appUrl: voiceData?.naverMapAppUrl,
    webUrl: voiceData?.naverMapWebUrl,
    onLaunch: () => {
      const normalized = normalizeCategory(voiceSlots?.category)
      if (normalized) setCategory(normalized)
      setStage('executing')
    },
  })

  // 버튼 클릭(음성 없이) 경로: 카테고리를 고르면 GPS부터 확보한다. 길찾기 화면은
  // 이미 만들어진 출발지 텍스트를 geocoding만 하면 되지만, 여기는 애초에 텍스트가
  // 아니라 좌표 자체가 "출발지"라 GPS 단계가 하나 더 필요하다 — 이 부분은 길찾기
  // 화면에 재사용할 로직이 없어서(연구 결과 MapRouteScreen은 GPS를 아예 안 씀,
  // useGeolocation 훅 자체는 있었지만 어디서도 쓰이지 않고 있었음) 이번에 새로
  // 연결했다.
  const handleChooseCategory = (selectedCategory) => {
    setCategory(selectedCategory)
    setLocationError('')
    setStage('locating')
    requestLocation()
  }

  // GPS 상태 변화에 따라 다음 단계로 진행한다.
  //  - granted: 좌표 확보 완료 -> (mock) 링크 요청 -> 실행
  //  - denied: 권한 거부/실패 -> 다시 'choose'로 돌아가 안내 문구를 보여준다
  //    (사용자가 카테고리 버튼을 다시 누르면 재시도되는 구조 — 별도 "재시도"
  //    버튼을 안 둔 이유: 버튼 자체가 이미 재시도 트리거라 중복임).
  useEffect(() => {
    if (stage !== 'locating') return

    if (geoStatus === 'granted' && coords) {
      let cancelled = false
      nearbyPlaceApi
        .getNearbyPlaceLink({ lat: coords.lat, lng: coords.lng, category })
        .then((result) => {
          if (cancelled || !isMountedRef.current) return
          setStage('executing')
          // 표준 딥링크 실행 방식(useVoiceAutoLaunch가 내부적으로 쓰는 것과 동일한
          // 함수) — 여기서는 딥링크를 직접 여는 시점이 "GPS+API 응답을 다 받은 뒤"라
          // 훅을 쓰지 않고 openDeepLinkWithWebFallback을 바로 부른다(훅은 "음성
          // DONE 응답 도착"이라는 다른 트리거를 감시하는 용도).
          openDeepLinkWithWebFallback(result.naverMapAppUrl, result.naverMapWebUrl)
        })
      return () => {
        cancelled = true
      }
    }

    if (geoStatus === 'denied') {
      setStage('choose')
      setLocationError('위치 정보를 가져올 수 없어요. 위치 접근을 허용한 뒤 다시 시도해 주세요.')
    }
  }, [stage, geoStatus, coords, category])

  const handleBack = () => {
    if (stage === 'executing' || stage === 'locating') {
      setStage('choose')
      setCategory(null)
      setLocationError('')
      return
    }
    navigate('/home')
  }

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="내 주변 병원·약국" onBack={handleBack} />
        <ProgressStrip labels={STEP_LABELS} current={stage === 'choose' ? 1 : 2} />

        {stage === 'locating' ? (
          <ExecutingPanel label="위치를 확인하는 중" description="현재 위치 확인을 위해 위치 접근을 허용해 주세요." />
        ) : stage === 'executing' ? (
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

            {outcome === 'error' && ttsCaption ? (
              <p role="alert" className="control-notice mt-4">
                {ttsCaption}
              </p>
            ) : null}
            {locationError ? (
              <p role="alert" className="control-notice mt-4">
                {locationError}
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

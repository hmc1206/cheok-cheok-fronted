/** Design reminder — same board language as MapRouteScreen/NearbyPlaceScreen: quiet cards, one decisive action bar. */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { ExecutingPanel } from '../components/common/ExecutingPanel'
import { MobileHeader } from '../components/common/MobileHeader'
import { ProgressStrip } from '../components/common/ProgressStrip'
import { SeniorButton } from '../components/ui/SeniorButton'
import { SeniorInput } from '../components/ui/SeniorInput'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { getCurrentPositionOnce } from '../lib/geolocation'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// "오늘의 날씨"(홈 화면 5번째 타일, 예전 "말로 질문"을 대체) + 음성으로 "오늘 서울
// 날씨 알려줘" 등을 말했을 때 공통으로 도착하는 화면. 길찾기/병원·약국 찾기와
// 같은 톤(헤더+상단 탭+ExecutingPanel)을 유지하되, 이 화면만의 흐름(ASK_LOCATION
// 되묻기, 결과 카드)은 날씨 API 명세서 v1.0을 그대로 따른다.
const STEP_LABELS = ['입력', '실행']

// 날씨 상태 코드 -> 아이콘/기본 문구(명세서 8장). 이 프로젝트는 아이콘 라이브러리를
// 안 쓰고 전부 직접 그린 stroke=currentColor 선 아이콘이라(components/common/
// icons.jsx 참고, 사용자 확인) 9개 다 같은 스타일로 새로 그렸다. label은 서버가
// conditionText를 안 주는 극히 드문 경우의 fallback일 뿐, 평소엔 서버 문구를
// 우선한다(아래 렌더링부 참고).
const WEATHER_CONDITIONS = {
  CLEAR: { label: '맑음', Icon: SunIcon },
  PARTLY_CLOUDY: { label: '구름 조금', Icon: PartlyCloudyIcon },
  CLOUDY: { label: '흐림', Icon: CloudyIcon },
  RAIN: { label: '비', Icon: RainIcon },
  RAIN_SNOW: { label: '비 또는 눈', Icon: RainSnowIcon },
  SNOW: { label: '눈', Icon: SnowIcon },
  SHOWER: { label: '소나기', Icon: ShowerIcon },
  FOG: { label: '안개', Icon: FogIcon },
  UNKNOWN: { label: '날씨 정보 확인 불가', Icon: UnknownIcon },
}

export function WeatherScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, sendText, ttsCaption, outcome, errorCode } = useVoiceAssistant()
  const intent = useVoiceSessionStore((state) => state.intent)
  const voiceStep = useVoiceSessionStore((state) => state.step)
  const voiceData = useVoiceSessionStore((state) => state.data)
  const voiceQuickReplies = useVoiceSessionStore((state) => state.quickReplies)
  // 이 화면에 오기까지 여러 훅 인스턴스를 거칠 수 있다(예: 홈 화면에서 보낸
  // 요청 -> 이 화면으로 라우팅). ttsCaption은 "지금 이 훅 인스턴스가 직접 받은
  // 응답"만 반영해서, 홈에서 보낸 요청의 결과로 막 도착했을 땐 비어있다 —
  // ttsText는 스토어(voiceSessionStore)에서 읽어야 어느 화면이 요청을 보냈든
  // 항상 최신 문구를 볼 수 있다(hooks/useVoiceAssistant.js의 setSession 참고).
  const voiceTtsText = useVoiceSessionStore((state) => state.ttsText)
  const isWeatherSession = intent === 'WEATHER_INFO'

  const [regionInputMode, setRegionInputMode] = useState(false)
  const [regionText, setRegionText] = useState('')

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // "다시 시도"(WEATHER_API_FAIL) 버튼이 재전송할 요청을 기억해둔다. 화면에
  // 처음 들어올 때는 useVoiceAssistant 훅의 강제 이동 state(retryPayload,
  // hooks/useVoiceAssistant.js 참고)로 시작하고, 이 화면 안에서 새로 보낸
  // 요청이 있으면 그걸로 갱신한다 — ref라 리렌더에 영향받지 않는다.
  const lastRetryPayloadRef = useRef(location.state?.retryPayload ?? null)

  // 실패 정보(errorCode/ttsText)는 두 군데서 올 수 있다:
  //  1) 이 화면 안에서 방금 실패(outcome === 'error') — 이 훅 인스턴스가 직접 겪음.
  //  2) 다른 화면(홈)에서 보낸 첫 요청이 실패해 강제 이동으로 막 도착한 경우 —
  //     그 실패는 홈 화면의 다른 훅 인스턴스가 겪은 것이라 이 화면의 outcome은
  //     아직 'idle'이다. 이때만 location.state를 신뢰한다.
  // outcome이 'idle'을 벗어나 한 번이라도 이 화면에서 직접 요청을 보내고 나면
  // (성공이든 실패든) location.state의 오래된 정보는 더 이상 안 쓴다 — 그래야
  // 재시도가 성공했는데도 옛 에러가 계속 보이는 문제가 없다.
  const displayedErrorCode = outcome === 'error' ? errorCode : outcome === 'idle' && location.state?.requestFailed ? location.state.errorCode : null
  const displayedErrorText = outcome === 'error' ? ttsCaption : outcome === 'idle' && location.state?.requestFailed ? location.state.ttsText : ''

  let mode
  if (status === 'processing') {
    mode = 'loading'
  } else if (isWeatherSession && voiceStep === 'DONE' && voiceData) {
    mode = 'result'
  } else if (isWeatherSession && voiceStep === 'ASK_LOCATION') {
    mode = 'ask-location'
  } else if (displayedErrorCode) {
    mode = 'error'
  } else {
    // 이 화면은 항상 이미 진행 중이거나 완료된 요청과 함께 진입하므로(홈 화면
    // 버튼/음성이 먼저 요청을 보낸 뒤에만 라우팅됨) 실제로는 거의 보이지 않는
    // 과도기 상태 — 그래도 빈 화면보다는 로딩 표시가 안전하다.
    mode = 'loading'
  }

  // 명세서 2-2장: "현재 위치 날씨" 클릭 시 위치 권한을 (재)요청하고 좌표를 함께
  // 실어 재요청한다. GPS 실패해도(권한 거부 등) 좌표 없이 그대로 보낸다 — 서버가
  // 다시 ASK_LOCATION으로 되물을 뿐 프론트가 막을 이유가 없다.
  const handleCurrentLocationReply = async (replyValue) => {
    const coords = await getCurrentPositionOnce()
    if (!isMountedRef.current) return
    const extra = coords ? { latitude: coords.lat, longitude: coords.lng } : {}
    lastRetryPayloadRef.current = { text: replyValue, ...extra }
    sendText(replyValue, extra)
  }

  // 명세서 2-2장: "지역 직접 말하기"는 서버 왕복 없이 입력창만 보여주는 순수
  // 클라이언트 동작이다 — 그래서 다른 quickReplies처럼 값을 그대로 서버에 보내지
  // 않고 여기서만 분기한다(값이 실제로 이렇게 온다는 전제 — 명세서 5장 JSON
  // 예시의 value: "지역 직접 입력"을 그대로 기준으로 삼음).
  const handleQuickReply = (reply) => {
    if (reply.value === '지역 직접 입력') {
      setRegionInputMode(true)
      return
    }
    handleCurrentLocationReply(reply.value)
  }

  const handleRegionSubmit = (event) => {
    event.preventDefault()
    const trimmed = regionText.trim()
    if (!trimmed) return
    const text = `${trimmed} 날씨 알려줘`
    lastRetryPayloadRef.current = { text }
    sendText(text)
  }

  const handleRetry = () => {
    const payload = lastRetryPayloadRef.current
    if (!payload) return
    const { text, latitude, longitude } = payload
    sendText(text, latitude != null && longitude != null ? { latitude, longitude } : {})
  }

  const handleBack = () => {
    if (mode === 'result' || mode === 'error') {
      navigate('/home')
      return
    }
    if (regionInputMode) {
      setRegionInputMode(false)
      return
    }
    navigate('/home')
  }

  const condition = voiceData ? (WEATHER_CONDITIONS[voiceData.conditionCode] ?? WEATHER_CONDITIONS.UNKNOWN) : null
  const ConditionIcon = condition?.Icon

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="오늘의 날씨" onBack={handleBack} />
        <ProgressStrip
          labels={STEP_LABELS}
          current={mode === 'ask-location' || (mode === 'error' && displayedErrorCode === 'WEATHER_LOCATION_NOT_FOUND') ? 1 : 2}
        />

        {mode === 'loading' ? (
          <ExecutingPanel label="날씨를 확인하는 중" description="잠시만 기다려 주세요." />
        ) : mode === 'ask-location' ? (
          regionInputMode ? (
            <RegionInputForm value={regionText} onChange={setRegionText} onSubmit={handleRegionSubmit} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
              <p className="text-[22px] font-extrabold leading-[1.35] tracking-[-0.04em]">
                {voiceTtsText ?? ttsCaption ?? '어느 지역의 날씨를 알려드릴까요?'}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                {(voiceQuickReplies ?? []).map((reply, index) => (
                  <SeniorButton
                    key={reply.value}
                    type="button"
                    variant={index === 0 ? 'primary' : 'secondary'}
                    onClick={() => handleQuickReply(reply)}
                  >
                    {reply.label}
                  </SeniorButton>
                ))}
              </div>
            </div>
          )
        ) : mode === 'error' ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
            <p role="alert" className="control-notice">
              {displayedErrorText}
            </p>
            {displayedErrorCode === 'WEATHER_LOCATION_NOT_FOUND' ? (
              <RegionInputForm value={regionText} onChange={setRegionText} onSubmit={handleRegionSubmit} />
            ) : displayedErrorCode === 'WEATHER_API_FAIL' ? (
              <SeniorButton type="button" onClick={handleRetry} className="mt-6">
                다시 시도
              </SeniorButton>
            ) : null}
          </div>
        ) : (
          // mode === 'result'
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
            {/* 명세서 11-2: ttsText는 즉시 읽어주고(useVoiceAssistant가 이미 자동
                재생함) 같은 문구를 화면에도 큰 글자로 함께 보여준다. */}
            <p className="text-[22px] font-extrabold leading-[1.4] tracking-[-0.04em]">{voiceTtsText ?? ttsCaption}</p>

            <div className="mt-5 flex items-center gap-4 rounded-2xl border p-5" style={{ borderColor: 'var(--cb-line)' }}>
              <span className="text-[var(--cb-teal)]">{ConditionIcon ? <ConditionIcon size={48} /> : null}</span>
              <div>
                <p className="text-[17px] font-bold text-[var(--cb-slate)]">{voiceData?.conditionText ?? condition?.label}</p>
                {voiceData?.currentTemperature != null ? (
                  <p className="text-[44px] font-extrabold leading-none tracking-[-0.04em]">
                    {Math.round(voiceData.currentTemperature)}°
                  </p>
                ) : (
                  <p className="text-[32px] font-extrabold leading-none tracking-[-0.04em]">
                    {voiceData?.minimumTemperature != null ? Math.round(voiceData.minimumTemperature) : '-'}° ~{' '}
                    {voiceData?.maximumTemperature != null ? Math.round(voiceData.maximumTemperature) : '-'}°
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <WeatherStatTile label="습도" value={voiceData?.humidity != null ? `${voiceData.humidity}%` : '-'} />
              <WeatherStatTile
                label="강수 확률"
                value={voiceData?.precipitationProbability != null ? `${voiceData.precipitationProbability}%` : '-'}
              />
              <WeatherStatTile label="풍속" value={voiceData?.windSpeed != null ? `${voiceData.windSpeed}m/s` : '-'} />
            </div>

            {voiceData?.umbrellaRecommended ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl p-4" style={{ background: 'var(--cb-navy)' }}>
                <UmbrellaIcon />
                <p className="text-[16px] font-extrabold text-white">{voiceData.advice}</p>
              </div>
            ) : voiceData?.advice ? (
              <p className="mt-4 text-[15px] font-medium leading-6 text-[var(--cb-slate)]">{voiceData.advice}</p>
            ) : null}

            {voiceData?.location?.name ? (
              <p className="mt-6 text-[13px] font-medium text-[var(--cb-slate)]">{voiceData.location.name} 기준</p>
            ) : null}
          </div>
        )}
      </main>
    </AppFrame>
  )
}

function RegionInputForm({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="mt-6 flex min-h-0 flex-1 flex-col">
      <div className="control-number-field">
        <span>01</span>
        <SeniorInput
          id="weather-region"
          label="지역명"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예: 서울, 부산, 제주"
        />
      </div>
      <div className="mt-auto pt-6">
        <SeniorButton type="submit" disabled={!value.trim()}>
          조회하기
        </SeniorButton>
      </div>
    </form>
  )
}

function WeatherStatTile({ label, value }) {
  return (
    <div className="rounded-2xl border px-3 py-4 text-center" style={{ borderColor: 'var(--cb-line)' }}>
      <p className="text-[13px] font-bold text-[var(--cb-slate)]">{label}</p>
      <p className="mt-1 text-[19px] font-extrabold tracking-[-0.03em]">{value}</p>
    </div>
  )
}

function SunIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  )
}
function PartlyCloudyIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="3.2" />
      <path d="M8.5 3.7v1.4M4.6 6l1 1M2.9 8.5h1.4" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1.6A4 4 0 0 0 9 19Z" />
    </svg>
  )
}
function CloudyIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 18h11a3.8 3.8 0 0 0 .4-7.6 5.5 5.5 0 0 0-10.6-1.7A4.3 4.3 0 0 0 6.5 18Z" />
    </svg>
  )
}
function RainIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 14h11a3.8 3.8 0 0 0 .4-7.6 5.5 5.5 0 0 0-10.6-1.7A4.3 4.3 0 0 0 6.5 14Z" />
      <path d="M9 18.5 8 21M13 18.5 12 21M17 18.5 16 21" />
    </svg>
  )
}
function RainSnowIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 14h11a3.8 3.8 0 0 0 .4-7.6 5.5 5.5 0 0 0-10.6-1.7A4.3 4.3 0 0 0 6.5 14Z" />
      <path d="M9 18.5 8 21M17 18.5 16 21" />
      <path d="M12 18v3.2M10.6 18.8l2.8 1.6M13.4 18.8l-2.8 1.6" />
    </svg>
  )
}
function SnowIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 13h11a3.8 3.8 0 0 0 .4-7.6A5.5 5.5 0 0 0 7.3 3.7 4.3 4.3 0 0 0 6.5 13Z" />
      <path d="M8.5 17.5v4M6.5 18.7l4 1.6M12.5 18.7l-4 1.6M15.5 17.5v4M13.5 18.7l4 1.6M19.5 18.7l-4 1.6" />
    </svg>
  )
}
function ShowerIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 12h11a3.8 3.8 0 0 0 .4-7.6A5.5 5.5 0 0 0 7.3 2.7 4.3 4.3 0 0 0 6.5 12Z" />
      <path d="M7.5 16 6 21M11.5 16 10 21M15.5 16 14 21M19 16l-1.5 5" />
    </svg>
  )
}
function FogIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 10.5h9.5a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6-1.3A3.5 3.5 0 0 0 6.5 10.5Z" />
      <path d="M4 14.5h16M4 18h16M4 21h11" />
    </svg>
  )
}
function UnknownIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M9.6 9.3a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.2 1-1.2 1.9" />
      <path d="M12 17.2h.01" />
    </svg>
  )
}
function UmbrellaIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-white">
      <path d="M3 11a9 9 0 0 1 18 0Z" />
      <path d="M12 2v1M12 11v8a2 2 0 0 1-3.5 1.3" />
    </svg>
  )
}

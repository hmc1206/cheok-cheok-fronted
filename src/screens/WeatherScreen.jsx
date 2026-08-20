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
import { getCurrentPositionOrNull } from '../lib/geolocation'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// "오늘의 날씨"(홈 화면 5번째 타일, 예전 "말로 질문"을 대체) + 음성으로 "오늘 서울
// 날씨 알려줘" 등을 말했을 때 공통으로 도착하는 화면. 길찾기/병원·약국 찾기와
// 같은 톤(헤더+상단 탭+ExecutingPanel)을 유지하되, 이 화면만의 흐름(ASK_LOCATION
// 되묻기, 결과 카드)은 날씨 API 명세서 v1.0을 그대로 따른다.
//
// STEP_LABELS: 길찾기/병원·약국 찾기는 사용자가 값을 "입력"한 뒤에야 "실행"
// 단계로 넘어가는 진짜 2단계 흐름이라 탭이 둘 다 의미가 있다. 날씨는 이 화면에
// 들어오자마자 자동으로 조회가 시작돼(위 자동 진입 이펙트 참고) 사용자가 직접
// 입력하는 단계 자체가 없다 — "입력" 탭이 실제로는 한 번도 활성화되지 않는
// 죽은 탭이었다(요청사항: "입력 탭을 없애고 실행 탭만 남겨줘"). ProgressStrip은
// labels 배열 길이에 맞춰 칸을 그리므로 여기서 '실행' 하나만 넘기면 자동으로
// 탭 하나짜리 UI가 된다(components/common/ProgressStrip.jsx의 grid-cols-1 추가 참고).
const STEP_LABELS = ['실행']

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
  // GPS를 기다리는 동안(최대 8초, lib/geolocation.js 타임아웃)엔 아직 sendText를
  // 안 불러서 status가 'processing'으로 안 바뀐다 — 그 사이 화면이 아무 반응
  // 없어 보이지 않도록 별도로 표시한다(NearbyPlaceScreen.jsx와 동일한 이유로
  // 동일하게 처리).
  const [isLocating, setIsLocating] = useState(false)
  // 서버 응답을 15초 넘게 기다려도 안 오면 "데이터 로드 중"을 계속 보여주는
  // 대신 에러 문구로 전환한다(사용자 확인 — 15초). 아래 타임아웃 useEffect에서 채운다.
  const [requestTimedOut, setRequestTimedOut] = useState(false)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // "다시 시도"(WEATHER_API_FAIL/타임아웃) 버튼이 재전송할 요청을 기억해둔다.
  // 화면에 처음 들어올 때는 useVoiceAssistant 훅의 강제 이동 state(retryPayload,
  // hooks/useVoiceAssistant.js 참고)로 시작하고, 이 화면 안에서 새로 보낸
  // 요청이 있으면(자동 진입 요청 포함) 그걸로 갱신한다 — ref라 리렌더에
  // 영향받지 않는다.
  const lastRetryPayloadRef = useRef(location.state?.retryPayload ?? null)

  // 이 화면 진입 즉시 자동으로 날씨를 조회한다(요청사항 — "영상 도움" 버튼처럼
  // 클릭하면 곧바로 전용 페이지로 이동하고, 그 페이지 안에서 필요한 동작을
  // 스스로 시작해야 한다). 예전엔 홈 화면이 GPS+요청을 먼저 끝내고 성공해야만
  // 이 화면으로 이동시켰는데, 그러면 GPS를 기다리는 동안 화면 전환이 전혀
  // 없어서(홈 화면에 그대로 머묾) "버튼을 눌러도 반응이 없다"처럼 보일 수
  // 있었다 — 이제 HomeScreen.jsx는 버튼을 누르면 곧장 이 경로로 navigate만
  // 하고, GPS/요청은 이 화면이 마운트되자마자 스스로 시작한다.
  //
  // 단, 아래 두 경우엔 자동으로 다시 요청하지 않는다:
  //  1) 이미 결과/재질문이 와 있는 경우 — 음성으로 "오늘 서울 날씨 알려줘"라고
  //     말해서 이 화면으로 라우팅된 경우, 그 결과를 그대로 보여주면 된다.
  //  2) 실패로 강제 이동된 경우(hooks/useVoiceAssistant.js의 requestFailed) —
  //     실패 안내 + 재시도/재입력 UI를 그대로 보여준다.
  // hasAutoTriggeredRef는 StrictMode의 마운트 이중 실행에도 딱 한 번만
  // 실행되게 막는다 — "방금 자동 실행했는지" 여부라서(다른 화면들의
  // isMountedRef와 달리) 이펙트가 다시 돌 때마다 리셋하면 안 되고, 한 번
  // 세팅되면 이 컴포넌트 인스턴스가 사는 동안 계속 true여야 한다.
  const hasAutoTriggeredRef = useRef(false)
  useEffect(() => {
    if (hasAutoTriggeredRef.current) return
    hasAutoTriggeredRef.current = true

    if (isWeatherSession && (voiceStep === 'DONE' || voiceStep === 'ASK_LOCATION')) return
    if (location.state?.requestFailed) return

    ;(async () => {
      setIsLocating(true)
      const coords = await getCurrentPositionOrNull()
      if (!isMountedRef.current) return
      setIsLocating(false)
      const text = '오늘 날씨 알려줘'
      // coords가 이미 { latitude, longitude } 형태라(lib/geolocation.js) 별도
      // 필드명 변환 없이 그대로 넘긴다.
      lastRetryPayloadRef.current = { text, ...(coords ?? {}) }
      sendText(text, coords ?? {})
    })()
    // 마운트 시 딱 한 번만 — 아래 참조하는 값들은 "이 화면에 막 도착했을 때"의
    // 스냅샷만 필요하다(이후 값이 바뀌어도 이 이펙트를 다시 돌릴 필요 없음).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 서버 응답을 기다리는 동안(status === 'processing') 15초 타이머를 건다 —
  // 그 안에 응답이 오면(status가 'processing'을 벗어나면) 이 이펙트의 cleanup이
  // 타이머를 지운다. 응답이 실제로 늦게 도착해서 새로 성공/실패 처리가 되면
  // status가 바뀌면서 이 이펙트가 다시 실행돼 requestTimedOut을 자동으로
  // false로 되돌린다(예: 타임아웃 문구를 보고 있다가 뒤늦게 실제 결과가 와도
  // 결과 화면으로 자연스럽게 넘어감).
  useEffect(() => {
    if (status !== 'processing') {
      setRequestTimedOut(false)
      return
    }
    const timer = setTimeout(() => setRequestTimedOut(true), 15000)
    return () => clearTimeout(timer)
  }, [status])

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

  // result/ask-location(실제 데이터가 있는 상태)을 가장 먼저 확인해서, 뒤늦게
  // 도착한 진짜 응답이 항상 locating/timeout/loading 같은 과도기 상태보다
  // 우선하도록 한다.
  let mode
  if (isWeatherSession && voiceStep === 'DONE' && voiceData) {
    mode = 'result'
  } else if (isWeatherSession && voiceStep === 'ASK_LOCATION') {
    mode = 'ask-location'
  } else if (isLocating) {
    mode = 'locating'
  } else if (requestTimedOut) {
    mode = 'timeout'
  } else if (status === 'processing') {
    mode = 'loading'
  } else if (displayedErrorCode) {
    mode = 'error'
  } else {
    // 이 화면이 마운트되면 위 자동 진입 이펙트가 곧바로 GPS부터 시작하므로
    // 실제로는 거의 보이지 않는 과도기 상태 — 그래도 빈 화면보다는 로딩
    // 표시가 안전하다.
    mode = 'loading'
  }

  // 명세서 2-2장: "현재 위치 날씨" 클릭 시 위치 권한을 (재)요청하고 좌표를 함께
  // 실어 재요청한다. GPS 실패해도(권한 거부 등) 좌표 없이 그대로 보낸다 — 서버가
  // 다시 ASK_LOCATION으로 되물을 뿐 프론트가 막을 이유가 없다.
  const handleCurrentLocationReply = async (replyValue) => {
    const coords = await getCurrentPositionOrNull()
    if (!isMountedRef.current) return
    // coords가 이미 { latitude, longitude } 형태라(lib/geolocation.js) 별도
    // 필드명 변환 없이 그대로 넘긴다.
    const extra = coords ?? {}
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

  // QA 중 발견: 홈에서 push로만 들어오는 화면이라 아래 두 navigate('/home')가
  // 그대로 push면 히스토리가 중복 쌓여 뒤로가기가 예상과 다르게 동작한다
  // (MapRouteScreen.jsx 주석 참고, 다른 기능 화면들과 동일한 원인). replace로 수정.
  const handleBack = () => {
    if (mode === 'result' || mode === 'error') {
      navigate('/home', { replace: true })
      return
    }
    if (regionInputMode) {
      setRegionInputMode(false)
      return
    }
    navigate('/home', { replace: true })
  }

  const condition = voiceData ? (WEATHER_CONDITIONS[voiceData.conditionCode] ?? WEATHER_CONDITIONS.UNKNOWN) : null
  const ConditionIcon = condition?.Icon
  // 일교차 — 명세서엔 별도 필드가 없어(요청사항: "이 계산은... 프론트에서 직접
  // 계산할 것") 최고·최저 기온 두 값의 차이로 계산한다. 반올림은 온도 표시
  // 규칙(명세서 11-4 "반올림한 정수로 표시")과 통일했다. 둘 중 하나라도 없으면
  // (예보가 아니라 실시간 관측만 있는 응답 등) 계산할 수 없으니 표시하지 않는다.
  const diurnalRange =
    voiceData?.minimumTemperature != null && voiceData?.maximumTemperature != null
      ? Math.round(voiceData.maximumTemperature - voiceData.minimumTemperature)
      : null

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="오늘의 날씨" onBack={handleBack} />
        {/* 탭이 "실행" 하나뿐이라 항상 current=1(활성)로 고정 — 예전엔 "입력" 탭과
            번갈아가며 몇 번인지 계산했지만 이제 그럴 필요가 없다. showNumbers=false:
            탭이 하나뿐이면 "01"이 몇 단계 중 몇 번째인지 알려주는 의미가 없어져서
            숫자 없이 "실행"만 보여준다(요청사항). */}
        <ProgressStrip labels={STEP_LABELS} current={1} showNumbers={false} />

        {mode === 'locating' ? (
          <ExecutingPanel label="위치를 확인하는 중" description="현재 위치 확인을 위해 위치 접근을 허용해 주세요." />
        ) : mode === 'timeout' ? (
          // 사용자 확인: 15초 안에 응답이 없으면 "데이터 로드 중" 대신 에러
          // 문구로 전환한다. 재시도는 마지막으로 보낸 요청(자동 진입 요청 포함)
          // 을 그대로 다시 보낸다 — WEATHER_API_FAIL의 "다시 시도"와 같은 로직.
          <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
            <p role="alert" className="control-notice">
              지금은 날씨 정보를 가져오지 못했어요. 잠시 후 다시 해 주세요.
            </p>
            <SeniorButton type="button" onClick={handleRetry} className="mt-6">
              다시 시도
            </SeniorButton>
          </div>
        ) : mode === 'loading' ? (
          <ExecutingPanel label="데이터 로드 중" description="잠시만 기다려 주세요." />
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
          // mode === 'result'. 요청사항: 예전엔 ttsText 문장을 화면 맨 위에 그대로
          // 큰 글씨로 띄웠는데("오늘 현재 위치 날씨는 구름 조금이에요. 현재 28도,
          // 최고 29도, 최저 23도예요...") 정보가 길게 풀어써져 있어 한눈에 읽기
          // 어려웠다 — 그 문장 자체(voiceTtsText/ttsCaption)는 화면에 더 이상
          // 노출하지 않고(음성 안내 용도로는 useVoiceAssistant가 계속 자동
          // 재생하므로 TTS 자체는 그대로 유지된다) 항목별 카드/박스로 재구성했다.
          //
          // 옷차림 안내(advice) 삭제: 이전엔 명세서 7장의 advice 필드를 그대로
          // 보여주는 카드가 있었는데, 이번 요청으로 완전히 제거했다 — 관련 카드
          // UI뿐 아니라 옷차림 전용 아이콘(UmbrellaIcon)도 더 이상 쓰는 곳이
          // 없어져 함께 지웠다. voiceData.advice 필드 자체는 여전히 서버가 줄 수
          // 있지만(명세는 그대로) 이 화면이 더는 참조하지 않는다.
          //
          // 카드 배치(시안 A, 사용자 확인): 날씨 상태 카드(아이콘+문구)를 상단에
          // 크게 두고, 그 아래 기온/습도를 2열 그리드의 동일한 비중 박스로 나란히
          // 배치했다 — 어르신도 한눈에 비교하며 읽을 수 있도록 두 숫자를 같은
          // 크기로 강조한다(요청사항: "숫자는 크고 명확한 글씨 크기로 강조").
          // 일교차/강수확률/풍속은 그리드 아래 작은 보조 텍스트 한 줄로 유지한다
          // (사용자 확인 — 강수확률·풍속은 기존처럼 보조 텍스트로).
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
            <SectionCard title="오늘 날씨">
              <div className="flex items-center gap-3">
                <span className="text-[var(--cb-teal)]">{ConditionIcon ? <ConditionIcon size={40} /> : null}</span>
                <p className="text-[22px] font-extrabold tracking-[-0.03em]">{voiceData?.conditionText ?? condition?.label}</p>
              </div>
            </SectionCard>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* 기온 박스 — 현재 기온을 크게, 최고/최저를 작게 병기한다(요청사항
                  예시 그대로). currentTemperature가 없는 응답(예보만 온 경우
                  등)이면 기존과 동일하게 최고~최저 범위를 대신 크게 보여준다 —
                  이 경우 최고/최저를 또 작게 반복 표시할 필요는 없다. */}
              <SectionCard title="기온">
                <span className="text-[var(--cb-teal)]"><ThermometerIcon /></span>
                {voiceData?.currentTemperature != null ? (
                  <>
                    <p className="mt-2 text-[36px] font-extrabold leading-none tracking-[-0.03em]">
                      {Math.round(voiceData.currentTemperature)}°
                    </p>
                    <p className="mt-1 text-[13px] font-bold text-[var(--cb-slate)]">
                      최고 {voiceData?.maximumTemperature != null ? `${Math.round(voiceData.maximumTemperature)}°` : '-'}
                      {' · '}
                      최저 {voiceData?.minimumTemperature != null ? `${Math.round(voiceData.minimumTemperature)}°` : '-'}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[28px] font-extrabold leading-none tracking-[-0.03em]">
                    {voiceData?.minimumTemperature != null ? Math.round(voiceData.minimumTemperature) : '-'}° ~{' '}
                    {voiceData?.maximumTemperature != null ? Math.round(voiceData.maximumTemperature) : '-'}°
                  </p>
                )}
              </SectionCard>

              {/* 습도 박스 — 기온 박스와 같은 구조(아이콘 -> 큰 숫자)로 맞춰
                  위계를 동등하게 둔다(요청사항: "습도 박스는 별도 박스로 구분"). */}
              <SectionCard title="습도">
                <span className="text-[var(--cb-teal)]"><DropletIcon /></span>
                <p className="mt-2 text-[36px] font-extrabold leading-none tracking-[-0.03em]">
                  {voiceData?.humidity != null ? `${voiceData.humidity}%` : '-'}
                </p>
              </SectionCard>
            </div>

            {/* 보조 정보 한 줄 — 일교차(프론트 계산, 명세서엔 필드가 없어 최고·
                최저 차이로 직접 계산 — 위 diurnalRange 참고)/강수확률/풍속을
                문장이 아니라 짧은 값 나열로 압축했다(요청사항의 취지 — "문장형
                에서 카드/박스형으로"를 이 보조 정보에도 동일하게 적용). */}
            {diurnalRange != null || voiceData?.precipitationProbability != null || voiceData?.windSpeed != null ? (
              <p className="mt-3 text-[13px] font-medium text-[var(--cb-slate)]">
                {diurnalRange != null ? `일교차 ${diurnalRange}°` : null}
                {diurnalRange != null && (voiceData?.precipitationProbability != null || voiceData?.windSpeed != null) ? ' · ' : null}
                {voiceData?.precipitationProbability != null ? `강수 확률 ${voiceData.precipitationProbability}%` : null}
                {voiceData?.precipitationProbability != null && voiceData?.windSpeed != null ? ' · ' : null}
                {voiceData?.windSpeed != null ? `풍속 ${voiceData.windSpeed}m/s` : null}
              </p>
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

// 구독 신청 화면(SubscriptionScreen.jsx)의 SectionCard와 같은 시각 스타일 —
// 흰 배경 rounded-2xl 카드 + 작은 제목 라벨. 화면마다 항목이 달라 컴포넌트를
// 공유하진 않았지만(공유하기엔 지금 두 화면뿐이라 과한 추상화), 톤앤매너는
// 의도적으로 그대로 맞췄다. accent=true면 "옷차림 안내"처럼 실행에 중요한
// 카드를 --cb-gold 배경으로 살짝 강조한다(SubscriptionScreen의 "현재 이용
// 상태" 카드와 동일한 용도).
function SectionCard({ title, children, className = '', accent = false }) {
  return (
    <section
      className={`rounded-2xl border p-4 ${className}`}
      style={{ borderColor: 'var(--cb-line)', background: accent ? 'var(--cb-gold)' : '#fff' }}
    >
      <h2 className="mb-2 text-[13px] font-extrabold tracking-[-0.02em] text-[var(--cb-slate)]">{title}</h2>
      {children}
    </section>
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
// 기온/습도 박스 전용 아이콘 — 요청사항: "숫자와 함께 아이콘을 사용해 직관적으로
// 이해할 수 있도록" 구성. 기존 날씨상태 아이콘들과 같은 스타일(24px 기준,
// stroke=currentColor, strokeWidth 1.8, 둥근 선)로 새로 그렸다.
function ThermometerIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0Z" />
      <path d="M12 15V8" />
    </svg>
  )
}
function DropletIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5s6 6.7 6 11a6 6 0 1 1-12 0c0-4.3 6-11 6-11Z" />
    </svg>
  )
}

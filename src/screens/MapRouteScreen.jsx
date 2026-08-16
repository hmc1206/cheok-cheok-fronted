/** Design reminder — route search is a two-stage board: input, launch. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { routesApi } from '../api/routesApi'
import { AppFrame } from '../components/common/AppFrame'
import { MobileHeader } from '../components/common/MobileHeader'
import { SeniorInput } from '../components/ui/SeniorInput'
import { useTTS } from '../hooks/useTTS'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'
import { resolveMapAutofill } from '../lib/voiceAutofill'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 점(.) 하나가 늘어나는 간격(ms). 사용자 확인: 500ms(점 3개까지 차는데 1.5초).
const LOADING_DOT_INTERVAL_MS = 500

// 예전엔 "입력 -> 확인 -> 실행" 3단계였는데, API 명세서를 다시 확인해보니 "출발지/
// 목적지가 실제 존재하는 장소인지 확인"하는 절차가 geocoding 전용 별도 엔드포인트가
// 아니라 POST /api/v1/routes/naver-link 응답(성공 시 링크, 실패 시 GEOCODE_NOT_FOUND)
// 그 자체였다 — 즉 "확인"과 "실행"이 API 상 같은 호출이라 분리된 화면으로 나눌
// 근거가 없었다(사용자 확인 후 "입력 -> 실행" 2단계로 정리). "확인"에 해당하던
// 검증은 여전히 일어나지만, 입력 단계에서 제출한 그 즉시 실행 단계로 넘어가면서
// 시작되는 하나의 호출 안에 자연스럽게 포함된다.
const STEPS = ['입력', '실행']

export function MapRouteScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { speak } = useTTS()
  const voiceSlots = useVoiceSessionStore((state) => state.slots)
  const voiceData = useVoiceSessionStore((state) => state.data)
  const voiceTranscript = useVoiceSessionStore((state) => state.transcript)

  const [startName, setStartName] = useState('')
  const [goalName, setGoalName] = useState('')
  const [startError, setStartError] = useState('')
  const [goalError, setGoalError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [canRetry, setCanRetry] = useState(false)
  const [voicePrefillNotice, setVoicePrefillNotice] = useState('')

  // 화면 흐름 자체를 나타내는 상태. 'input'일 땐 입력 폼이, 'executing'일 땐
  // 로딩 문구 화면이 보인다 — 예전의 3단계 ProgressStrip과 달리 이제 실제로
  // 화면 전환에 쓰이는 진짜 상태값이다(예전엔 ProgressStrip이 current=1로
  // 고정된 장식용 UI였고 실행 중에도 같은 입력 화면 위에서 버튼만 스피너로
  // 바뀌었다).
  const [step, setStep] = useState('input')

  // 실행 중(비동기 API 호출 진행 중) 화면을 벗어나면(뒤로가기 등) 컴포넌트가
  // 언마운트된 뒤에도 API 응답이 늦게 도착해 setState를 시도할 수 있다 —
  // 이 ref로 언마운트 여부를 확인해 그런 경우엔 상태 갱신을 건너뛴다.
  //
  // 버그 수정(StrictMode): 이펙트 본문에서 isMountedRef.current = true를 다시
  // 세팅하지 않고 cleanup에서 false로만 바꾸면, 개발 모드 React.StrictMode의
  // 마운트 이중 실행(마운트 → 클린업 → 재마운트) 때문에 "클린업이 한 번 돌고
  // 끝"인 상태로 영원히 false에 머문다 — 실제로는 화면이 정상적으로 계속
  // 마운트돼 있는데도(재마운트까지 끝난 상태) executeSearch의 성공/실패
  // 분기가 전부 "언마운트됨"으로 오판해 조용히 아무 것도 안 하고 끝나버려서,
  // 실행 화면(점 애니메이션)에서 절대 못 빠져나오는 문제가 있었다. 이펙트가
  // 다시 실행될 때마다(=진짜 마운트든 StrictMode 재마운트든) true로 되돌려
  // 놓아야 재마운트 이후에도 정상 동작한다.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const voiceState = location.state ?? {}
    const { startName: spokenStart, goalName: spokenGoal } = resolveMapAutofill({
      slots: voiceState.slots ?? voiceSlots,
      data: voiceState.data ?? voiceData,
      transcript: voiceState.transcript ?? voiceTranscript,
    })
    if (spokenStart) setStartName((current) => current || spokenStart)
    if (spokenGoal) setGoalName((current) => current || spokenGoal)
    if (spokenStart || spokenGoal) {
      setVoicePrefillNotice('음성으로 말씀하신 장소를 입력했어요. 내용을 확인해 주세요.')
    }
  }, [location.state, voiceData, voiceSlots, voiceTranscript])

  const clearErrors = useCallback(() => {
    setStartError('')
    setGoalError('')
    setGeneralError('')
    setCanRetry(false)
  }, [])

  // 실제 검증+실행을 담당하는 핵심 함수. "네이버 지도 열기"(최초 제출)와
  // "다시 시도"(재시도) 둘 다 이 함수를 그대로 재사용한다.
  const executeSearch = useCallback(async () => {
    const trimmedStart = startName.trim()
    const trimmedGoal = goalName.trim()

    clearErrors()
    setStep('executing')

    try {
      // 이 호출 하나가 "장소가 실제 존재하는지 확인"과 "딥링크 생성"을 동시에
      // 한다(API 명세서 8-2장) — 별도의 "확인 전용" 엔드포인트가 없어서, 실행
      // 단계 진입 직후 곧바로 이 호출을 시작하는 것 자체가 검증 절차다.
      const { naverMapAppUrl, naverMapWebUrl } = await routesApi.getNaverMapLink({
        startName: trimmedStart,
        goalName: trimmedGoal,
      })
      if (!isMountedRef.current) return

      speak(`${trimmedStart}에서 ${trimmedGoal}까지 경로를 네이버 지도에서 열어드릴게요.`)
      openDeepLinkWithWebFallback(naverMapAppUrl, naverMapWebUrl)

      // 사용자 확인: 딥링크를 연 뒤엔 우리 앱 화면을 홈으로 자동으로 돌려보낸다
      // — 어차피 화면은 네이버 지도 앱/웹으로 넘어가므로, 우리 쪽 화면은 다음에
      // 돌아왔을 때 검색 결과가 아니라 홈이 보이는 게 자연스럽다.
      navigate('/home')
    } catch (error) {
      if (!isMountedRef.current) return

      // 검증 실패(또는 그 외 실패) 시 사용자 확인: 실행 화면에 머무르지 않고
      // 입력 단계로 자동 복귀해서, 문제가 된 입력창 바로 아래에 에러를 보여준다
      // (예전과 동일한 표시 위치 — 화면만 다시 입력 단계로 돌아왔을 뿐).
      setStep('input')

      const code = error.response?.data?.error?.code
      const field = error.response?.data?.error?.field
      const message = error.response?.data?.error?.message

      if (code === 'GEOCODE_NOT_FOUND') {
        const text = message ?? '해당 장소를 찾을 수 없어요. 다시 입력해주세요.'
        if (field === 'startName') setStartError(text)
        else if (field === 'goalName') setGoalError(text)
        else setGeneralError(text)
        speak(text)
      } else if (code === 'GEOCODE_API_FAIL' || code === 'EXTERNAL_API_FAIL') {
        // 일시적인 외부 API 실패 — 입력값 자체는 문제 없을 수 있어 같은 값으로
        // 재시도해볼 가치가 있으므로 재시도 버튼을 켠다.
        const text = message ?? '경로를 찾는 중 문제가 생겼어요. 다시 시도해주세요.'
        setGeneralError(text)
        setCanRetry(true)
        speak(text)
      } else {
        const text = message ?? '경로를 찾는 데 실패했어요. 다시 시도해주세요.'
        setGeneralError(text)
        setCanRetry(true)
        speak(text)
      }
    }
  }, [startName, goalName, speak, clearErrors, navigate])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedStart = startName.trim()
    const trimmedGoal = goalName.trim()
    if (!trimmedStart || !trimmedGoal) {
      setGeneralError('출발지와 목적지를 모두 입력해주세요.')
      return
    }
    executeSearch()
  }

  const disabled = !startName.trim() || !goalName.trim()

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="길 찾기" onBack={() => navigate('/home')} />
        <ProgressStrip current={step === 'executing' ? 2 : 1} />

        {step === 'executing' ? (
          <ExecutingPanel />
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <section className="px-5 pb-4 pt-5">
              <p className="text-[12px] font-extrabold tracking-[0.16em] text-[var(--cb-teal)]">
                길찾기 조종
              </p>
              <h1 className="mt-2 text-[30px] font-extrabold leading-[1.06] tracking-[-0.08em]">
                어디에서 어디로
                <br />
                가시나요?
              </h1>
            </section>

            <section className="control-form-screen__body flex-1 px-5 py-4">
              {voicePrefillNotice ? <p className="control-notice mb-4">{voicePrefillNotice}</p> : null}
              <div className="control-number-field">
                <span>01</span>
                <SeniorInput
                  id="start-name"
                  label="출발지"
                  value={startName}
                  onChange={(event) => setStartName(event.target.value)}
                  placeholder="예: 서울역"
                  error={startError}
                />
              </div>
              <div className="control-number-field mt-5">
                <span>02</span>
                <SeniorInput
                  id="goal-name"
                  label="목적지"
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                  placeholder="예: 부산역"
                  error={goalError}
                />
              </div>
            </section>

            <footer className="control-form-screen__action shrink-0 px-5 py-4">
              {generalError ? (
                <p role="alert" className="mb-3 text-[14px] font-bold leading-5 text-[var(--cb-error)]">
                  {generalError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={disabled}
                className="control-button control-button--primary flex min-h-14 w-full items-center justify-center gap-3 text-[18px] font-extrabold text-white disabled:opacity-45"
              >
                네이버 지도 열기
              </button>
              {canRetry ? (
                <button
                  type="button"
                  onClick={executeSearch}
                  className="control-button control-button--secondary mt-3 min-h-12 w-full text-[16px] font-extrabold"
                >
                  다시 시도
                </button>
              ) : null}
            </footer>
          </form>
        )}
      </main>
    </AppFrame>
  )
}

function ProgressStrip({ current }) {
  return (
    <div className="control-progress grid grid-cols-2" aria-label="길찾기 진행 단계">
      {STEPS.map((label, index) => (
        <div key={label} className={index + 1 === current ? 'is-current' : ''}>
          <span>0{index + 1}</span>
          <strong>{label}</strong>
        </div>
      ))}
    </div>
  )
}

// "실행" 단계 화면. 점(.)이 하나씩 늘어나다가(최대 3개) 다시 0개로 돌아가는
// 걸 반복하는 타이핑 애니메이션 — 이 컴포넌트가 마운트돼 있는 동안(=step이
// 'executing'인 동안)에만 인터벌이 돌고, step이 바뀌어 언마운트되면 자동으로
// 정리된다(별도 조건 분기 없이 useEffect cleanup에 맡김).
function ExecutingPanel() {
  const [dotCount, setDotCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((previous) => (previous + 1) % 4) // 0 -> 1 -> 2 -> 3 -> 0 반복
    }, LOADING_DOT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5">
      <p className="text-[12px] font-extrabold tracking-[0.16em] text-[var(--cb-teal)]">길찾기 조종</p>
      {/* 점 개수만큼 너비가 바뀌어도 "실행하는 중" 글자가 화면 안에서 좌우로
          흔들리지 않도록, 점 3개 폭을 항상 확보해두는 뒤쪽 placeholder 텍스트
          위에 실제 텍스트를 겹쳐 그린다(둘 다 같은 폭의 모노스페이스 숫자가
          아니라 점이라 폭이 미세하게 다를 수 있어, 이 방식이 레이아웃 흔들림
          없이 가장 간단하다). */}
      <p className="relative mt-3 text-[24px] font-extrabold tracking-[-0.04em]">
        <span className="invisible" aria-hidden="true">
          실행하는 중...
        </span>
        <span className="absolute left-0 top-0">실행하는 중{'.'.repeat(dotCount)}</span>
      </p>
      <p className="mt-4 text-[15px] font-medium leading-6 text-[var(--cb-slate)]">
        네이버 지도에서 경로를 확인하고 있어요.
      </p>
    </div>
  )
}

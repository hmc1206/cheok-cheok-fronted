/** Design reminder — route search is a two-stage board: input, launch. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { routesApi } from '../api/routesApi'
import { AppFrame } from '../components/common/AppFrame'
import { ExecutingPanel } from '../components/common/ExecutingPanel'
import { MobileHeader } from '../components/common/MobileHeader'
import { ProgressStrip } from '../components/common/ProgressStrip'
import { SeniorButton } from '../components/ui/SeniorButton'
import { SeniorInput } from '../components/ui/SeniorInput'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useVoiceAutoLaunch } from '../hooks/useVoiceAutoLaunch'
import { useTTS } from '../hooks/useTTS'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'
import { resolveMapAutofill } from '../lib/voiceAutofill'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 후속 요청으로 영상 도움 화면(YoutubePlayerScreen.jsx)도 같은 "입력/실행" 2단계
// 탭 구조를 쓰게 되면서, 이 화면이 처음 만들었던 상단 탭 인디케이터(ProgressStrip)
// 와 점(.) 반복 로딩 애니메이션(ExecutingPanel)을 공용 컴포넌트로 옮겼다(요청사항:
// "새로 만들지 말고 공통 컴포넌트로 분리해서 재사용") — 로직/타이밍은 전혀
// 바뀌지 않았고, components/common/으로 옮겨서 두 화면이 같은 구현을 공유한다.

// 예전엔 "입력 -> 확인 -> 실행" 3단계였는데, API 명세서를 다시 확인해보니 "출발지/
// 목적지가 실제 존재하는 장소인지 확인"하는 절차가 geocoding 전용 별도 엔드포인트가
// 아니라 POST /api/v1/routes/naver-link 응답(성공 시 링크, 실패 시 GEOCODE_NOT_FOUND)
// 그 자체였다 — 즉 "확인"과 "실행"이 API 상 같은 호출이라 분리된 화면으로 나눌
// 근거가 없었다(사용자 확인 후 "입력 -> 실행" 2단계로 정리). "확인"에 해당하던
// 검증은 여전히 일어나지만, 입력 단계에서 제출한 그 즉시 실행 단계로 넘어가면서
// 시작되는 하나의 호출 안에 자연스럽게 포함된다.
const STEP_LABELS = ['입력', '실행']

// 후속 요청: "말로 도움 요청하기"(음성)로 "서울역에서 부산역까지" 같은 발화가 들어와도
// 이 화면이 자동으로 반응하게 한다(명세서 MAP_ROUTE intent). 음성 응답도 결국
// 이 화면의 "입력(출발지/목적지 채우기)"과 "실행(딥링크 열기)"이라는 같은 두 단계를
// 거치므로, 기존 수동 입력 흐름(로컬 stage state, executeSearch, ProgressStrip 등)을
// 새로 만들지 않고 그대로 재사용한다 — 다만 음성 쪽은 서버가 이미 만들어준 딥링크를
// 그대로 쓰므로(아래 참고) routesApi 호출 없이 곧장 stage를 'executing'으로 옮긴다.
export function MapRouteScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { speak } = useTTS()

  // 음성 대화(멀티턴)를 이 화면에서 이어가기 위한 훅. HomeScreen 등 다른 화면에서
  // 시작된 대화든, 이 화면에서 ASK_ORIGIN에 답하며 이어가는 대화든 전부 같은
  // POST /voice/process 파이프라인을 탄다 — 새 API를 만들지 않는다.
  const { sendText, ttsCaption, outcome } = useVoiceAssistant()
  const intent = useVoiceSessionStore((state) => state.intent)
  const voiceStep = useVoiceSessionStore((state) => state.step)
  const voiceSlots = useVoiceSessionStore((state) => state.slots)
  const voiceData = useVoiceSessionStore((state) => state.data)
  const voiceTranscript = useVoiceSessionStore((state) => state.transcript)
  const voiceQuickReplies = useVoiceSessionStore((state) => state.quickReplies)
  const resetSession = useVoiceSessionStore((state) => state.resetSession)

  // voiceSessionStore는 앱 전역 스토어라 다른 화면(영상 도움/기차예매)이 마지막에
  // 남긴 값이 남아있을 수 있다 — intent가 MAP_ROUTE일 때만 그 세션 데이터를 이
  // 화면 것으로 인정한다(영상 도움 화면의 isSearchSession/isPlaySession과 동일한
  // 원칙).
  const isVoiceMapSession = intent === 'MAP_ROUTE'
  // 목적지만 말한 경우(예: "아들 집 가는 길 알려줘") 서버가 출발지를 되묻는 단계.
  const isAskOrigin = isVoiceMapSession && voiceStep === 'ASK_ORIGIN'

  const [startName, setStartName] = useState('')
  const [goalName, setGoalName] = useState('')
  const [startError, setStartError] = useState('')
  const [goalError, setGoalError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [canRetry, setCanRetry] = useState(false)
  const [voicePrefillNotice, setVoicePrefillNotice] = useState('')

  // 화면 흐름 자체를 나타내는 상태. 'input'일 땐 입력 폼(또는 ASK_ORIGIN 확인
  // 카드)이, 'executing'일 땐 로딩 문구 화면이 보인다. 음성 스토어의 step(ASK_
  // ORIGIN/DONE 등)과 이름이 겹치지 않도록 이 로컬 상태는 stage로 부른다.
  const [stage, setStage] = useState('input')

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

  const clearErrors = useCallback(() => {
    setStartError('')
    setGoalError('')
    setGeneralError('')
    setCanRetry(false)
  }, [])

  // 음성 인식 결과를 이 화면의 입력값으로 채운다. 두 가지 경로로 들어온다:
  //  1) HomeScreen 등에서 처음 "서울역에서 부산역까지" 라고 말해 이 화면으로
  //     막 이동해온 경우 — navigate(state)로 최신 slots/data/transcript가 온다.
  //  2) 이미 이 화면에 있는 상태로 대화가 이어지는 경우(ASK_ORIGIN에 답하는 등)
  //     — location.state는 그대로지만 voiceSessionStore 값이 바뀐다.
  // 그래서 location.state와 스토어 값을 모두 의존성에 넣고, location.state가
  // 있으면 그걸 우선한다(방금 도착한 새 응답이 스토어보다 더 최신일 수 있어서).
  //
  // voiceRouteFailed: useVoiceAssistant 훅이 GEOCODE_NOT_FOUND 등으로 이 화면에
  // "강제 이동"시킨 경우(사용자 확인 — 명세서 2-2장) 표시하는 별도 안내. 이땐
  // 자동 실행 대신 수동 입력을 유도해야 하므로 프리필 안내 문구도 다르게 보여준다.
  useEffect(() => {
    const voiceState = location.state ?? {}

    if (voiceState.voiceRouteFailed) {
      const { startName: spokenStart, goalName: spokenGoal } = resolveMapAutofill({
        slots: voiceState.slots,
        data: null,
        transcript: voiceState.transcript,
      })
      if (spokenStart) setStartName((current) => current || spokenStart)
      if (spokenGoal) setGoalName((current) => current || spokenGoal)
      // 사용자 확인(2026-08): 일부만 인식된 경우 그 값은 살려두고, "위치를 찾지
      // 못했다"는 안내를 기존 음성 프리필 배너와 같은 스타일로 보여준다.
      setVoicePrefillNotice('위치를 찾지 못했어요. 직접 입력해 주세요.')
      return
    }

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

  // 음성으로 출발지·목적지가 이미 확정된 경우(step: DONE) 자동 실행.
  // 서버가 DONE 응답에 naverMapAppUrl/naverMapWebUrl을 이미 조립해서 내려주므로
  // (명세서 1-1장), 수동 입력 흐름과 달리 routesApi.getNaverMapLink를 다시 부를
  // 필요가 없다 — 이 앱은 그 값을 그대로 딥링크 실행에만 쓴다. 실제 딥링크 실행 +
  // 중복 실행 방지는 useVoiceAutoLaunch로 뺐다(내 주변 병원·약국 찾기 화면과
  // 공유 — hooks/useVoiceAutoLaunch.js 참고).
  useVoiceAutoLaunch({
    isActive: isVoiceMapSession && voiceStep === 'DONE',
    appUrl: voiceData?.naverMapAppUrl,
    webUrl: voiceData?.naverMapWebUrl,
    onLaunch: () => {
      // 입력창도 함께 채워둔다 — 화면 흐름상 "실행" 단계로 곧장 넘어가지만, 사용자가
      // 뒤로가기로 "입력" 단계에 돌아왔을 때 값이 비어있지 않게 하기 위함이다.
      const { startName: autoStart, goalName: autoGoal } = resolveMapAutofill({
        slots: voiceSlots,
        data: voiceData,
        transcript: voiceTranscript,
      })
      if (autoStart) setStartName((current) => current || autoStart)
      if (autoGoal) setGoalName((current) => current || autoGoal)

      clearErrors()
      setStage('executing')
      // ttsText 음성 안내는 useVoiceAssistant().applyResponse가 모든 응답에 대해
      // 이미 자동으로 재생한다 — 여기서 또 speak를 부르면 같은 문구가 중복 재생된다
      // (수동 제출 흐름은 voice/process를 안 타서 자체적으로 speak를 부르는 것과의
      // 차이점).
    },
  })

  // 실제 검증+실행을 담당하는 핵심 함수(수동 입력 전용). "네이버 지도 열기"(최초
  // 제출)와 "다시 시도"(재시도) 둘 다 이 함수를 그대로 재사용한다.
  const executeSearch = useCallback(async () => {
    const trimmedStart = startName.trim()
    const trimmedGoal = goalName.trim()

    clearErrors()
    setStage('executing')

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

      // 딥링크를 연 뒤에도 화면은 실행 화면에 그대로 남아있는다(사용자 확인).
      // 화면에서 벗어나고 싶으면 사용자가 상단 뒤로가기를 직접 눌러야 한다.
    } catch (error) {
      if (!isMountedRef.current) return

      // 검증 실패(또는 그 외 실패) 시 사용자 확인: 실행 화면에 머무르지 않고
      // 입력 단계로 자동 복귀해서, 문제가 된 입력창 바로 아래에 에러를 보여준다
      // (예전과 동일한 표시 위치 — 화면만 다시 입력 단계로 돌아왔을 뿐).
      setStage('input')

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
  }, [startName, goalName, speak, clearErrors])

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

  // 상단 뒤로가기 목적지는 현재 단계에 따라 달라진다(사용자 확인). 실행
  // 화면(네이버 지도를 이미 열었을 수도, 아직 응답을 기다리는 중일 수도 있는
  // 상태)에서는 홈으로 바로 나가지 않고 입력 단계로 돌아와 다시 검색할 수
  // 있게 한다. ASK_ORIGIN 확인 카드에서는 그 대화 자체를 접고(resetSession)
  // 평소의 수동 입력 폼으로 돌아간다 — 입력 단계에서는 기존과 동일하게 홈으로
  // 나간다.
  const handleBack = () => {
    if (stage === 'executing') {
      setStage('input')
      return
    }
    if (isAskOrigin) {
      resetSession()
      return
    }
    navigate('/home')
  }

  const displayMode = stage === 'executing' ? 'executing' : isAskOrigin ? 'ask-origin' : 'input'

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="길 찾기" onBack={handleBack} />
        <ProgressStrip labels={STEP_LABELS} current={displayMode === 'executing' ? 2 : 1} />

        {displayMode === 'executing' ? (
          <ExecutingPanel label="실행하는 중" description="네이버 지도에서 경로를 확인하고 있어요." />
        ) : displayMode === 'ask-origin' ? (
          // 목적지만 말한 경우 서버가 출발지를 되묻는 확인 카드. "네"/"아니요"를
          // 이 화면에서 직접 분기하지 않고, 버튼의 value를 그대로 /voice/process에
          // 다시 보내 다음 응답(추가 질문이든 DONE이든)에 맡긴다 — 영상 도움
          // 화면의 quickReplies 처리와 동일한 원칙.
          <AskOriginPanel
            headline={ttsCaption || '지금 계신 곳에서 출발할까요?'}
            quickReplies={voiceQuickReplies}
            onReply={(value) => sendText(value)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <section className="px-5 pb-4 pt-5">
              <h1 className="text-[30px] font-extrabold leading-[1.06] tracking-[-0.08em]">
                어디에서 어디로
                <br />
                가시나요?
              </h1>
            </section>

            <section className="control-form-screen__body flex-1 px-5 py-4">
              {/* 이미 /map 화면에 있는 상태로 음성 대화가 실패한 경우(예: ASK_ORIGIN에
                  답한 뒤 위치를 못 찾음) — useVoiceAssistant의 outcome/ttsCaption을
                  그대로 보여준다. 다른 화면으로 강제 이동해야 하는 경우는 훅에서
                  이미 처리되므로(위 주석 참고) 이 화면에 남아있는 경우만 여기서 다룬다. */}
              {outcome === 'error' && ttsCaption ? (
                <p role="alert" className="control-notice mb-4">
                  {ttsCaption}
                </p>
              ) : null}
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

// ASK_ORIGIN 확인 카드. 영상 도움 화면의 VideoConfirmPanel과 달리 썸네일 미리보기가
// 없어 훨씬 단순하다 — 안내 문구 + quickReplies 버튼만 있으면 된다. quickReplies의
// 정확한 value 문자열이 아직 명세서에 리터럴로 나와있지 않아(프로즈 설명만 있음)
// 특정 값("네"처럼)을 가정해 분기하지 않고, 첫 번째 항목을 주 버튼(primary)으로,
// 나머지를 보조 버튼으로 그린다 — 서버가 준 순서를 그대로 신뢰한다.
function AskOriginPanel({ headline, quickReplies, onReply }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end px-5 py-6">
      <p className="text-[22px] font-extrabold leading-[1.35] tracking-[-0.04em]">{headline}</p>
      <div className="mt-6 flex flex-col gap-2">
        {(quickReplies ?? []).map((reply, index) => (
          <SeniorButton
            key={reply.value}
            type="button"
            variant={index === 0 ? 'primary' : 'secondary'}
            onClick={() => onReply(reply.value)}
          >
            {reply.label}
          </SeniorButton>
        ))}
      </div>
    </div>
  )
}

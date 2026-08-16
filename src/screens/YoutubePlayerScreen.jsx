/** Design reminder — same board language as MapRouteScreen: input, then a persistent launch state. */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { MobileHeader } from '../components/common/MobileHeader'
import { SeniorButton } from '../components/ui/SeniorButton'
import { SeniorInput } from '../components/ui/SeniorInput'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 점(.) 하나가 늘어나는 간격(ms). 길찾기 실행 화면(MapRouteScreen.jsx)과 같은
// 값을 재사용한다(사용자 확인 — "로딩 UI는 길찾기와 동일한 패턴 재사용").
const LOADING_DOT_INTERVAL_MS = 500

// "영상 도움" 신규 구현. API 명세서 v2.0 3장(YOUTUBE_PLAY) + 2장(공통 진입점)
// 기준으로, 텍스트 입력도 음성과 완전히 같은 파이프라인(POST /voice/process)을
// 탄다 — 그래서 이 화면은 새 API를 만들지 않고 기존 useVoiceAssistant().sendText
// 를 그대로 재사용한다. 별도의 "영상 후보 목록" API/화면은 명세서에 없다: 서버가
// 영상 하나를 특정하면 CONFIRM(미리보기+확인), 특정하지 못하면 곧장 DONE으로
// 유튜브 검색결과 페이지 자체를 앱/웹으로 열어준다 — 어느 쪽이든 실제 영상
// 목록은 우리 화면이 아니라 유튜브 쪽에서 보여준다(명세서 1장 "인앱 재생 아님"
// 원칙과 동일).
export function YoutubePlayerScreen() {
  const navigate = useNavigate()
  const { status, sendText } = useVoiceAssistant()
  const intent = useVoiceSessionStore((state) => state.intent)
  const step = useVoiceSessionStore((state) => state.step)
  const data = useVoiceSessionStore((state) => state.data)
  const quickReplies = useVoiceSessionStore((state) => state.quickReplies)
  const resetSession = useVoiceSessionStore((state) => state.resetSession)

  const [keyword, setKeyword] = useState('')

  // 화면에 보여줄 상태를 매번 다시 계산한다(별도 로컬 step state를 두지 않음).
  // voiceSessionStore는 앱 전역 스토어라 다른 화면(길찾기/기차예매)에서 마지막에
  // 남긴 값이 남아있을 수 있다 — intent가 'YOUTUBE_PLAY'일 때만 그 세션 데이터를
  // 이 화면 것으로 인정한다.
  const isMySession = intent === 'YOUTUBE_PLAY'
  const mode = status === 'processing'
    ? 'loading'
    : isMySession && step === 'CONFIRM' && data
      ? 'confirm'
      : isMySession && step === 'DONE' && data
        ? 'done'
        : 'input'

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = keyword.trim()
    if (!trimmed) return
    // 자유 발화 기준으로 의도를 분류하는 서버에 맞춰, 입력한 키워드를 자연스러운
    // 문장으로 감싸서 보낸다(TrainBookingScreen.jsx가 목적지 입력을 감싸는 것과
    // 같은 이유 — 키워드 원문 그대로 보내는 것보다 의도 분류가 잘 된다).
    sendText(`${trimmed} 영상 보여줘`)
  }

  // 상단 뒤로가기: 아직 아무것도 검색 안 한 입력 화면에서는 홈으로 나간다.
  // 검색/미리보기/실행 화면에서는 홈으로 바로 나가지 않고 이 화면의 입력
  // 단계로 돌아와 다시 검색할 수 있게 한다(길찾기 화면과 동일한 방식 —
  // MapRouteScreen.jsx의 handleBack 참고).
  const handleBack = () => {
    if (mode === 'input') {
      navigate('/home')
      return
    }
    resetSession()
    setKeyword('')
  }

  // CONFIRM에서 "네, 열어줘"를 눌러 DONE이 된 순간 딥링크를 연다. 같은 app_url로
  // 여러 번 실행되지 않도록(리렌더마다 다시 열리는 것 방지) ref로 마지막 실행
  // 주소를 기억해둔다. 길찾기 화면과 동일하게, 링크를 연 뒤에도 화면은 자동으로
  // 어디로도 이동하지 않고 이 실행 화면에 그대로 남는다.
  const launchedAppUrlRef = useRef(null)
  useEffect(() => {
    if (mode !== 'done') return
    const appUrl = data?.app_url
    if (!appUrl || launchedAppUrlRef.current === appUrl) return
    launchedAppUrlRef.current = appUrl
    openDeepLinkWithWebFallback(appUrl, data?.web_url)
  }, [mode, data])

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="영상 도움" onBack={handleBack} />

        {mode === 'loading' || mode === 'done' ? (
          <ExecutingPanel label={mode === 'done' ? '유튜브를 여는 중' : '검색하는 중'} />
        ) : mode === 'confirm' ? (
          <ConfirmPanel data={data} quickReplies={quickReplies} onReply={(value) => sendText(value)} />
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <section className="px-5 pb-4 pt-5">
              <h1 className="text-[30px] font-extrabold leading-[1.06] tracking-[-0.08em]">
                어떤 영상을
                <br />
                보고 싶으세요?
              </h1>
            </section>

            <section className="control-form-screen__body flex-1 px-5 py-4">
              <div className="control-number-field">
                <span>01</span>
                <SeniorInput
                  id="video-keyword"
                  label="찾고 싶은 영상"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="예: 트로트, 요리, 건강 체조"
                />
              </div>
            </section>

            <footer className="control-form-screen__action shrink-0 px-5 py-4">
              <button
                type="submit"
                disabled={!keyword.trim()}
                className="control-button control-button--primary flex min-h-14 w-full items-center justify-center gap-3 text-[18px] font-extrabold text-white disabled:opacity-45"
              >
                실행하기
              </button>
            </footer>
          </form>
        )}
      </main>
    </AppFrame>
  )
}

// 길찾기 실행 화면(MapRouteScreen.jsx의 ExecutingPanel)과 완전히 같은 방식의
// 점(.) 반복 애니메이션 — 검색을 기다리는 동안(loading)과 유튜브를 연 뒤에도
// 계속 이 화면에 머무는 동안(done) 둘 다에 재사용한다. label만 다르게 받는다.
function ExecutingPanel({ label }) {
  const [dotCount, setDotCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((previous) => (previous + 1) % 4)
    }, LOADING_DOT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5">
      <p className="relative text-[24px] font-extrabold tracking-[-0.04em]">
        <span className="invisible" aria-hidden="true">
          {label}...
        </span>
        <span className="absolute left-0 top-0">
          {label}
          {'.'.repeat(dotCount)}
        </span>
      </p>
      <p className="mt-4 text-[15px] font-medium leading-6 text-[var(--cb-slate)]">
        잠시만 기다려 주세요.
      </p>
    </div>
  )
}

// CONFIRM 단계 — 서버가 특정한 영상 미리보기(제목/썸네일/채널명) + quickReplies.
// 명세서 10-1장대로, 버튼을 누르면 그 버튼의 value를 그대로 /voice/process에
// 다시 보낸다(onReply prop) — "네"/"아니요" 각각을 이 화면에서 직접 분기하지
// 않고 서버 응답에 맡긴다.
function ConfirmPanel({ data, quickReplies, onReply }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
      <p className="text-[15px] font-medium leading-6 text-[var(--cb-slate)]">이 영상이 맞나요?</p>

      <div className="mt-3 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--cb-line)' }}>
        {data.thumbnailUrl ? (
          <img src={data.thumbnailUrl} alt={data.title ?? '영상 미리보기'} className="w-full object-cover" />
        ) : null}
        <div className="p-4">
          <p className="text-[19px] font-extrabold leading-6 tracking-[-0.04em]">{data.title}</p>
          {data.channelName ? (
            <p className="mt-1 text-[14px] font-medium text-[var(--cb-slate)]">{data.channelName}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {(quickReplies ?? []).map((reply) => (
          <SeniorButton
            key={reply.value}
            type="button"
            variant={reply.value === '네' ? 'primary' : 'secondary'}
            onClick={() => onReply(reply.value)}
          >
            {reply.label}
          </SeniorButton>
        ))}
      </div>
    </div>
  )
}

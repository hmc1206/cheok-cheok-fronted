/** Design reminder — a calm blue mobile home with a single helpful voice action. */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { MicIcon } from '../components/common/icons'
import { useHistoryStore } from '../store/historyStore'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useMicrophoneLevel } from '../hooks/useMicrophoneLevel'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// "도움 기록"은 더 이상 홈 화면 드로어가 아니라 설정 화면(SettingsScreen.jsx)
// 안의 한 섹션이라, 여기 바로가기 그리드에서는 뺐다(요청사항: "도움기록 기능을
// 설정 안으로 넣고") — 5개로 줄어서 "1개 기능 더보기"로 문구도 같이 바뀐다.
//
// "말로 질문"(발화 없이 그냥 마이크만 켜던 항목)을 "오늘의 날씨"로 교체했다
// (요청사항). 다른 항목들과 마찬가지로 path만 있으면 된다 — 예전엔 이 항목만
// 예외로 여기서 GPS+요청을 먼저 끝내고 성공해야 이동하는 구조였는데, "영상
// 도움 버튼처럼 클릭 즉시 전용 페이지로 이동해야 한다"는 사용자 확인에 따라
// 다른 기능들과 동일하게 "먼저 이동 -> 그 페이지 안에서 처리"로 바꿨다
// (WeatherScreen.jsx가 진입 즉시 GPS+요청을 스스로 시작한다).
const NAV_ITEMS = [
  { id: 'map', label: '길 찾기', sub: '목적지까지 편하게', path: '/map', Icon: MapIcon },
  // 기차 예매(TRAIN_BOOKING, 제출 로직 없는 미완성 스텁이었음)를 대체한 신규
  // 기능. git 히스토리에 옛 항목이 남아있어 복원이 필요하면 그쪽을 참고.
  { id: 'nearby-place', label: '내 주변 병원·약국', sub: '가까운 곳 바로 찾기', path: '/nearby-place', Icon: NearbyPlaceIcon },
  { id: 'kiosk', label: '키오스크', sub: '화면을 보며 따라하기', path: '/kiosk', Icon: KioskIcon },
  { id: 'youtube', label: '영상 도움', sub: '보고 싶은 영상 찾기', path: '/youtube', Icon: YoutubeIcon },
  { id: 'weather', label: '오늘의 날씨', sub: '기온과 강수 확률 보기', path: '/weather', Icon: WeatherIcon },
]

export function HomeScreen() {
  const navigate = useNavigate()
  const { status, sttCaption, ttsCaption, outcome, startListening, cancelListening, sendText } = useVoiceAssistant()
  const microphoneLevel = useMicrophoneLevel(status === 'listening')
  const addHistoryEntry = useHistoryStore((state) => state.addEntry)
  const resetSession = useVoiceSessionStore((state) => state.resetSession)
  const [isTranscriptEditing, setIsTranscriptEditing] = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const isTranscribing = status === 'listening' || status === 'processing'
  const showTranscriptSurface = isTranscribing || isTranscriptEditing
  const isVoiceSuccess = status === 'idle' && outcome === 'success' && Boolean(ttsCaption)
  const voiceTitle = status === 'listening' ? '말씀을 듣고 있어요' : status === 'processing' ? '내용을 확인하고 있어요' : '말로 도움 요청하기'
  const voiceCaption = status === 'listening'
    ? sttCaption || '필요한 일을 편하게 말씀해 주세요.'
    : status === 'processing'
      ? sttCaption || '알맞은 도움을 찾고 있어요.'
      : ttsCaption || '말씀으로 도움을 요청하세요.'
  const transcriptHeadline = sttCaption || (status === 'listening' ? '말씀하시는 내용을 받아쓰고 있어요.' : '말씀하신 내용을 확인하고 있어요.')

  const handleVoiceRequest = () => {
    setIsTranscriptEditing(false)
    setTranscriptDraft('')
    startListening()
  }
  const handleTranscriptEdit = () => {
    const draft = sttCaption || transcriptDraft
    if (isTranscribing) cancelListening()
    setTranscriptDraft(draft)
    setIsTranscriptEditing(true)
  }
  const handleTranscriptCancel = () => {
    cancelListening()
    setTranscriptDraft('')
    setIsTranscriptEditing(false)
  }
  const handleTranscriptSubmit = () => {
    const text = transcriptDraft.trim()
    if (!text) return
    setIsTranscriptEditing(false)
    sendText(text)
  }
  const handleFeatureSelect = (item) => {
    if (item.id === 'weather') {
      // 이전에 확인했던 날씨 결과(음성으로 물어봤던 것이든, 예전에 이 타일을
      // 눌렀던 것이든)가 voiceSessionStore에 남아있으면, 그 오래된 결과를 그대로
      // 보여주지 않고 매번 새로 조회하도록 여기서 세션을 비운다 — WeatherScreen
      // 은 "이미 결과가 있으면 재요청하지 않는다"고 판단하므로, 재진입 때마다
      // 새로 확인하려면 진입 전에 비워야 한다.
      resetSession()
    }
    navigate(item.path)
  }
  const visibleItems = isMoreOpen ? NAV_ITEMS : NAV_ITEMS.slice(0, 4)

  const latestSttCaptionRef = useRef(sttCaption)
  latestSttCaptionRef.current = sttCaption
  useEffect(() => {
    if (!ttsCaption) return
    addHistoryEntry({
      id: Date.now(), createdAt: new Date().toISOString(), question: latestSttCaptionRef.current, answer: ttsCaption, outcome,
    })
  }, [ttsCaption, outcome, addHistoryEntry])

  return (
    <AppFrame>
      <main className={`salad-home salad-home--reference flex h-full min-h-0 flex-col ${isMoreOpen ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <header className="salad-home__nav flex h-[64px] shrink-0 items-center justify-between px-5">
          {/* 요청사항: 로고 아이콘 이미지를 완전히 삭제하고 "척척" 텍스트만
              남긴다. 아이콘+텍스트를 감싸던 flex/gap 래퍼(아이콘과의 간격
              용도)도 함께 걷어냈다 — 아이콘이 있던 자리(px-5 왼쪽 여백)에
              텍스트가 그대로 자연스럽게 붙도록, 남은 요소 하나만 별도 래퍼
              없이 header에 바로 둔다. 폰트/굵기/색상은 기존 값 그대로 유지. */}
          <span className="text-[18px] font-bold tracking-[-0.04em]">척척</span>
          {/* 설정 화면 진입점(=햄버거 아이콘). "도움 기록"이 설정 화면 안으로
              옮겨가면서(요청사항) 이 버튼 하나가 설정+도움 기록+구독 신청까지
              전부 아우르는 메뉴 진입점이 됐다 — 그래서 아이콘도 기존 톱니바퀴
              대신 더 널리 "메뉴"로 통하는 햄버거(줄 세 개) 모양으로 바꿨다.
              여전히 별도 드로어를 열지 않고 /settings로 바로 이동한다(그
              화면 자체가 이제 이 메뉴 역할을 한다). */}
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label="메뉴"
            className="flex h-9 w-9 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182f6]"
          >
            <HamburgerIcon />
          </button>
        </header>

        <section className={`salad-home__content flex flex-col px-5 pb-5 pt-4 ${isMoreOpen ? 'min-h-[calc(100%-64px)] flex-none' : 'min-h-0 flex-1'}`}>
          <AnimatePresence mode="wait" initial={!reducedMotion}>
            {showTranscriptSurface ? (
              <motion.div
                key="transcript"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="salad-home__intro salad-home__intro--transcript"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold">{isTranscriptEditing ? '내용 수정' : '말씀하신 내용'}</p>
                  {isTranscribing ? <button type="button" onClick={handleTranscriptCancel} className="text-[14px] font-bold">취소</button> : null}
                </div>
                {isTranscriptEditing ? (
                  <textarea autoFocus value={transcriptDraft} onChange={(event) => setTranscriptDraft(event.target.value)} aria-label="받아쓴 음성 문장 수정" className="mt-2 w-full resize-none bg-transparent text-[22px] font-bold leading-8 tracking-[-0.055em] outline-none" />
                ) : (
                  <button type="button" onClick={handleTranscriptEdit} className="mt-2 w-full text-left text-[22px] font-bold leading-8 tracking-[-0.055em]">{transcriptHeadline}</button>
                )}
                <div className="mt-2 flex justify-between gap-3">
                  {isTranscriptEditing ? (
                    <button type="button" onClick={handleTranscriptSubmit} disabled={!transcriptDraft.trim()} className="salad-home__text-submit ml-auto min-h-10 px-4 text-[14px] font-bold text-white disabled:opacity-40">보내기</button>
                  ) : <p className="text-[14px] font-medium">문장을 누르면 직접 수정할 수 있어요.</p>}
                </div>
              </motion.div>
            ) : (
              <motion.section
                key="greeting"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="salad-home__greeting"
              >
                <p>안녕하세요</p>
                <h1>오늘 필요한 일을<br />도와드릴게요.</h1>
              </motion.section>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={handleVoiceRequest}
            disabled={status === 'processing'}
            data-state={status}
            data-success={isVoiceSuccess ? 'true' : 'false'}
            whileTap={reducedMotion || status === 'processing' ? undefined : { scale: 0.985 }}
            className="salad-home__voice salad-home__voice--reference relative mt-4 flex shrink-0 items-center overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182f6]"
            style={{ '--voice-level': microphoneLevel }}
          >
            <div className="relative z-10">
              <p className="text-[21px] font-bold tracking-[-0.055em]">{voiceTitle}</p>
              <p className="mt-2 text-[15px] font-medium leading-6">{voiceCaption}</p>
            </div>
            <span className="salad-home__mic salad-home__mic--reference relative z-10 ml-auto flex shrink-0 items-center justify-center rounded-full text-white">
              <span className="salad-home__audio-ring" aria-hidden="true" />
              <MicIcon size={38} />
            </span>
          </motion.button>

          <div className="mt-5 flex shrink-0 items-center justify-between">
            <p className="text-[16px] font-bold tracking-[-0.045em]">원하는 도움을 골라보세요</p>
            <span className="text-[13px] font-medium">5가지 기능</span>
          </div>

          <nav className={`salad-home__services salad-home__services--reference mt-3 grid grid-cols-2 gap-3 ${isMoreOpen ? 'salad-home__services--expanded shrink-0' : 'min-h-0 flex-1'}`} aria-label="주요 기능">
            {visibleItems.map((item, index) => (
              <motion.button
                type="button"
                key={item.id}
                onClick={() => handleFeatureSelect(item)}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                initial={isMoreOpen && index >= 4 && !reducedMotion ? { opacity: 0, y: 22 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: isMoreOpen && index >= 4 ? (index - 4) * 0.08 : 0, ease: [0.23, 1, 0.32, 1] }}
                className="salad-home__service salad-home__service--reference flex min-h-0 flex-col items-start justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182f6] disabled:opacity-60"
              >
                <span className="salad-home__service-icon flex items-center justify-center"><item.Icon /></span>
                <span>
                  <span className="block text-[18px] font-bold tracking-[-0.055em]">{item.label}</span>
                  <span className="mt-1 block text-[13px] font-medium leading-5">{item.sub}</span>
                </span>
              </motion.button>
            ))}
          </nav>
          <button
            type="button"
            aria-expanded={isMoreOpen}
            onClick={() => setIsMoreOpen((value) => !value)}
            className="salad-home__more-button mt-2 flex h-9 shrink-0 w-full items-center justify-center gap-1 text-[14px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182f6]"
          >
            <span>{isMoreOpen ? '접기' : '1개 기능 더보기'}</span>
            <span aria-hidden="true">{isMoreOpen ? '⌃' : '⌄'}</span>
          </button>
        </section>
      </main>
    </AppFrame>
  )
}

function MapIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 20 3.6 17.7A1 1 0 0 1 3 16.8V5.2a1 1 0 0 1 1.4-.9L9 6.5m0 13.5 6-3m-6 3v-13.5m6 13.5 4.6 2.3a1 1 0 0 0 1.4-.9V6.8a1 1 0 0 0-.6-.9L15 3.5m0 13.5v-13.5m0 0L9 6.5" /></svg> }
function NearbyPlaceIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z" /><path d="M12 7v5M9.5 9.5h5" /></svg> }
function KioskIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="18" rx="2" /><rect x="8.5" y="5.5" width="7" height="6" rx="0.5" /><path d="M9 17h6" /></svg> }
function YoutubeIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></svg> }
function WeatherIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9.5" cy="8.5" r="3" /><path d="M9.5 3v1.4M5.9 5l1 1M4.4 8.5h1.4" /><path d="M10 19h7.5a3.3 3.3 0 0 0 .3-6.6 4.7 4.7 0 0 0-9-1.5A3.8 3.8 0 0 0 10 19Z" /></svg> }
function HamburgerIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg> }

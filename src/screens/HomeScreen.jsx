/** Design reminder — a calm blue mobile home with a single helpful voice action. */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { MicIcon } from '../components/common/icons'
import { SidePanel } from '../components/home/SidePanel'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useMicrophoneLevel } from '../hooks/useMicrophoneLevel'

const NAV_ITEMS = [
  { id: 'map', label: '길 찾기', sub: '목적지까지 편하게', path: '/map', Icon: MapIcon },
  { id: 'train', label: '기차 예매', sub: '출발과 도착 확인', path: '/train', Icon: TrainIcon },
  { id: 'kiosk', label: '키오스크', sub: '화면을 보며 따라하기', path: '/kiosk', Icon: KioskIcon },
  { id: 'youtube', label: '영상 도움', sub: '보고 싶은 영상 찾기', path: '/youtube', Icon: YoutubeIcon },
  { id: 'history', label: '도움 기록', sub: '이전 질문 다시 보기', Icon: HistoryIcon },
  { id: 'voice', label: '말로 질문', sub: '바로 음성으로 물어보기', Icon: VoiceIcon },
]

export function HomeScreen() {
  const navigate = useNavigate()
  const { status, sttCaption, ttsCaption, outcome, startListening, cancelListening, sendText } = useVoiceAssistant()
  const microphoneLevel = useMicrophoneLevel(status === 'listening')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [history, setHistory] = useState([])
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
    if (item.id === 'history') {
      setIsDrawerOpen(true)
      return
    }
    if (item.id === 'voice') {
      handleVoiceRequest()
      return
    }
    navigate(item.path)
  }
  const visibleItems = isMoreOpen ? NAV_ITEMS : NAV_ITEMS.slice(0, 4)

  const latestSttCaptionRef = useRef(sttCaption)
  latestSttCaptionRef.current = sttCaption
  useEffect(() => {
    if (!ttsCaption) return
    setHistory((previous) => [...previous, {
      id: Date.now(), createdAt: new Date().toISOString(), question: latestSttCaptionRef.current, answer: ttsCaption, outcome,
    }])
  }, [ttsCaption, outcome])

  return (
    <AppFrame>
      <main className={`salad-home salad-home--reference flex h-full min-h-0 flex-col ${isMoreOpen ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <header className="salad-home__nav flex h-[64px] shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="salad-home__mark flex h-8 w-8 items-center justify-center rounded-[10px]">
              <img src="/manus-storage/cheok-logo-mark_977663d4.png" alt="" className="h-5 w-5" />
            </span>
            <span className="text-[18px] font-bold tracking-[-0.04em]">척척</span>
          </div>
          <div className="flex items-center gap-3">
            {/* 설정 화면 진입점. 이 디자인(B안)에는 예전 햄버거 메뉴가 없어져서
                (SidePanel.jsx는 이제 "도움 기록" 전용 드로어), 요구사항 문서가
                요구한 "설정"/"월 구독 신청" 두 개의 별도 진입점 중 설정은 여기
                작은 아이콘 버튼으로 새로 만들었다. 구독 신청은 이 좁은 헤더에
                아이콘을 더 넣으면 복잡해 보여서, 대신 설정 화면 맨 위에 배너
                형태로 넣었다(SettingsScreen.jsx 참고) — 홈에서 2탭이면 닿는다. */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              aria-label="설정"
              className="flex h-9 w-9 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182f6]"
            >
              <SettingsIcon />
            </button>
            <button type="button" onClick={() => setIsDrawerOpen(true)} className="min-h-12 text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182f6]">
              도움 기록
            </button>
          </div>
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
            <span className="text-[13px] font-medium">6가지 기능</span>
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
                className="salad-home__service salad-home__service--reference flex min-h-0 flex-col items-start justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182f6]"
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
            <span>{isMoreOpen ? '접기' : '2개 기능 더보기'}</span>
            <span aria-hidden="true">{isMoreOpen ? '⌃' : '⌄'}</span>
          </button>
        </section>

        <SidePanel isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} history={history} />
      </main>
    </AppFrame>
  )
}

function MapIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 20 3.6 17.7A1 1 0 0 1 3 16.8V5.2a1 1 0 0 1 1.4-.9L9 6.5m0 13.5 6-3m-6 3v-13.5m6 13.5 4.6 2.3a1 1 0 0 0 1.4-.9V6.8a1 1 0 0 0-.6-.9L15 3.5m0 13.5v-13.5m0 0L9 6.5" /></svg> }
function TrainIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="12" rx="4" /><path d="M5 11h14M9 19l-2 3M15 19l2 3M9.5 7h.01M14.5 7h.01" /></svg> }
function KioskIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="18" rx="2" /><rect x="8.5" y="5.5" width="7" height="6" rx="0.5" /><path d="M9 17h6" /></svg> }
function YoutubeIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></svg> }
function HistoryIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3.3 2" /></svg> }
function VoiceIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="3" /><path d="M8 9h8M8 13h5M17.5 16.5v-3M16 15h3a1.5 1.5 0 1 1-3 0Z" /></svg> }
function SettingsIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg> }

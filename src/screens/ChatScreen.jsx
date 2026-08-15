import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { ChatBubble } from '../components/chat/ChatBubble'
import { HamburgerMenuButton } from '../components/common/HamburgerMenuButton'
import { WaveformIcon, MicIcon } from '../components/common/icons'
import { SidePanel } from '../components/home/SidePanel'
import { useSTT } from '../hooks/useSTT'

// 홈 화면 "눌러서 말하기" 카드에서 진입하는 음성 채팅 페이지. 레이아웃은 첨부받은
// ChatGPT 앱 스크린샷을 참고했지만, 로고/브랜드 텍스트는 전혀 가져오지 않고
// 우리 앱의 디자인 토큰(색/폰트/간격)만 사용한다.
//
// 음성 인식은 다른 화면들이 쓰는 useVoiceAssistant(내부적으로 /voice/process
// 백엔드까지 호출)가 아니라, 더 저수준인 useSTT(브라우저 음성 인식/녹음만 담당)를
// 쓴다. 요구사항 5가 "백엔드 AI 응답 API가 아직 연결 안 됨, 임의로 가짜 응답을
// 채우지 말 것"이라, 이 페이지는 텍스트를 "받아쓰기"만 하고 실제 AI 응답 호출은
// 전혀 하지 않는다 — 나중에 답변 API가 정해지면 handleSend의 TODO 자리에서
// 이어붙이면 된다.
export function ChatScreen() {
  const navigate = useNavigate()
  const { start, stop, isListening } = useSTT()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const messagesEndRef = useRef(null)

  // 사용자 메시지를 목록에 추가한다. setMessages/setInputValue는 React가 항상
  // 같은 함수를 보장하는 setState라 useCallback 의존성 배열을 비워도 안전하고,
  // 그 덕분에 아래 자동 음성인식 effect가 "마운트 시 한 번만" 실행되도록 유지된다.
  const handleSend = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: trimmed }])
    setInputValue('')
    // TODO: 백엔드 연결 후 실제 응답 처리. 여기서 AI 응답 API를 호출해서
    // { id, role: 'assistant', text: ... } 형태로 setMessages에 추가하면 된다.
    // 지금은 백엔드가 없어서 임의로 가짜 응답 텍스트를 채우지 않는다(요구사항 5).
  }, [])

  // 페이지 진입 시 자동으로 음성 인식을 시작한다(요구사항 3) — 홈 화면에서 이미
  // "눌러서 말하기"를 누르고 들어왔으므로, 여기서 마이크 버튼을 또 누르게 하지
  // 않는다. 인식된 텍스트가 있으면 바로 채팅으로 전송한다.
  useEffect(() => {
    let cancelled = false

    start()
      .then((result) => {
        if (cancelled) return
        if (result.text) {
          // 인식된 텍스트를 입력값에 채워 화면에 잠깐 보여준 뒤 바로 전송한다.
          // handleSend는 인자로 받은 text를 직접 쓰므로, setInputValue의
          // 비동기 반영을 기다릴 필요 없이 같은 값을 그대로 넘긴다.
          setInputValue(result.text)
          handleSend(result.text)
        }
        // result.audio(Web Speech API 미지원 브라우저의 MediaRecorder 폴백)인
        // 경우는 바로 쓸 텍스트가 없다 — 사용자가 직접 타이핑하거나 아래 마이크
        // 아이콘을 다시 눌러 재시도할 수 있다.
      })
      .catch(() => {
        // 권한 거부/인식 실패 등 — 조용히 무시하고 사용자가 직접 타이핑하거나
        // 마이크 아이콘으로 재시도할 수 있게 둔다.
      })

    return () => {
      cancelled = true
      stop()
    }
  }, [start, stop, handleSend])

  // 새 메시지가 추가될 때마다 목록 맨 아래로 자동 스크롤(요구사항 4).
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (event) => {
    event.preventDefault()
    handleSend(inputValue)
  }

  // 마이크/파형 아이콘 재사용 버튼: 듣는 중이면 눌러서 취소(stop), 아니면 다시
  // 듣기 시작(start) — 자동 시작이 실패했거나 사용자가 다시 말하고 싶을 때 쓴다.
  const handleMicToggle = () => {
    if (isListening) {
      stop()
    } else {
      start().then((result) => {
        if (result.text) {
          setInputValue(result.text)
          handleSend(result.text)
        }
      })
    }
  }

  return (
    <AppFrame>
      <main
        className="relative flex h-full flex-col"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* 상단 바: 왼쪽 햄버거(홈 화면과 동일한 공용 컴포넌트 + SidePanel 재사용),
            오른쪽은 참고 이미지엔 아이콘이 있지만 이 프로젝트엔 대응 기능이 없어
            TODO로 남기고 비활성 처리한다(요구사항 1). */}
        <HamburgerMenuButton onClick={() => setIsDrawerOpen(true)} />
        {/* 햄버거 버튼 바로 아래에 홈으로 돌아가는 "<" 버튼. 이 채팅 페이지는 홈
            화면 마이크 버튼에서만 들어오는 흐름이라, 브라우저 뒤로가기 없이도
            바로 홈으로 돌아갈 수 있는 경로가 필요해서 추가했다. 햄버거와 같은
            절제된 톤(배경 없음, 44px 최소 터치 영역)으로 스타일을 맞췄다. */}
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="홈으로 돌아가기"
          className="absolute left-4 top-14 z-20 flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: 'var(--color-text)',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        {/* TODO: 참고 이미지의 우측 상단 아이콘(예: 새 대화 시작 등)에 대응하는
            기능이 아직 정해지지 않아 disabled로만 자리를 잡아둔다. */}
        <button
          type="button"
          disabled
          aria-hidden="true"
          className="absolute right-4 top-4 z-20 flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            background: 'transparent',
            border: 'none',
            color: 'var(--color-gray-light)',
            cursor: 'default',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        {/* 채팅 메시지 목록 (요구사항 4: 위→아래로 쌓이고, 최신이 아래, 자동 스크롤).
            pt를 16(햄버거만 있을 때)에서 28로 늘렸다 — 햄버거 아래 뒤로가기 버튼이
            top-14(56px)+44px 높이까지 차지해서, 이전 값(64px)으로는 메시지 목록
            상단이 그 버튼과 겹쳤다. */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-28">
          {messages.length === 0 && (
            <p
              className="mt-10 text-center"
              style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}
            >
              듣고 있어요. 편하게 말씀해주세요.
            </p>
          )}
          {messages.map((message) => (
            <ChatBubble key={message.id} role={message.role} text={message.text} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 하단 입력바 (요구사항 2): "+" - 텍스트 입력 - 마이크/파형 아이콘.
            "+"는 참고 이미지 구조를 맞추려고 둔 자리지만 이 프로젝트엔 대응 기능
            (첨부파일 등)이 없어 TODO로 남기고 비활성 처리한다. */}
        <form onSubmit={handleSubmit} className="chat-input-bar">
          {/* TODO: 참고 이미지의 "+" 버튼(첨부/도구 메뉴 등)에 대응하는 기능이
              아직 없어 disabled로만 자리를 잡아둔다. */}
          <button type="button" disabled aria-hidden="true" className="chat-input-icon-button">
            +
          </button>

          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="무엇이든 물어보세요"
            aria-label="메시지 입력"
            className="chat-input-field"
          />

          {/* 마이크+파형 아이콘: 듣는 중일 때 색이 강조되고 파형이 펄스 애니메이션으로
              "듣고 있는 중"을 시각적으로 표시한다(요구사항 3). */}
          <button
            type="button"
            onClick={handleMicToggle}
            aria-label={isListening ? '음성 인식 중지' : '음성 인식 시작'}
            aria-pressed={isListening}
            className="chat-input-icon-button"
            data-listening={isListening}
          >
            <MicIcon size={20} />
            <span className={isListening ? 'chat-waveform-pulse' : ''}>
              <WaveformIcon size={20} />
            </span>
          </button>
        </form>

        <SidePanel isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} history={[]} />
      </main>
    </AppFrame>
  )
}

import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

// 로그인 이후 진입하는 메인 화면 (기획서 4-1장).
// 중앙 마이크 버튼은 음성 AI 비서 진입점, 하단 3+1개 버튼은 음성 없이 바로 이동하는 지름길.
export function HomeScreen() {
  const navigate = useNavigate()
  const { status, sttCaption, ttsCaption, startListening } = useVoiceAssistant()

  return (
    // AppFrame이 393x852로 고정하므로, 여기서는 실제 뷰포트 높이(min-h-dvh) 대신
    // 프레임이 준 100%(h-full)를 채운다 — min-h-dvh를 쓰면 화면 실제 높이 기준으로
    // 계산돼 852px 프레임 안에서 넘치거나 어긋난다.
    <AppFrame>
      <main className="flex flex-col items-center justify-between h-full p-6">
        <section className="flex flex-1 flex-col items-center justify-center gap-4">
          <VoiceButton status={status} onPress={startListening} />
          <p style={{ fontSize: 'var(--font-size-base)' }}>마이크를 눌러 말씀해주세요</p>
        </section>

        <nav className="grid grid-cols-1 gap-3 w-full max-w-sm pb-24">
          <button type="button" className="quick-action-button" onClick={() => navigate('/map')}>
            길 찾기
          </button>
          <button type="button" className="quick-action-button" onClick={() => navigate('/train')}>
            기차 예매
          </button>
          <button type="button" className="quick-action-button" onClick={() => navigate('/kiosk')}>
            키오스크 도움
          </button>
        </nav>

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
      </main>
    </AppFrame>
  )
}

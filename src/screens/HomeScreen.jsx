import { useNavigate } from 'react-router-dom'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'

// 로그인 이후 진입하는 메인 화면 (기획서 4-1장).
// 중앙 마이크 버튼은 음성 AI 비서 진입점, 하단 3+1개 버튼은 음성 없이 바로 이동하는 지름길.
export function HomeScreen() {
  const navigate = useNavigate()
  const { status, sttCaption, ttsCaption, startListening } = useVoiceAssistant()

  return (
    <main className="flex flex-col items-center justify-between min-h-dvh p-6">
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
        {/* 실전 도움(/kiosk)과 헷갈리지 않도록 문구를 명확히 분리 */}
        <button
          type="button"
          className="quick-action-button"
          onClick={() => navigate('/kiosk/training')}
        >
          키오스크 연습하기
        </button>
      </nav>

      <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
    </main>
  )
}

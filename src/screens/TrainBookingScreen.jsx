import { useState } from 'react'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// TODO: 코레일톡 딥링크 URL 스킴은 백엔드/기획 확정 전이라 아직 비어있다. 확정되면 교체.
const KORAIL_TALK_DEEPLINK = 'TODO: 코레일톡 딥링크 URL'

// 기차 예매 화면 (기획서 4-3장).
// 상태머신(ASK_DEPARTURE → ASK_DATE → ASK_TIME → CONFIRM → DONE)은 백엔드 응답의 step으로
// 그대로 따라가고, 프론트는 매 step마다 음성/텍스트 응답을 다시 /voice/process로 보낸다.
export function TrainBookingScreen() {
  const { status, sttCaption, ttsCaption, startListening, sendText } = useVoiceAssistant()
  const step = useVoiceSessionStore((state) => state.step)
  const data = useVoiceSessionStore((state) => state.data)
  const [textInput, setTextInput] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!textInput.trim()) return
    sendText(textInput.trim())
    setTextInput('')
  }

  return (
    <main className="flex flex-col gap-4 p-6 pb-40">
      <h1 style={{ fontSize: 'var(--font-size-xl)' }}>기차 예매</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>현재 단계: {step ?? 'ASK_DEPARTURE'}</p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={textInput}
          onChange={(event) => setTextInput(event.target.value)}
          className="flex-1 border rounded p-2"
          style={{ fontSize: 'var(--font-size-base)', borderColor: 'var(--color-border)' }}
        />
        <button type="submit" className="quick-action-button">
          전송
        </button>
      </form>

      {/* ASSUMPTION: 후보 열차 카드에 표시할 필드명(trainName/departureTime/arrivalTime)은
          명세서에 정확히 없어 임의로 지정했다. 실제 응답 스키마 확정 시 맞춰야 한다. */}
      {step === 'CONFIRM' && Array.isArray(data?.candidates) && (
        <ul className="flex flex-col gap-2">
          {data.candidates.map((train, index) => (
            <li
              key={train.trainId ?? index}
              className="border rounded p-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p>{train.trainName ?? '열차'}</p>
              <p>
                {train.departureTime} → {train.arrivalTime}
              </p>
            </li>
          ))}
          <li>
            {/* ASSUMPTION: 하이브리드 예매 방식(지난 논의 반영) — mock DONE 응답을 최종 완료
                화면으로 쓰지 않고, 코레일톡 앱 딥링크로 연결하는 버튼을 둔다. */}
            <button
              type="button"
              className="quick-action-button w-full"
              onClick={() => window.open(KORAIL_TALK_DEEPLINK, '_blank')}
            >
              코레일톡에서 예매하기
            </button>
          </li>
        </ul>
      )}

      {step === 'DONE' && (
        // ASSUMPTION: DONE 응답은 데모/mock 화면 전환 확인용으로만 쓴다.
        // 실서비스 전환 시 위 코레일톡 딥링크 방식으로 완전히 대체할 예정.
        <p>(데모) 예매가 완료되었습니다.</p>
      )}

      <div className="flex justify-center">
        <VoiceButton status={status} onPress={startListening} />
      </div>

      <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
    </main>
  )
}

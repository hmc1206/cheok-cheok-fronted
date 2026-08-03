import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 길찾기 화면 (기획서 4-2장).
export function MapRouteScreen() {
  const routerLocation = useLocation()
  const { status: geoStatus, requestLocation } = useGeolocation()
  const { status, sttCaption, ttsCaption, startListening, sendText } = useVoiceAssistant()
  const step = useVoiceSessionStore((state) => state.step)
  const screen = useVoiceSessionStore((state) => state.screen)
  const data = useVoiceSessionStore((state) => state.data) ?? routerLocation.state?.data

  const [destinationInput, setDestinationInput] = useState('')
  const [originAutoAnswered, setOriginAutoAnswered] = useState(false)

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    // API 명세서 3장: /voice/process는 origin 좌표를 받는 파라미터가 따로 없다.
    // 목적지를 먼저 말한 뒤 서버가 step: ASK_ORIGIN으로 "지금 계신 곳에서 출발할까요?"를
    // 물어오면, 위치 권한이 이미 있으니 사용자가 대답할 필요 없이 "네"로 자동 응답해
    // 질문을 건너뛴 것처럼 만든다. 권한 거부/실패 시에는 그대로 두어 사용자가 직접 답한다.
    if (geoStatus === 'granted' && step === 'ASK_ORIGIN' && !originAutoAnswered) {
      setOriginAutoAnswered(true)
      sendText('네')
    }
  }, [geoStatus, step, originAutoAnswered, sendText])

  const handleSubmitDestination = (event) => {
    event.preventDefault()
    if (!destinationInput.trim()) return
    setOriginAutoAnswered(false) // 새 목적지 검색 시 ASK_ORIGIN 자동응답을 다시 허용
    sendText(destinationInput.trim())
    setDestinationInput('')
  }

  return (
    <main className="flex flex-col gap-4 p-6 pb-40">
      <h1 style={{ fontSize: 'var(--font-size-xl)' }}>길 찾기</h1>

      <form onSubmit={handleSubmitDestination} className="flex gap-2">
        <input
          value={destinationInput}
          onChange={(event) => setDestinationInput(event.target.value)}
          placeholder="어디로 가시나요?"
          className="flex-1 border rounded p-2"
          style={{ fontSize: 'var(--font-size-base)', borderColor: 'var(--color-border)' }}
        />
        <button type="submit" className="quick-action-button">
          전송
        </button>
      </form>

      {screen === 'MAP_NOT_FOUND' && <p>경로를 찾지 못했어요. 다시 말씀해주세요.</p>}

      {screen === 'MAP_RESULT' && Array.isArray(data?.steps) && (
        <>
          <p style={{ color: 'var(--color-text-muted)' }}>
            총 {data.durationMinutes}분 · 환승 {data.transferCount}회 · {data.totalFare}원
          </p>
          <ul className="flex flex-col gap-2">
            {data.steps.map((step, index) => (
              <li
                key={`${step.type}-${index}`}
                className="border rounded p-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="font-bold">{step.type}</span>
                <p>{step.desc}</p>
                {step.type === 'BUS' && step.boardingStop && <p>탑승: {step.boardingStop}</p>}
                {step.type === 'SUBWAY' && (
                  <p>
                    {step.line} · 탑승: {step.boardingStation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex justify-center">
        <VoiceButton status={status} onPress={startListening} />
      </div>

      <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
    </main>
  )
}

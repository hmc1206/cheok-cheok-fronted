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
  const { coords, status: geoStatus, requestLocation } = useGeolocation()
  const { status, sttCaption, ttsCaption, startListening, sendText } = useVoiceAssistant()
  const screen = useVoiceSessionStore((state) => state.screen)
  const data = useVoiceSessionStore((state) => state.data) ?? routerLocation.state?.data

  const [destinationInput, setDestinationInput] = useState('')
  const [originAutoAsked, setOriginAutoAsked] = useState(false)

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    // 권한 허용됨 → origin: 현재위치로 바로 호출해 ASK_ORIGIN 질문을 스킵한다.
    // 권한 거부/실패 시에는 아무것도 보내지 않아 기존 명세대로 ASK_ORIGIN 질문 흐름이 유지된다.
    if (geoStatus === 'granted' && coords && !originAutoAsked) {
      setOriginAutoAsked(true)
      sendText('내 위치에서 출발', { originCoords: coords })
    }
  }, [coords, geoStatus, originAutoAsked, sendText])

  const handleSubmitDestination = (event) => {
    event.preventDefault()
    if (!destinationInput.trim()) return
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

      {/* ASSUMPTION: 백엔드가 ODsay/TMAP 대중교통 API를 연동해 이 포맷(steps: [{type, description}])으로
          응답을 준다는 전제. 프론트는 결과를 WALK/BUS/SUBWAY 타입별 카드로 렌더링만 한다. */}
      {screen === 'MAP_RESULT' && Array.isArray(data?.steps) && (
        <ul className="flex flex-col gap-2">
          {data.steps.map((step, index) => (
            <li
              key={`${step.type}-${index}`}
              className="border rounded p-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="font-bold">{step.type}</span>
              <p>{step.description}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-center">
        <VoiceButton status={status} onPress={startListening} />
      </div>

      <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
    </main>
  )
}

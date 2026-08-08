import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { NaverMap } from '../components/map/NaverMap'
import { useGeolocation } from '../hooks/useGeolocation'
import { useTTS } from '../hooks/useTTS'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// TODO(4단계 - 백엔드 연동 대기): 실제 경로 좌표(path)/턴바이턴 안내(guides)를 주는
// 백엔드 엔드포인트 스펙이 아직 없어서, 지도 SDK 연결과 마커/경로선 렌더링만 먼저
// 확인할 수 있도록 서울시청→강남역 더미 좌표를 하드코딩해뒀다. 실제 스펙이 정해지면
// 이 상수들을 지우고 data(steps 응답 또는 별도 directions API 응답)로 교체해야 한다.
const DUMMY_ORIGIN = { lat: 37.5666805, lng: 126.9784147 } // 서울시청 (임시)
const DUMMY_DESTINATION = { lat: 37.497942, lng: 127.027621 } // 강남역 (임시)
const DUMMY_ROUTE_PATH = [DUMMY_ORIGIN, { lat: 37.53, lng: 127.0 }, DUMMY_DESTINATION]
// TODO(4단계 완료 후): guides[0]로 교체.
const DUMMY_FIRST_GUIDE = '임시 안내입니다. 서울시청에서 출발해서 강남역으로 이동해요.'

// 길찾기 화면 (기획서 4-2장).
export function MapRouteScreen() {
  const routerLocation = useLocation()
  const { status: geoStatus, requestLocation } = useGeolocation()
  const { status, sttCaption, ttsCaption, startListening, sendText } = useVoiceAssistant()
  const { speak } = useTTS()
  const step = useVoiceSessionStore((state) => state.step)
  const screen = useVoiceSessionStore((state) => state.screen)
  const data = useVoiceSessionStore((state) => state.data) ?? routerLocation.state?.data

  const [destinationInput, setDestinationInput] = useState('')
  const [originAutoAnswered, setOriginAutoAnswered] = useState(false)

  // 지도 SDK 로드 실패 등은 useVoiceAssistant의 대화 흐름과 무관하므로, NaverMap이
  // onError로 알려주면 여기서 별도로 TTS 안내한다 (어르신 UX: 화면을 못 봐도 음성으로 인지).
  const handleMapError = useCallback(() => {
    speak('지도를 불러오지 못했어요.')
  }, [speak])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  // 6단계: 경로 안내가 준비되면(지금은 더미 데이터라 마운트 시점) 첫 안내를 TTS로 읽는다.
  // TODO(4단계 완료 후): 이 useEffect의 트리거를 "실제 MAP_RESULT 응답 도착"으로 바꾸고,
  // 그때는 useVoiceAssistant가 이미 읽고 있는 대화형 ttsText와 겹치지 않게 순서를 조정해야 한다.
  useEffect(() => {
    speak(DUMMY_FIRST_GUIDE) // 더미 단계라 의도적으로 마운트 시 1회만 읽는다.
  }, [speak])

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
    <AppFrame>
      {/* AppFrame이 높이를 852px로 고정하므로, 지도+폼+결과 목록이 그 안에서
          넘칠 수 있다. h-full로 프레임을 꽉 채우고 overflow-y-auto로 스크롤되게
          해서(clip 아님) 내용이 잘려 안 보이는 일이 없게 한다. */}
      <main className="flex h-full flex-col gap-4 overflow-y-auto p-6 pb-40">
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>길 찾기</h1>

        {/* 어르신 UX: 턴바이턴 안내는 화면 상단에 큰 글씨로 고정 배치.
            TODO(4단계 완료 후): DUMMY_FIRST_GUIDE 대신 실제 guides[0] 문구로 교체. */}
        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>{DUMMY_FIRST_GUIDE}</p>

        {/* 2~3단계 확인용: 실제 경로 데이터가 없어 더미 좌표로 지도/마커/경로선만 먼저 그린다. */}
        <NaverMap
          origin={DUMMY_ORIGIN}
          destination={DUMMY_DESTINATION}
          routePath={DUMMY_ROUTE_PATH}
          onError={handleMapError}
        />

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
              {data.steps.map((routeStep, index) => (
                <li
                  key={`${routeStep.type}-${index}`}
                  className="border rounded p-3"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {/* 백엔드 현재 구현 상태 확인 결과: 원래 API 명세서 예시엔 desc였지만
                      실제 응답 필드는 description이라고 확인됨. */}
                  <span className="font-bold">{routeStep.type}</span>
                  <p>{routeStep.description}</p>
                  {routeStep.type === 'BUS' && routeStep.boardingStop && (
                    <p>탑승: {routeStep.boardingStop}</p>
                  )}
                  {routeStep.type === 'SUBWAY' && (
                    <p>
                      {routeStep.line} · 탑승: {routeStep.boardingStation}
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
    </AppFrame>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { geocodeAddress } from '../api/geocoding'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import trainStations from '../data/trainStations.json'
import { useGeolocation } from '../hooks/useGeolocation'
import { useTTS } from '../hooks/useTTS'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { findNearestStation } from '../lib/nearestStation'
import { openNaverMapRoute } from '../lib/naverMapDeepLink'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 기차 예매 화면 (기획서 4-3장).
// 상태머신(ASK_DEPARTURE → ASK_DATE → ASK_TIME → CONFIRM → DONE)은 백엔드 응답의 step으로
// 그대로 따라가고, 프론트는 매 step마다 음성/텍스트 응답을 다시 /voice/process로 보낸다.
export function TrainBookingScreen() {
  const { status, sttCaption, ttsCaption, startListening, sendText } = useVoiceAssistant()
  const { speak } = useTTS()
  const { coords: currentCoords, requestLocation } = useGeolocation()
  const step = useVoiceSessionStore((state) => state.step)
  const data = useVoiceSessionStore((state) => state.data)
  const slots = useVoiceSessionStore((state) => state.slots)
  const [textInput, setTextInput] = useState('')
  const [isOpeningRoute, setIsOpeningRoute] = useState(false)
  const [routeAnnouncement, setRouteAnnouncement] = useState('')

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  const announce = useCallback(
    (message) => {
      setRouteAnnouncement(message) // 어르신 UX: 화면에도 큰 글씨로 동시 노출
      speak(message)
    },
    [speak],
  )

  // 하이브리드 예매 방식(지난 논의 반영): 실제 예매(결제)는 이 앱에서 하지 않고,
  // 현재 위치~가장 가까운 역, 목적지 지명~가장 가까운 역을 찾아 네이버 지도 앱의
  // 대중교통 경로 검색으로 넘긴다(코레일톡 딥링크 자리를 대체).
  const handleOpenNaverMapRoute = useCallback(async () => {
    setIsOpeningRoute(true)
    try {
      if (!currentCoords) {
        announce('위치를 확인하고 있어요. 위치 권한을 허용해주세요.')
        return
      }

      const originStation = findNearestStation(currentCoords, trainStations)
      if (!originStation) {
        // TODO: trainStations.json이 실제 데이터로 채워지면 이 분기는 사라진다.
        announce('아직 역 데이터가 준비되지 않았어요.')
        return
      }

      // TODO(geocoding API 확정 필요): geocodeAddress가 스텁이라 여기서 예외가 난다.
      const destinationCoord = await geocodeAddress(slots.arrival)
      const destinationStation = findNearestStation(destinationCoord, trainStations)
      if (!destinationStation) {
        announce('도착지 근처 역을 찾지 못했어요.')
        return
      }

      announce(
        `지금부터 네이버 지도에서 ${originStation.name}역부터 ${destinationStation.name}역까지 경로를 열어드릴게요.`,
      )
      openNaverMapRoute(
        { name: originStation.name, lat: originStation.lat, lng: originStation.lng },
        { name: destinationStation.name, lat: destinationStation.lat, lng: destinationStation.lng },
      )
    } catch (error) {
      console.error('[네이버 지도 경로 안내] 실패:', error)
      announce('경로를 여는 데 실패했어요.')
    } finally {
      setIsOpeningRoute(false)
    }
  }, [announce, currentCoords, slots.arrival])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!textInput.trim()) return
    sendText(textInput.trim())
    setTextInput('')
  }

  return (
    <AppFrame>
      {/* AppFrame이 높이를 852px로 고정하므로, 대화 내역+후보 목록이 넘칠 수 있다.
          h-full + overflow-y-auto로 잘리지 않고 스크롤되게 한다. */}
      <main className="flex h-full flex-col gap-4 overflow-y-auto p-6 pb-40">
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

        {/* API 명세서 4장: candidates[]는 trainNo/departTime/arriveTime/price/seatAvailable를 준다. */}
        {step === 'CONFIRM' && Array.isArray(data?.candidates) && (
          <ul className="flex flex-col gap-2">
            {data.candidates.map((train) => (
              <li
                key={train.trainNo}
                className="border rounded p-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p>{train.trainNo}</p>
                <p>
                  {train.departTime} → {train.arriveTime}
                </p>
                <p>
                  {train.price?.toLocaleString()}원 · {train.seatAvailable ? '예약 가능' : '매진'}
                </p>
              </li>
            ))}
            <li>
              {/* ASSUMPTION: 하이브리드 예매 방식(지난 논의 반영) — mock DONE 응답을 최종 완료
                  화면으로 쓰지 않고, 가까운 역을 찾아 네이버 지도 대중교통 경로로 연결하는
                  버튼을 둔다. 실제 예매(결제)는 사용자가 네이버 지도 앱에서 진행한다. */}
              <button
                type="button"
                className="quick-action-button w-full"
                onClick={handleOpenNaverMapRoute}
                disabled={isOpeningRoute}
              >
                네이버 지도에서 경로 보기
              </button>
              {/* 어르신 UX: 딥링크 실행 전 안내를 큰 글씨로 고정 배치 (동시에 TTS도 재생됨) */}
              {routeAnnouncement && (
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>
                  {routeAnnouncement}
                </p>
              )}
            </li>
          </ul>
        )}

        {step === 'DONE' && data && (
          // ASSUMPTION: DONE 응답은 데모/mock 화면 전환 확인용으로만 쓴다.
          // 실서비스 전환 시 위 네이버 지도 딥링크 방식으로 완전히 대체할 예정.
          <div className="border rounded p-3" style={{ borderColor: 'var(--color-border)' }}>
            <p>(데모) 예매가 완료되었습니다.</p>
            <p>
              {data.departStation} → {data.arriveStation} · {data.trainNo}
            </p>
            <p>
              {data.departTime} → {data.arriveTime} · {data.seat}
            </p>
            <p>예약번호: {data.reservationId}</p>
          </div>
        )}

        <div className="flex justify-center">
          <VoiceButton status={status} onPress={startListening} />
        </div>

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
      </main>
    </AppFrame>
  )
}

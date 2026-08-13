import { useCallback, useEffect, useRef, useState } from 'react'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 기차 예매 화면 (API 명세서 v2.0 5장). 시간표 조회·결제는 우리 서비스가 하지
// 않는다 — 도착 도시를 말하면 서버가 가장 가까운 기차역으로 자동 매핑하고,
// 출발지를 한 번 더 확인(ASK_ORIGIN)한 뒤, 그 역까지 가는 길을 네이버 지도
// 딥링크로 열어주는 것까지만 담당한다(지도 기능과 동일한 흐름/데이터 모양).
export function TrainBookingScreen() {
  const step = useVoiceSessionStore((state) => state.step)
  const data = useVoiceSessionStore((state) => state.data)
  const quickReplies = useVoiceSessionStore((state) => state.quickReplies)
  const { sttCaption, ttsCaption, sendText } = useVoiceAssistant()
  const [destination, setDestination] = useState('')

  const launchedAppUrlRef = useRef(null)

  useEffect(() => {
    if (step !== 'DONE' || !data?.naverMapAppUrl) return
    if (launchedAppUrlRef.current === data.naverMapAppUrl) return
    launchedAppUrlRef.current = data.naverMapAppUrl
    openDeepLinkWithWebFallback(data.naverMapAppUrl, data.naverMapWebUrl)
  }, [step, data])

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if (!destination.trim()) return
      // /voice/process는 자유 발화 기준으로 의도를 분류하므로, 타이핑된 도시명을
      // 예시 문장(API 명세서 v2.0 5장)과 같은 형태의 문장으로 감싸서 보낸다.
      sendText(`${destination.trim()} 가는 기차표 끊어줘`)
    },
    [destination, sendText],
  )

  const isAwaitingOrigin = step && step !== 'DONE'

  return (
    <AppFrame>
      <main className="flex h-full flex-col gap-4 p-6">
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>기차 예매</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          가시는 도시나 기차역을 알려주시면, 그 역까지 가는 길을 지도로 열어드려요.
          시간표 확인과 예매는 지도 안에서 직접 진행하시면 돼요.
        </p>

        {!step && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span style={{ fontSize: 'var(--font-size-base)' }}>가시는 곳</span>
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="예: 부산"
                className="border p-2"
                style={{
                  fontSize: 'var(--font-size-base)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-base)',
                }}
              />
            </label>
            <button type="submit" className="quick-action-button">
              기차역 찾기
            </button>
          </form>
        )}

        {isAwaitingOrigin && (
          <div
            className="flex flex-col gap-3 border p-3"
            style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-base)' }}
          >
            <div className="grid grid-cols-2 gap-2">
              {(quickReplies ?? []).map((reply) => (
                <button
                  key={reply.value}
                  type="button"
                  className="quick-action-button"
                  onClick={() => sendText(reply.value)}
                >
                  {reply.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'DONE' && data && (
          <p style={{ fontSize: 'var(--font-size-lg)' }}>
            {data.resolvedGoal?.name ?? '역'}까지 가는 길을 지도에서 열고 있어요...
          </p>
        )}

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
      </main>
    </AppFrame>
  )
}

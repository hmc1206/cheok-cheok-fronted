import { useEffect, useRef } from 'react'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 음성 AI가 YOUTUBE_PLAY로 라우팅했을 때 진입하는 화면 (API 명세서 v2.0 3장).
// 우리 앱이 영상을 재생하지 않는다 — 유튜브 앱(미설치 시 웹)으로 바로 이동시키는
// 화면이라, 인앱 플레이어/재생 컨트롤은 없고 "CONFIRM(미리보기+확인) -> DONE(실행)"
// 두 단계만 그린다.
export function YoutubePlayerScreen() {
  const step = useVoiceSessionStore((state) => state.step)
  const data = useVoiceSessionStore((state) => state.data)
  const quickReplies = useVoiceSessionStore((state) => state.quickReplies)
  const { status, sttCaption, ttsCaption, startListening, sendText } = useVoiceAssistant()

  // DONE 응답을 받을 때마다 한 번만 실행되게, 마지막으로 실행한 app_url을 기억해둔다
  // (같은 렌더가 여러 번 일어나도 딥링크를 중복 실행하지 않기 위함).
  const launchedAppUrlRef = useRef(null)

  useEffect(() => {
    if (step !== 'DONE' || !data?.app_url) return
    if (launchedAppUrlRef.current === data.app_url) return
    launchedAppUrlRef.current = data.app_url
    openDeepLinkWithWebFallback(data.app_url, data.web_url)
  }, [step, data])

  return (
    <AppFrame>
      <main className="flex h-full flex-col gap-4 p-6">
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>유튜브</h1>

        {step === 'CONFIRM' && data && (
          <div
            className="flex flex-col gap-3 border p-3"
            style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-base)' }}
          >
            {data.thumbnailUrl && (
              <img
                src={data.thumbnailUrl}
                alt={data.title ?? '영상 미리보기'}
                className="w-full rounded"
                style={{ borderRadius: 'var(--radius-base)' }}
              />
            )}
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{data.title}</p>
            {data.channelName && (
              <p style={{ color: 'var(--color-text-muted)' }}>{data.channelName}</p>
            )}

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
          <p style={{ fontSize: 'var(--font-size-lg)' }}>유튜브를 열고 있어요...</p>
        )}

        {step !== 'CONFIRM' && step !== 'DONE' && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            마이크 버튼을 누르고 보고 싶은 영상을 말씀해주세요.
          </p>
        )}

        {/* 유튜브 앱 실행 이후의 재생/일시정지 등 인앱 제어는 서버가 관여하지 않는다
            (API 명세서 v2.0 3장) — 대신 "다른 영상 찾기"용 마이크는 계속 열어둔다. */}
        <div className="flex justify-center">
          <VoiceButton status={status} onPress={startListening} />
        </div>

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
      </main>
    </AppFrame>
  )
}

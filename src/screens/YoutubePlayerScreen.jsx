import { useLocation } from 'react-router-dom'
import { youtubeApi } from '../api/youtubeApi'
import { AppFrame } from '../components/common/AppFrame'
import { CaptionOverlay } from '../components/common/CaptionOverlay'
import { VoiceButton } from '../components/common/VoiceButton'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { useAuthStore } from '../store/authStore'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// 음성 AI가 YOUTUBE_PLAY로 라우팅했을 때 진입하는 화면 (기획서 4-6장).
export function YoutubePlayerScreen() {
  const routerLocation = useLocation()
  const data = useVoiceSessionStore((state) => state.data) ?? routerLocation.state?.data
  const step = useVoiceSessionStore((state) => state.step)
  const userId = useAuthStore((state) => state.userId)
  const { status, sttCaption, ttsCaption, startListening } = useVoiceAssistant()

  const handleControl = (action) => {
    youtubeApi.control({ userId, action })
  }

  if (step === 'NOT_FOUND') {
    return (
      <AppFrame>
        <main className="h-full p-6">
          <h1 style={{ fontSize: 'var(--font-size-xl)' }}>유튜브</h1>
          <p>영상을 찾지 못했어요. 다시 말씀해주세요.</p>
        </main>
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      {/* AppFrame이 높이를 852px로 고정하므로, 영상+컨트롤이 넘칠 수 있다.
          h-full + overflow-y-auto로 잘리지 않고 스크롤되게 한다. */}
      <main className="flex h-full flex-col gap-4 overflow-y-auto p-6 pb-40">
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>{data?.title ?? '유튜브'}</h1>

        {/* ASSUMPTION: 실제 플레이어 라이브러리(react-youtube 등)는 아직 붙이지 않고,
            videoId를 받는 자리(iframe placeholder)만 컴포넌트 인터페이스로 만들어둔다. */}
        <div className="w-full aspect-video" style={{ background: 'var(--color-surface)' }}>
          {data?.videoId ? (
            <iframe
              title={data.title ?? 'youtube video'}
              src={`https://www.youtube.com/embed/${data.videoId}`}
              className="w-full h-full"
              allow="autoplay"
            />
          ) : (
            <p>재생할 영상이 없습니다.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="quick-action-button"
            onClick={() => handleControl('PAUSE')}
          >
            일시정지
          </button>
          <button
            type="button"
            className="quick-action-button"
            onClick={() => handleControl('RESUME')}
          >
            다시재생
          </button>
          <button
            type="button"
            className="quick-action-button"
            onClick={() => handleControl('NEXT')}
          >
            다음영상
          </button>
          <button
            type="button"
            className="quick-action-button"
            onClick={() => handleControl('VOLUME_UP')}
          >
            소리크게
          </button>
          <button
            type="button"
            className="quick-action-button"
            onClick={() => handleControl('VOLUME_DOWN')}
          >
            소리작게
          </button>
        </div>

        {/* 발화("일시정지해줘" 등)가 계속 들어올 수 있도록 마이크 버튼은 이 화면에서도 유지 */}
        <div className="flex justify-center">
          <VoiceButton status={status} onPress={startListening} />
        </div>

        <CaptionOverlay sttCaption={sttCaption} ttsCaption={ttsCaption} />
      </main>
    </AppFrame>
  )
}

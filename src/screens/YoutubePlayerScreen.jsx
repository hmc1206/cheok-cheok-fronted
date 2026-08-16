/** Design reminder — same board language as MapRouteScreen: quiet cards, one decisive action bar. */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { ExecutingPanel } from '../components/common/ExecutingPanel'
import { MobileHeader } from '../components/common/MobileHeader'
import { SeniorButton } from '../components/ui/SeniorButton'
import { SeniorInput } from '../components/ui/SeniorInput'
import { useVoiceAssistant } from '../hooks/useVoiceAssistant'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'
import { useVoiceSessionStore } from '../store/voiceSessionStore'

// "영상 도움"을 두 가지 방식으로 나눈다(후속 요청):
//  - 01 검색하기(YOUTUBE_SEARCH): 키워드 -> 목록(최대 10개) -> 사용자가 하나 선택 ->
//    확인(미리보기, 프론트에서 목록 항목으로 직접 구성) -> 유튜브로 이동
//  - 02 바로 실행하기(YOUTUBE_PLAY): 자연어 요청 -> 서버가 영상 하나를 특정해 확인
//    요청(step: CONFIRM) -> "네" 응답 -> 서버가 실행 정보로 재응답(step: DONE) ->
//    유튜브로 이동
// 두 흐름 모두 POST /voice/process 하나로 처리된다(공통 진입점 원칙, 기존 길찾기/
// 바로 실행하기와 동일) — 그래서 이 화면은 여전히 새 API를 만들지 않고
// useVoiceAssistant().sendText를 재사용한다. intent가 YOUTUBE_SEARCH냐
// YOUTUBE_PLAY냐로 화면 안에서 두 흐름을 나눈다.
//
// 화면 배치(사용자 확인 — 탭형 추천안): 상단에 "01 검색하기"/"02 바로 실행하기"
// 탭을 두고, 탭 전환은 화면 이동 없이 그 아래 콘텐츠만 바꾼다. 기존에 쓰던
// ProgressStrip(길찾기와 공유하던 "입력/실행" 2단계 표시)은 이 화면에서는 더 이상
// 쓰지 않는다 — 검색 흐름은 입력/목록/확인/실행 4단계라 2단계 지표로는 표현이
// 안 되고, 이 탭 자체가 상단 지표 역할을 겸한다. 탭은 ProgressStrip과 같은
// `.control-progress` 스타일(index.css)을 그대로 쓰되, div 대신 button으로 만들어
// 실제로 눌러서 전환할 수 있게 했다 — 새 시각 언어를 만들지 않고 기존 톤을 재사용.
const MODE_TABS = [
  { key: 'search', label: '검색하기' },
  { key: 'play', label: '바로 실행하기' },
]

export function YoutubePlayerScreen() {
  const navigate = useNavigate()
  const { status, sendText, ttsCaption } = useVoiceAssistant()
  const intent = useVoiceSessionStore((state) => state.intent)
  const step = useVoiceSessionStore((state) => state.step)
  const data = useVoiceSessionStore((state) => state.data)
  const quickReplies = useVoiceSessionStore((state) => state.quickReplies)
  const resetSession = useVoiceSessionStore((state) => state.resetSession)

  // 두 흐름이 각자 타이핑 중인 값을 잃지 않도록 입력값은 모드별로 따로 둔다
  // (탭을 오갈 때 이미 입력해둔 글자가 사라지지 않게 — 노인 사용자에게는 다시
  // 타이핑시키는 것 자체가 큰 부담이라는 세션 내 확립된 원칙).
  const [entryMode, setEntryMode] = useState('search')
  const [keyword, setKeyword] = useState('')
  const [playText, setPlayText] = useState('')

  // "01 검색하기" 전용 로컬 상태. 목록에서 고른 영상은 서버 응답이 아니라 이미
  // 받아둔 목록 항목을 그대로 쓰는 것이라(2-3장) 별도의 API 호출이 없다 — 그래서
  // voiceSessionStore가 아니라 이 화면의 로컬 state로 충분하다.
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [videoLaunched, setVideoLaunched] = useState(false)

  // voiceSessionStore는 앱 전역 스토어라 다른 화면(길찾기/기차예매)이나 반대쪽
  // 모드가 마지막에 남긴 값이 남아있을 수 있다 — intent가 지금 보고 있는 모드의
  // 것과 일치할 때만 그 세션 데이터를 인정한다.
  const isSearchSession = intent === 'YOUTUBE_SEARCH'
  const isPlaySession = intent === 'YOUTUBE_PLAY'

  // 화면에 보여줄 세부 상태를 매번 다시 계산한다(별도 로컬 step state 없이
  // entryMode + voiceSessionStore + 이 화면만의 로컬 상태 조합으로 결정).
  let mode
  if (status === 'processing') {
    mode = 'loading'
  } else if (entryMode === 'search') {
    if (selectedVideo) {
      mode = videoLaunched ? 'search-launched' : 'search-confirm'
    } else if (isSearchSession && step === 'CONFIRM' && Array.isArray(data)) {
      mode = 'search-list'
    } else {
      mode = 'search-input'
    }
  } else if (isPlaySession && step === 'CONFIRM' && data) {
    mode = 'play-confirm'
  } else if (isPlaySession && step === 'DONE' && data) {
    mode = 'play-done'
  } else {
    mode = 'play-input'
  }

  // 탭 전환: 반대쪽 모드의 진행 중이던 목록/확인/실행 상태를 들고 오지 않도록
  // voiceSessionStore와 검색 전용 로컬 상태를 함께 비운다. 입력창에 타이핑해둔
  // 글자(keyword/playText)는 그대로 남겨, 다시 이 탭으로 돌아왔을 때 이어 쓸 수
  // 있게 한다.
  const handleTabChange = (nextMode) => {
    if (nextMode === entryMode) return
    setEntryMode(nextMode)
    resetSession()
    setSelectedVideo(null)
    setVideoLaunched(false)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const trimmed = keyword.trim()
    if (!trimmed) return
    // 서버가 자유 발화 기준으로 의도를 분류하므로, 검색 의도(YOUTUBE_SEARCH)로
    // 분류되도록 "검색해줘" 문구로 감싼다. 다만 YOUTUBE_SEARCH는 이번에 신규로
    // 추가되는 intent라 이 문구가 실제로 서버에서 그렇게 분류되는지는 아직
        // 확정되지 않았다(작업 지시 5번: 미확정 시 명세서 응답 예시를 mock으로 먼저
    // 검증). 화면/파싱 로직은 명세서 JSON 예시 그대로 Playwright mock으로
    // 검증했고, 실제 연동 후 이 문구를 조정해야 한다면 이 한 줄만 고치면 된다.
    sendText(`${trimmed} 영상 검색해줘`)
  }

  const handlePlaySubmit = (event) => {
    event.preventDefault()
    const trimmed = playText.trim()
    if (!trimmed) return
    // "바로 실행하기"는 사용자가 이미 자연어 문장으로 원하는 영상을 지정하는
    // 경우라(명세서 예시: "미스트롯 틀어줘"), 검색하기처럼 문구를 덧붙이지 않고
    // 입력값을 그대로 보낸다.
    sendText(trimmed)
  }

  // 목록에서 영상을 선택하면 곧바로 확인 카드로 넘어간다 — 이미 받아둔 목록
  // 항목의 필드만 쓰므로 추가 API 호출이 없다.
  const handleSelectVideo = (video) => setSelectedVideo(video)

  // 검색 흐름의 "네, 열어줘": 선택한 영상의 videoId로 프론트가 직접 딥링크를
  // 조립한다(명세서 2-3장 템플릿 그대로) — 바로 실행하기와 달리 서버가 app_url/
  // web_url을 다시 내려주는 절차가 없다(서버 왕복 없이 목록 안에서 즉시 실행).
  const handleConfirmSelectedVideo = () => {
    if (!selectedVideo) return
    const appUrl = `vnd.youtube://www.youtube.com/watch?v=${selectedVideo.videoId}`
    const webUrl = `https://www.youtube.com/watch?v=${selectedVideo.videoId}`
    openDeepLinkWithWebFallback(appUrl, webUrl)
    setVideoLaunched(true)
  }

  // 검색 흐름의 "아니요": 다시 목록으로 돌아간다(명세서 2-3장).
  const handleRejectSelectedVideo = () => setSelectedVideo(null)

  // 바로 실행하기 흐름의 실행: CONFIRM에서 "네"를 보내 서버가 step: DONE으로
  // 재응답한 순간(명세서 3-2장) 딥링크를 연다 — 검색 흐름과 달리 서버가 다시
  // app_url/web_url을 내려주는 왕복이 있어야 한다. 같은 app_url로 리렌더마다
  // 다시 열리지 않도록(예: 다른 상태 변화로 인한 리렌더) ref로 마지막으로 실행한
  // 주소를 기억해둔다.
  const launchedAppUrlRef = useRef(null)
  useEffect(() => {
    if (mode !== 'play-done') return
    const appUrl = data?.app_url
    if (!appUrl || launchedAppUrlRef.current === appUrl) return
    launchedAppUrlRef.current = appUrl
    openDeepLinkWithWebFallback(appUrl, data?.web_url)
  }, [mode, data])

  // 상단 뒤로가기: 단계마다 "한 단계만" 되돌아가게 한다(길찾기 화면과 동일한
  // 원칙, 그리고 보호자 모니터링 화면에서 실제로 겪은 버그 — 화면을 건너뛰는
  // navigate 대신 그 단계 전용 상태 되돌리기를 쓴다).
  const handleBack = () => {
    if (mode === 'search-launched' || mode === 'search-confirm') {
      setSelectedVideo(null)
      setVideoLaunched(false)
      return
    }
    if (mode === 'search-list' || mode === 'play-confirm' || mode === 'play-done') {
      resetSession()
      return
    }
    if (mode === 'loading') {
      // 로딩 중 뒤로가기는 진행 중이던 요청 결과를 기다리지 않고 그 모드의
      // 입력 단계로 즉시 돌아간다. 이미 보낸 요청 자체를 취소하지는 않지만(다른
      // 화면들도 동일 — 이 프로젝트에 요청 취소 로직은 없음), 응답이 늦게
      // 와도 이 화면 로컬 상태(entryMode/selectedVideo)는 그대로라 다시 그
      // 모드의 목록/확인 화면으로 자연스럽게 전환될 뿐 화면이 깨지지는 않는다.
      resetSession()
      return
    }
    // search-input / play-input: 더 되돌아갈 단계가 없으므로 홈으로.
    navigate('/home')
  }

  return (
    <AppFrame>
      <main className="control-form-screen flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="영상 도움" onBack={handleBack} />
        <ModeTabStrip current={entryMode} onSelect={handleTabChange} />

        {mode === 'loading' ? (
          <ExecutingPanel
            label={entryMode === 'search' ? '검색하는 중' : '확인하는 중'}
            description="잠시만 기다려 주세요."
          />
        ) : mode === 'search-launched' || mode === 'play-done' ? (
          <ExecutingPanel label="유튜브를 여는 중" description="잠시만 기다려 주세요." />
        ) : mode === 'search-list' ? (
          <VideoList videos={data} onSelect={handleSelectVideo} />
        ) : mode === 'search-confirm' ? (
          <VideoConfirmPanel
            headline={ttsCaption || '이 영상이 맞나요?'}
            video={{
              title: selectedVideo.title,
              thumbnailUrl: selectedVideo.thumbnailUrl,
              // 검색 목록 항목은 channelTitle, 바로 실행하기 확인 데이터는
              // channelName — 명세서 JSON 예시에 실제로 필드명이 다르게 나와
              // 있어(2장 vs 3장), 공용 컴포넌트에는 정규화된 channel 하나로
              // 넘긴다. 실제 응답에서 필드명이 계속 이렇게 다르다면 그대로 두면
              // 되고, 통일된다면 이 매핑만 지우면 된다.
              channel: selectedVideo.channelTitle,
            }}
            actions={[
              { label: '네, 열어줘', variant: 'primary', onClick: handleConfirmSelectedVideo },
              { label: '아니요', variant: 'secondary', onClick: handleRejectSelectedVideo },
            ]}
          />
        ) : mode === 'play-confirm' ? (
          <VideoConfirmPanel
            headline={ttsCaption || '이 영상이 맞나요?'}
            video={{ title: data.title, thumbnailUrl: data.thumbnailUrl, channel: data.channelName }}
            // 명세서 10-1장대로, 버튼을 누르면 그 버튼의 value를 그대로
            // /voice/process에 다시 보낸다 — "네"/"아니요" 각각을 이 화면에서
            // 직접 분기하지 않고 서버 응답에 맡긴다(검색 흐름과 달리 여기는
            // 서버가 다음 단계를 결정하는 흐름이라 actions도 서버가 준
            // quickReplies를 그대로 매핑한다).
            actions={(quickReplies ?? []).map((reply) => ({
              label: reply.label,
              variant: reply.value === '네' ? 'primary' : 'secondary',
              onClick: () => sendText(reply.value),
            }))}
          />
        ) : entryMode === 'search' ? (
          <form onSubmit={handleSearchSubmit} className="flex min-h-0 flex-1 flex-col">
            <section className="px-5 pb-4 pt-5">
              <h1 className="text-[30px] font-extrabold leading-[1.06] tracking-[-0.08em]">
                어떤 영상을
                <br />
                찾아드릴까요?
              </h1>
            </section>

            <section className="control-form-screen__body flex-1 px-5 py-4">
              <div className="control-number-field">
                <span>01</span>
                <SeniorInput
                  id="video-keyword"
                  label="검색어"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="예: 트로트, 요리, 건강 체조"
                />
              </div>
            </section>

            <footer className="control-form-screen__action shrink-0 px-5 py-4">
              <button
                type="submit"
                disabled={!keyword.trim()}
                className="control-button control-button--primary flex min-h-14 w-full items-center justify-center gap-3 text-[18px] font-extrabold text-white disabled:opacity-45"
              >
                실행하기
              </button>
            </footer>
          </form>
        ) : (
          <form onSubmit={handlePlaySubmit} className="flex min-h-0 flex-1 flex-col">
            <section className="px-5 pb-4 pt-5">
              <h1 className="text-[30px] font-extrabold leading-[1.06] tracking-[-0.08em]">
                어떤 영상을
                <br />
                바로 볼까요?
              </h1>
            </section>

            <section className="control-form-screen__body flex-1 px-5 py-4">
              <div className="control-number-field">
                <span>02</span>
                <SeniorInput
                  id="video-play-text"
                  label="원하는 영상"
                  value={playText}
                  onChange={(event) => setPlayText(event.target.value)}
                  placeholder="예: 미스트롯 틀어줘"
                />
              </div>
            </section>

            <footer className="control-form-screen__action shrink-0 px-5 py-4">
              <button
                type="submit"
                disabled={!playText.trim()}
                className="control-button control-button--primary flex min-h-14 w-full items-center justify-center gap-3 text-[18px] font-extrabold text-white disabled:opacity-45"
              >
                실행하기
              </button>
            </footer>
          </form>
        )}
      </main>
    </AppFrame>
  )
}

// 상단 모드 탭. ProgressStrip(components/common/)과 같은 `.control-progress`
// 그리드 스타일을 그대로 쓰지만, 그쪽은 장식용 div이고 이쪽은 실제로 눌러서
// 모드를 바꾸는 button이라 별도 컴포넌트로 뒀다 — ProgressStrip을 억지로
// 클릭 가능하게 바꾸면 "진행 상태만 보여주는 용도"로 다른 화면(길찾기)에서
// 쓰던 의미가 흐려질 수 있어 분리했다.
function ModeTabStrip({ current, onSelect }) {
  return (
    <div className="control-progress grid grid-cols-2" role="tablist" aria-label="영상 도움 방식 선택">
      {MODE_TABS.map((tab, index) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === current}
          onClick={() => onSelect(tab.key)}
          className={tab.key === current ? 'is-current' : ''}
        >
          <span>0{index + 1}</span>
          <strong>{tab.label}</strong>
        </button>
      ))}
    </div>
  )
}

// "01 검색하기" 결과 목록. 세로 스크롤 카드 리스트 — AppFrame의 고정 프레임
// 레이아웃은 그대로 두고(바깥 구조를 건드리지 않음), 이 영역 안에서만
// overflow-y-auto로 스크롤한다.
function VideoList({ videos, onSelect }) {
  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="text-[17px] font-bold text-[var(--cb-navy)]">검색 결과가 없어요.</p>
        <p className="mt-2 text-[14px] font-medium text-[var(--cb-slate)]">다른 검색어로 다시 시도해 보세요.</p>
      </div>
    )
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
      {videos.map((video) => (
        <li key={video.videoId}>
          <button
            type="button"
            onClick={() => onSelect(video)}
            className="flex w-full items-start gap-3 rounded-2xl border p-3 text-left"
            style={{ borderColor: 'var(--cb-line)' }}
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title ?? '영상 썸네일'}
                className="aspect-video w-[120px] shrink-0 rounded-lg object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="break-words text-[16px] font-extrabold leading-5 tracking-[-0.03em]">{video.title}</p>
              {video.channelTitle ? (
                <p className="mt-1 break-words text-[13px] font-medium text-[var(--cb-slate)]">
                  {video.channelTitle}
                </p>
              ) : null}
              {video.description ? (
                <p
                  className="mt-1 text-[13px] font-medium leading-5 text-[var(--cb-slate)]"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {video.description}
                </p>
              ) : null}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

// 검색 흐름(로컬에서 선택한 영상)과 바로 실행하기 흐름(서버 CONFIRM 응답) 둘 다
// "썸네일 + 제목 + 채널명 미리보기 + 버튼 여러 개" 구조가 같아서 하나로 합쳤다.
// 두 흐름의 차이(버튼을 눌렀을 때 클라이언트에서 바로 딥링크를 열지, 서버에
// 값을 보내고 다음 응답을 기다릴지)는 actions의 onClick 안에서만 갈리고, 이
// 컴포넌트 자체는 그 차이를 몰라도 된다.
function VideoConfirmPanel({ headline, video, actions }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
      <p className="text-[15px] font-medium leading-6 text-[var(--cb-slate)]">{headline}</p>

      <div className="mt-3 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--cb-line)' }}>
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title ?? '영상 미리보기'}
            className="aspect-video w-full object-cover"
          />
        ) : null}
        <div className="p-4">
          <p className="break-words text-[19px] font-extrabold leading-6 tracking-[-0.04em]">{video.title}</p>
          {video.channel ? (
            <p className="mt-1 break-words text-[14px] font-medium text-[var(--cb-slate)]">{video.channel}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        {actions.map((action) => (
          <SeniorButton key={action.label} type="button" variant={action.variant} onClick={action.onClick}>
            {action.label}
          </SeniorButton>
        ))}
      </div>
    </div>
  )
}

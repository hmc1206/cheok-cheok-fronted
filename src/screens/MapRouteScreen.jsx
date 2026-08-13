import { useCallback, useState } from 'react'
import { routesApi } from '../api/routesApi'
import { AppFrame } from '../components/common/AppFrame'
import { GlassButton, GlassCircleButton } from '../components/common/Glass'
import { GLASS_BACKGROUND_STYLE, GLASS_BRAND_COLOR } from '../components/common/glassTokens'
import { MicIcon } from '../components/common/icons'
import { useTTS } from '../hooks/useTTS'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'

// 길찾기 화면. 경로 계산은 서버가 담당한다 — 출발지/목적지 "이름"만 보내면
// 백엔드가 좌표 변환(Geocoding) + 네이버 지도 대중교통 딥링크 조립까지 전부 처리해서
// 완성된 앱/웹 URL을 돌려주고, 프론트는 그 URL을 실행만 한다(API 명세서 v2.0 8-2장).
//
// 참고: 이 저장소는 순수 웹(Vite/React) 프로젝트라 iOS Info.plist의
// LSApplicationQueriesSchemes / Android AndroidManifest.xml의 <queries>에
// nmap 스킴을 등록하는 작업은 여기서 할 수 없다 — 해당 설정은 네이티브 앱 래퍼
// 프로젝트(별도 저장소) 쪽 작업이라, 필요하면 그쪽 담당자에게 별도로 요청해야 한다.
export function MapRouteScreen() {
  const { speak } = useTTS()

  // 사용자가 입력창에 타이핑한 원문. 요청 필드명(startName/goalName)과 그대로 맞춰
  // 명세서에 나온 이름 그대로 API에 보낼 수 있게 한다.
  const [startName, setStartName] = useState('')
  const [goalName, setGoalName] = useState('')

  // 필드별 에러 메시지. GEOCODE_NOT_FOUND 응답의 error.field가 'startName'인지
  // 'goalName'인지에 따라 이 중 하나에만 메시지를 채워, 해당 입력창 테두리만
  // 빨갛게 표시하고 "어디를 다시 입력해야 하는지" 바로 알 수 있게 한다.
  const [startError, setStartError] = useState('')
  const [goalError, setGoalError] = useState('')

  // 필드에 딱 매핑되지 않는 에러(입력 누락, 서버/Geocoding 실패 등)를 보여줄 공용 메시지.
  const [generalError, setGeneralError] = useState('')

  // 502(GEOCODE_API_FAIL/EXTERNAL_API_FAIL) 같은 "일시적 실패"일 때만 true로 켜서
  // 재시도 버튼을 보여준다. 400/404처럼 사용자가 입력을 고쳐야 하는 에러는 재시도
  // 버튼 없이 입력창 에러 표시로만 유도한다(같은 값으로 재시도해봐야 똑같이 실패하므로).
  const [canRetry, setCanRetry] = useState(false)

  // idle: 대기/평상시, loading: API 응답을 기다리는 중(버튼 비활성화 + 로딩 표시).
  const [status, setStatus] = useState('idle')

  // 제출 전 모든 에러 상태를 비운다. 매 시도마다 이전 실패 흔적이 남아있지 않게 한다.
  const clearErrors = useCallback(() => {
    setStartError('')
    setGoalError('')
    setGeneralError('')
    setCanRetry(false)
  }, [])

  // 실제 API 호출 + 딥링크 실행을 담당하는 핵심 함수. "길 찾기" 버튼(최초 시도)과
  // "다시 시도" 버튼(재시도) 둘 다 이 함수를 그대로 재사용한다 — 재시도는 같은
  // startName/goalName으로 다시 부르기만 하면 되기 때문에 별도 로직이 필요 없다.
  const runSearch = useCallback(async () => {
    const trimmedStart = startName.trim()
    const trimmedGoal = goalName.trim()

    // 명세서 에러 표: "출발지/목적지 미입력 -> 400 INVALID_REQUEST, 버튼 비활성화".
    // 버튼 자체도 비활성화 상태이긴 하지만(disabled 조건 참고), 방어적으로 한 번 더 막는다.
    if (!trimmedStart || !trimmedGoal) {
      setGeneralError('출발지/목적지를 입력해주세요.')
      return
    }

    clearErrors()
    setStatus('loading')

    try {
      // POST /api/v1/routes/naver-link — 요청/응답 필드명은 명세서 그대로 사용.
      const { naverMapAppUrl, naverMapWebUrl } = await routesApi.getNaverMapLink({
        startName: trimmedStart,
        goalName: trimmedGoal,
      })

      // 어르신 UX: 앱으로 넘어가기 직전, 무슨 일이 일어나는지 음성으로도 안내한다
      // (다른 화면들과 동일한 "청각+시각 이중 안내" 원칙).
      speak(`${trimmedStart}에서 ${trimmedGoal}까지 경로를 네이버 지도에서 열어드릴게요.`)

      // 딥링크 실행 + Fallback 흐름(명세서 10-2장과 동일한 순서):
      // 1) naverMapAppUrl로 네이버 지도 앱 실행 시도
      // 2) 일정 시간(기본 1.5초) 안에 앱으로 화면 전환이 없으면 미설치로 간주
      // 3) naverMapWebUrl로 대신 이동(Fallback)
      openDeepLinkWithWebFallback(naverMapAppUrl, naverMapWebUrl)

      setStatus('idle')
    } catch (error) {
      // 명세서 9장 에러코드 마스터 표 + 8-2장 실패 응답 형태:
      // { success: false, error: { code, message, field? } }
      const errorCode = error.response?.data?.error?.code
      const errorField = error.response?.data?.error?.field
      const errorMessage = error.response?.data?.error?.message

      if (errorCode === 'GEOCODE_NOT_FOUND') {
        // field로 어느 입력창이 문제인지 구분해서 그 입력창에만 에러를 표시한다.
        const message = errorMessage ?? '해당 장소를 찾을 수 없어요. 다시 입력해주세요.'
        if (errorField === 'startName') {
          setStartError(message)
        } else if (errorField === 'goalName') {
          setGoalError(message)
        } else {
          setGeneralError(message)
        }
        speak(message)
      } else if (errorCode === 'GEOCODE_API_FAIL' || errorCode === 'EXTERNAL_API_FAIL') {
        // 일시적인 외부 API 실패 — 같은 입력값으로 재시도해볼 가치가 있어 재시도 버튼을 켠다.
        const message = errorMessage ?? '경로를 찾는 중 문제가 생겼어요. 다시 시도해주세요.'
        setGeneralError(message)
        setCanRetry(true)
        speak(message)
      } else if (errorCode === 'INVALID_REQUEST') {
        const message = errorMessage ?? '출발지/목적지를 입력해주세요.'
        setGeneralError(message)
        speak(message)
      } else {
        // INTERNAL_ERROR(500) 및 그 외 알 수 없는 실패(네트워크 끊김 등) 공통 처리.
        const message = errorMessage ?? '경로를 찾는 데 실패했어요. 다시 시도해주세요.'
        setGeneralError(message)
        setCanRetry(true)
        speak(message)
      }

      setStatus('idle')
    }
  }, [startName, goalName, speak, clearErrors])

  const handleSubmit = (event) => {
    event.preventDefault()
    runSearch()
  }

  // TODO(음성 인식 연동): 지금은 클릭 핸들러 구조만 잡아둔다. 실제로는 홈 화면의
  // useVoiceAssistant().startListening처럼 STT를 시작해서 인식된 문장에서
  // 출발지/목적지를 추출해 startName/goalName에 채워주는 로직이 들어갈 자리다.
  // 아직 연결하지 않은 이유: 이번 스코프는 입력창 기반 UI 확정까지만 요청받았고,
  // 음성 인식으로 "출발지"/"목적지"를 어떻게 구분해 받을지는 별도 설계가 필요하다.
  const handleMicClick = () => {
    // TODO: 음성 인식 시작 -> 인식된 텍스트에서 출발지/목적지 파싱 -> setStartName/setGoalName
  }

  // 출발지/목적지 중 하나라도 비어있거나 요청이 진행 중이면 버튼을 눌러도 아무 일도
  // 일어나지 않게 막는다(명세서: "미입력 시 버튼 비활성화").
  const isSubmitDisabled = status === 'loading' || !startName.trim() || !goalName.trim()

  return (
    <AppFrame>
      {/* 홈 화면과 동일한 브랜드 톤 배경 위에 유리 재질 버튼을 올려야 반투명 효과가
          실제로 눈에 띈다 (GLASS_BACKGROUND_STYLE, glassTokens.js 참고). 입력창 자체는
          이 브랜드 배경과 대비되도록 흰 배경으로 둔다(아래 MapTextInput 참고). */}
      <main className="flex h-full flex-col items-center p-6" style={GLASS_BACKGROUND_STYLE}>
        {/* 세로 배치: 제목+입력창+버튼 그룹을 화면 맨 위에 붙이지 않고, 위쪽 빈 스페이서
            (flex-1)로 한 번 밀어내려 화면 세로 중앙 부근(원래 비어있던 중간 영역)에
            오도록 한다. 그 아래 또 다른 스페이서(flex-1)가 마이크 버튼을 화면 하단으로
            밀어내면서 동시에 그룹과 마이크 사이에 적당한 여백을 만든다. 위/아래 스페이서가
            동일한 flex-1이라 남는 공간을 절반씩 나눠 가져 균형 잡힌 배치가 된다. */}
        <form onSubmit={handleSubmit} className="flex h-full w-full flex-col items-center py-4">
          {/* 그룹을 화면 상단에서 아래로 밀어내는 스페이서. */}
          <div className="flex-1" />

          {/* 입력창/버튼 그룹 자체를 화면 폭보다 좁게(w-72) 잡아서, 이 그룹이 화면
              가로 중앙에 오도록 한다(요청사항: "칸을 화면 중앙에 오게"). 안의 글자는
              MapTextInput이 기본값(왼쪽 정렬)을 쓰므로 입력 텍스트는 그대로 왼쪽 정렬이다. */}
          <div className="flex w-72 flex-col items-center gap-3">
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: GLASS_BRAND_COLOR }}>
              길 찾기
            </h1>

            <div className="flex w-full flex-col gap-1">
              <MapTextInput
                value={startName}
                onChange={(event) => setStartName(event.target.value)}
                placeholder="출발지 (예: 서울역)"
                hasError={Boolean(startError)}
                aria-label="출발지"
              />
              {/* 필드별 에러: GEOCODE_NOT_FOUND의 field가 startName일 때만 여기 표시된다. */}
              {startError && (
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-danger)' }}>{startError}</p>
              )}
            </div>

            <div className="flex w-full flex-col gap-1">
              <MapTextInput
                value={goalName}
                onChange={(event) => setGoalName(event.target.value)}
                placeholder="목적지 (예: 부산역)"
                hasError={Boolean(goalError)}
                aria-label="목적지"
              />
              {goalError && (
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-danger)' }}>{goalError}</p>
              )}
            </div>

            <GlassButton type="submit" disabled={isSubmitDisabled}>
              {status === 'loading' ? (
                // 로딩 인디케이터: 별도 라이브러리 없이 Tailwind animate-spin으로 최소한의
                // 원형 스피너만 그린다. 버튼 자체도 disabled라 중복 클릭은 막혀 있다.
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                  찾는 중...
                </span>
              ) : (
                '길 찾기'
              )}
            </GlassButton>

            {/* 필드에 매핑되지 않는 에러(입력 누락, 서버 오류 등) 공용 메시지 + 재시도 버튼.
                canRetry는 502(GEOCODE_API_FAIL/EXTERNAL_API_FAIL) 같은 일시적 실패에서만 켜진다. */}
            {generalError && (
              <div className="flex w-full flex-col items-center gap-2">
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-danger)' }}>{generalError}</p>
                {canRetry && (
                  <button
                    type="button"
                    onClick={runSearch}
                    disabled={status === 'loading'}
                    className="quick-action-button"
                  >
                    다시 시도
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 그룹과 마이크 버튼 사이 여백 + 마이크를 화면 하단 쪽으로 밀어내는 스페이서. */}
          <div className="flex-1" />

          {/* 화면 하단 보조 마이크 버튼. 홈 화면 마이크와 완전히 같은 GlassCircleButton +
              MicIcon 조합을 재사용해 디자인을 통일했다. 음성 인식은 아직 연결하지
              않았고(handleMicClick TODO 참고), disabled 처리는 하지 않아 버튼 자체는
              눌리지만 지금은 아무 동작도 하지 않는다. */}
          <GlassCircleButton onClick={handleMicClick} size={72} ariaLabel="음성으로 길 찾기 (준비 중)">
            <MicIcon size={28} />
          </GlassCircleButton>
        </form>
      </main>
    </AppFrame>
  )
}

// 출발지/목적지 입력창. 홈 화면의 유리(반투명) 버튼과는 다르게, 입력창은 흰 배경 +
// 옅은 테두리/그림자로 깔끔하게 둔다(요청사항: "입력창 배경은 하얀색으로 처리").
// hasError면 테두리를 경고색으로 바꿔 GEOCODE_NOT_FOUND 필드별 재입력을 유도한다.
//
// 포커스 시 나타나는 강조 테두리: index.css의 전역 접근성 규칙(`input:focus-visible {
// outline: var(--focus-ring) }`, tokens.css의 --color-primary #2f6fed = 파란색)이
// 앱 전체 input/button에 파란 outline을 준다. 이 화면은 브랜드 톤(#146156 초록)으로
// 통일해야 해서, `.map-input` 클래스에 index.css의 별도 규칙(같은 index.css, 전역
// 규칙보다 뒤+더 구체적인 선택자)으로 이 두 입력창만 outline 색을 덮어썼다.
// Tailwind 유틸리티 클래스(focus-visible:outline-...)로는 안 됐다 — Tailwind
// 클래스는 @layer utilities 안에 들어가는데, CSS Cascade Layers 스펙상 layer 밖의
// 일반 규칙(index.css의 전역 규칙)이 specificity와 무관하게 항상 이기기 때문에,
// 오버라이드도 layer 밖 일반 CSS로 작성해야 한다.
function MapTextInput({ value, onChange, placeholder, hasError, ...rest }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={
        'map-input w-full rounded-2xl border bg-white px-4 py-3 shadow-sm outline-none transition-colors duration-200 ' +
        (hasError ? 'border-red-400 focus:border-red-400' : 'border-white/60 focus:border-[#146156]/60')
      }
      style={{ color: 'var(--color-text)' }}
      {...rest}
    />
  )
}

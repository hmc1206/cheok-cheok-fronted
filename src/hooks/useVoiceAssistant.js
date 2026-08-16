import { useCallback, useState } from 'react'
import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { voiceApi } from '../api/voiceApi'
import { useAuthStore } from '../store/authStore'
import { useVoiceSessionStore } from '../store/voiceSessionStore'
import { useSTT } from './useSTT'
import { useTTS } from './useTTS'

// intent -> 라우팅 대상 화면. 서버 응답의 intent 값과 1:1로 매칭된다 (기획서 3-1장).
const INTENT_ROUTES = {
  YOUTUBE_PLAY: '/youtube',
  // "02 바로 실행하기"(영상 하나를 특정) 외에 "01 검색하기"(키워드로 목록 검색)도
  // 같은 화면(YoutubePlayerScreen)으로 라우팅한다 — 화면 안에서 intent로 두 흐름을
  // 구분한다(YoutubePlayerScreen.jsx의 mode 계산 참고).
  YOUTUBE_SEARCH: '/youtube',
  MAP_ROUTE: '/map',
  // 근처 병원·약국 찾기(명세서 v2.0 5장) — intent 이름은 SEARCH_MEDICAL이 맞다고
  // 실제 명세서로 확인됨(이전에 NEARBY_PLACE로 가정해뒀던 걸 정정).
  SEARCH_MEDICAL: '/nearby-place',
  WEATHER_INFO: '/weather',
}

// intent별 실패 시 강제 이동 대상. 다른 intent는 실패해도 화면 이동 없이 지금
// 화면에서 안내(ttsText 캡션+음성)만 띄우는 게 공통 동작이지만, 길찾기/날씨/
// 병원·약국처럼 "자동화 실패 시 관련 입력 화면으로 이동시켜 사용자가 직접
// 이어갈 수 있게" 하라고 명세서에 명시된 intent만 여기 등록한다. 값은 에러
// 응답의 errorCode -> 이동할 경로.
//
// 주의: GEOCODE_NOT_FOUND는 명세서 9장 공통 에러코드표에 있어 여러 intent
// (MAP_ROUTE뿐 아니라 SEARCH_MEDICAL도 좌표 확인에 실패하면 같은 코드를 쓸 수
// 있음)가 공유할 수 있는데, 에러 응답 자체엔 어떤 intent였는지 알려주는 필드가
// 없다(명세서 2장 공통 에러 응답 형태 참고) — 그래서 기본값은 지금까지처럼
// '/map'으로 두되, 병원·약국 찾기처럼 다른 화면으로 보내야 하는 호출부는
// processUtterance에 fallbackRoute를 직접 넘겨서 이 기본 테이블보다 우선하도록
// 했다(아래 processUtterance 참고). 다만 홈 화면의 범용 음성 입력("병원
// 찾아줘"라고 마이크로만 말한 경우)처럼 fallbackRoute를 넘길 수 없는 경로는
// 여전히 이 기본값('/map')을 따른다 — SEARCH_MEDICAL은 좌표 기반 조회라
// GEOCODE_NOT_FOUND보다는 EXTERNAL_API_FAIL 등이 더 흔할 것으로 예상되지만,
// 실제로 발생 빈도가 높다면 백엔드와 다시 확인이 필요하다.
const ERROR_FORCE_NAVIGATE_ROUTES = {
  GEOCODE_NOT_FOUND: '/map',
  WEATHER_LOCATION_NOT_FOUND: '/weather',
  WEATHER_API_FAIL: '/weather',
  WEATHER_DATE_NOT_SUPPORTED: '/weather',
}

/**
 * "노인 전용 AI 비서"의 핵심 훅. HomeScreen뿐 아니라 MapRoute/NearbyPlace/Youtube
 * 화면에서도 재사용해 같은 화면에서 대화를 이어가거나(멀티턴), intent가 바뀌면
 * 자동으로 다른 화면으로 라우팅한다.
 */
export function useVoiceAssistant({ onResult } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { start: startSTT, stop: stopListening, isListening, isSupported: isSTTSupported } = useSTT()
  const { speak } = useTTS()
  const userId = useAuthStore((state) => state.userId)
  const setSession = useVoiceSessionStore((state) => state.setSession)
  const cancelledRef = useRef(false)

  const [status, setStatus] = useState('idle') // idle | listening | processing
  const [sttCaption, setSttCaption] = useState('')
  const [ttsCaption, setTtsCaption] = useState('')
  const [outcome, setOutcome] = useState('idle') // idle | success | error
  // 실패 시 화면에서 errorCode별로 다른 UI(재시도 버튼/재입력창 등)를 보여줄 수
  // 있도록 원본 에러 코드를 그대로 노출한다(날씨 화면의 WEATHER_LOCATION_NOT_FOUND
  // vs WEATHER_API_FAIL 분기 처리에 필요 — outcome/ttsCaption만으로는 어떤 실패인지
  // 구분이 안 된다).
  const [errorCode, setErrorCode] = useState(null)

  const applyResponse = useCallback(
    (response, transcript = '') => {
      // API 명세서 v2.0 2장 공통 응답 필드: intent/step/slots/ttsText/screen/quickReplies/data.
      const { intent, step, screen, slots, data, ttsText, quickReplies } = response

      setTtsCaption(ttsText ?? '')
      setOutcome('success')
      if (ttsText) speak(ttsText)

      setSession({ intent, step, screen, slots, data, transcript, quickReplies: quickReplies ?? null, ttsText: ttsText ?? null })

      // "진행 중이면 같은 화면에서 이어감" — 이미 목적지 화면이면 다시 navigate하지 않는다.
      const targetPath = INTENT_ROUTES[intent]
      if (targetPath && location.pathname !== targetPath) {
        navigate(targetPath, { state: { data, slots, transcript } })
      }

      onResult?.(response)
    },
    [location.pathname, navigate, onResult, setSession, speak],
  )

  const processUtterance = useCallback(
    async (payload, { fallbackRoute } = {}) => {
      setStatus('processing')
      setOutcome('idle')
      setErrorCode(null)
      try {
        const response = await voiceApi.process({ userId, ...payload })
        if (cancelledRef.current) return
        applyResponse(response, payload.text ?? '')
      } catch (error) {
        // 공통 에러 응답({ errorCode, message, ttsText })도 정상 응답과 동일하게 캡션+TTS로
        // 안내한다 (청각+시각 이중 안내 원칙). apiClient 인터셉터가 SESSION_EXPIRED/401은
        // 이미 별도 처리하지만, 여기서 다시 캡션을 채워줘야 화면에도 문구가 보인다.
        // catch 없이 두면 sendText를 그냥 호출만 하고 await하지 않는 화면들에서
        // unhandled promise rejection이 발생하므로 반드시 여기서 흡수한다.
        const ttsText = error.response?.data?.ttsText
        if (ttsText) {
          setTtsCaption(ttsText)
          speak(ttsText)
        }
        setOutcome('error')

        // 길찾기 수동 입력(routesApi)의 REST 에러는 { error: { code, ... } } 형태고,
        // 음성 파이프라인의 구조화된 에러(날씨 API 명세서 10장 등)는 최상위
        // errorCode 필드를 쓴다 — 둘 다 지원해야 어느 쪽으로 와도 놓치지 않는다.
        const errorCode = error.response?.data?.errorCode ?? error.response?.data?.error?.code
        setErrorCode(errorCode ?? null)

        // intent별 강제 이동(사용자 확인 — 다른 intent는 실패 시 화면 이동 없이
        // 현재 화면에서 안내만 띄우는 게 공통 동작이지만, 길찾기/날씨/병원·약국은
        // "자동화 실패 시 관련 입력 화면으로 이동시켜 사용자가 직접 이어갈 수
        // 있게"가 명세서에 명시돼 있어 예외로 둔다). 예: 홈 화면에서 곧바로
        // "서울역에서 OO까지"라고 말했는데 위치를 못 찾은 경우에도, 사용자가
        // 길찾기 화면에 들어가 있지 않았다면 강제로 이동시켜 직접 입력할 수
        // 있게 한다. 호출부가 명시적으로 fallbackRoute를 넘겼으면 그걸 공통
        // 코드 테이블(ERROR_FORCE_NAVIGATE_ROUTES)보다 우선한다(위 그 상수의
        // 주석 참고 — GEOCODE_NOT_FOUND처럼 여러 intent가 같은 코드를 공유할 때
        // 필요).
        const targetPath = fallbackRoute ?? ERROR_FORCE_NAVIGATE_ROUTES[errorCode]
        if (targetPath && location.pathname !== targetPath) {
          navigate(targetPath, {
            state: {
              // 화면 쪽에서 "음성/버튼 요청이 실패해서 여기로 강제 이동됨"을
              // 구분하는 공통 플래그. slots/transcript는 길찾기처럼 일부만
              // 인식된 값을 프리필하는 용도, retryPayload는 날씨의 "다시 시도"
              // 버튼처럼 실패한 요청을 그대로 재전송하는 용도 — 화면마다
              // 필요한 것만 꺼내 쓰고 나머지는 무시하면 된다.
              requestFailed: true,
              errorCode,
              ttsText,
              slots: error.response?.data?.slots,
              transcript: payload.text ?? '',
              retryPayload: payload,
            },
          })
        }
      } finally {
        setStatus('idle')
      }
    },
    [applyResponse, location.pathname, navigate, speak, userId],
  )

  const startListening = useCallback(async () => {
    cancelledRef.current = false
    setStatus('listening')
    setSttCaption('')
    setTtsCaption('')
    setOutcome('idle')
    try {
      const result = await startSTT({ onInterim: setSttCaption })
      // 사투리/오인식 확인용 자막을 API 호출 전에 먼저 띄운다 (기획서 3-1장 3단계).
      if (cancelledRef.current) return
      if (result.text) setSttCaption(result.text)
      if (cancelledRef.current) return
      await processUtterance(result)
    } catch {
      if (!cancelledRef.current) {
        setOutcome('error')
        setStatus('idle')
      }
    }
  }, [processUtterance, startSTT])

  const cancelListening = useCallback(() => {
    cancelledRef.current = true
    stopListening()
    setStatus('idle')
    setTtsCaption('')
    setOutcome('idle')
  }, [stopListening])

  // 음성 없이 텍스트로 입력하는 경우(화면 내 텍스트 입력창)에도 같은 파이프라인을 태운다.
  // requestOptions.fallbackRoute: 이 요청이 실패했을 때 강제 이동할 경로를 호출부가
  // 직접 지정하고 싶을 때 쓴다(예: 병원·약국 찾기 화면에서 보낸 요청은 실패해도
  // 항상 이 화면으로 돌아와야 하므로 '/nearby-place'를 넘김) — 안 넘기면 기존처럼
  // ERROR_FORCE_NAVIGATE_ROUTES 공통 테이블을 따른다.
  const sendText = useCallback(
    (text, extra = {}, requestOptions = {}) => {
      setSttCaption(text)
      setTtsCaption('')
      setOutcome('idle')
      return processUtterance({ text, ...extra }, requestOptions)
    },
    [processUtterance],
  )

  return {
    status,
    isListening,
    isSTTSupported,
    sttCaption,
    ttsCaption,
    outcome,
    errorCode,
    startListening,
    cancelListening,
    stopListening,
    sendText,
  }
}

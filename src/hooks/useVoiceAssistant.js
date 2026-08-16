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
  MAP_ROUTE: '/map',
  TRAIN_BOOKING: '/train',
}

/**
 * "노인 전용 AI 비서"의 핵심 훅. HomeScreen뿐 아니라 MapRoute/TrainBooking/Youtube
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

  const applyResponse = useCallback(
    (response, transcript = '') => {
      // API 명세서 v2.0 2장 공통 응답 필드: intent/step/slots/ttsText/screen/quickReplies/data.
      const { intent, step, screen, slots, data, ttsText, quickReplies } = response

      setTtsCaption(ttsText ?? '')
      setOutcome('success')
      if (ttsText) speak(ttsText)

      setSession({ intent, step, screen, slots, data, transcript, quickReplies: quickReplies ?? null })

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
    async (payload) => {
      setStatus('processing')
      setOutcome('idle')
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
      } finally {
        setStatus('idle')
      }
    },
    [applyResponse, speak, userId],
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
  const sendText = useCallback(
    (text, extra = {}) => {
      setSttCaption(text)
      setTtsCaption('')
      setOutcome('idle')
      return processUtterance({ text, ...extra })
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
    startListening,
    cancelListening,
    stopListening,
    sendText,
  }
}

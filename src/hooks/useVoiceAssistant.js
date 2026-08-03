import { useCallback, useState } from 'react'
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

  const [status, setStatus] = useState('idle') // idle | listening | processing
  const [sttCaption, setSttCaption] = useState('')
  const [ttsCaption, setTtsCaption] = useState('')

  const applyResponse = useCallback(
    (response) => {
      const { intent, step, screen, slots, data, ttsText, audioUrl, recognizedText } = response

      // ASSUMPTION: MediaRecorder 폴백 경로는 브라우저에서 바로 STT를 할 수 없으므로,
      // 서버가 인식 결과를 recognizedText로 함께 돌려준다고 가정하고 자막을 채운다.
      if (recognizedText) setSttCaption(recognizedText)

      setTtsCaption(ttsText ?? '')
      if (ttsText || audioUrl) speak(ttsText, { audioUrl })

      setSession({ intent, step, screen, slots, data })

      // "진행 중이면 같은 화면에서 이어감" — 이미 목적지 화면이면 다시 navigate하지 않는다.
      const targetPath = INTENT_ROUTES[intent]
      if (targetPath && location.pathname !== targetPath) {
        navigate(targetPath, { state: { data } })
      }

      onResult?.(response)
    },
    [location.pathname, navigate, onResult, setSession, speak],
  )

  const processUtterance = useCallback(
    async (payload) => {
      setStatus('processing')
      try {
        const response = await voiceApi.process({ userId, ...payload })
        applyResponse(response)
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
      } finally {
        setStatus('idle')
      }
    },
    [applyResponse, speak, userId],
  )

  const startListening = useCallback(async () => {
    setStatus('listening')
    try {
      const result = await startSTT()
      // 사투리/오인식 확인용 자막을 API 호출 전에 먼저 띄운다 (기획서 3-1장 3단계).
      if (result.text) setSttCaption(result.text)
      await processUtterance(result)
    } catch {
      setStatus('idle')
    }
  }, [processUtterance, startSTT])

  // 음성 없이 텍스트로 입력하는 경우(화면 내 텍스트 입력창)에도 같은 파이프라인을 태운다.
  const sendText = useCallback(
    (text, extra = {}) => {
      setSttCaption(text)
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
    startListening,
    stopListening,
    sendText,
  }
}

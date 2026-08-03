import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 고령자 접근성을 위한 음성 안내(TTS - SpeechSynthesis) 커스텀 훅
 * ko-KR 언어, 0.9 배속, 음성 켜기/끄기, 이전 안내 취소 및 자동 읽기를 지원합니다.
 */
export function useSpeech() {
  const [isMuted, setIsMuted] = useState(false)
  const currentTextRef = useRef('')

  /**
   * 텍스트 음성 출력
   * @param {string} text - 읽어줄 안내 문구
   */
  const speak = useCallback(
    (text) => {
      if (!text) return
      currentTextRef.current = text

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('[useSpeech] 현재 브라우저는 SpeechSynthesis를 지원하지 않습니다.')
        return
      }

      // 음성 끄기 상태면 재생하지 않음
      if (isMuted) return

      try {
        // 한국어 주석: 새로운 안내를 재생하기 직전에 이전 재생 중인 모든 음성을 즉시 중지(cancel)합니다.
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.rate = 0.9 // 고령자 사용자를 배려해 약간 천천히 읽어줌

        // 한국어 주석: 일부 브라우저에서 Utterance 객체가 가비지 컬렉터에 의해 중간에 끊기는 현상을 방지하기 위해 이벤트 핸들러를 등록합니다.
        utterance.onerror = (e) => {
          console.warn('[useSpeech] 음성 재생 실패/취소됨:', e)
        }

        window.speechSynthesis.speak(utterance)
      } catch (err) {
        console.error('[useSpeech] 음성 합성 예외 처리:', err)
      }
    },
    [isMuted],
  )

  /**
   * 재생 중인 모든 음성 즉시 중지
   */
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  /**
   * 음성 켜기 / 끄기 토글
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (next) {
        stop()
      } else if (currentTextRef.current) {
        // 음성 켜짐으로 전환 시 현재 문구 다시 읽기
        speak(currentTextRef.current)
      }
      return next
    })
  }, [speak, stop])

  // 언마운트 시 음성 종료
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    speak,
    stop,
    isMuted,
    toggleMute,
  }
}

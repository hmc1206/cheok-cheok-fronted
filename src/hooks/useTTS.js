import { useCallback, useRef, useState } from 'react'

// Web Speech API(speechSynthesis) 우선 사용, 미지원 시 서버가 준 오디오(Clova TTS)로 폴백.
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef(null)

  const speak = useCallback((text, { audioUrl } = {}) => {
    if (!text && !audioUrl) return

    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
      return
    }

    if (audioUrl) {
      audioRef.current?.pause()
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onplay = () => setIsSpeaking(true)
      audio.onended = () => setIsSpeaking(false)
      audio.onerror = () => setIsSpeaking(false)
      audio.play().catch(() => setIsSpeaking(false))
    }
  }, [])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    audioRef.current?.pause()
    setIsSpeaking(false)
  }, [])

  return { speak, stop, isSpeaking }
}

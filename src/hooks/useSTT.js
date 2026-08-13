import { useCallback, useRef, useState } from 'react'

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

// Web Speech API 우선, 미지원 브라우저에서는 MediaRecorder로 녹음해 서버 STT로 넘길
// audio(base64)를 만든다 (기획서 1장 음성인식 폴백 정책, API 명세서 v2.0 2장).
export function useSTT() {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)

  const isSupported = Boolean(SpeechRecognitionImpl)

  const listenWithSpeechRecognition = useCallback(() => {
    return new Promise((resolve, reject) => {
      const recognition = new SpeechRecognitionImpl()
      recognition.lang = 'ko-KR'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript ?? ''
        resolve({ text })
      }
      recognition.onerror = (event) => reject(event.error)
      recognition.onend = () => setIsListening(false)

      recognition.start()
    })
  }, [])

  // ASSUMPTION: Web Speech API 미지원 기기(구형 브라우저 등, 노인 사용자 단말 특성 고려)를 위한
  // 폴백. 별도 무음 감지(VAD) 없이, 마이크 버튼을 다시 누르면(stop 호출) 녹음이 끝나는 방식으로
  // 단순화했다 — 정교한 발화 종료 감지는 이후 개선 과제로 남긴다.
  const listenWithMediaRecorder = useCallback(() => {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const recorder = new MediaRecorder(stream)
          const chunks = []
          mediaRecorderRef.current = recorder

          recorder.ondataavailable = (event) => chunks.push(event.data)
          recorder.onstart = () => setIsListening(true)
          recorder.onstop = () => {
            setIsListening(false)
            stream.getTracks().forEach((track) => track.stop())

            const blob = new Blob(chunks, { type: 'audio/webm' })
            const reader = new FileReader()
            reader.onloadend = () => {
              const audio = reader.result?.toString().split(',')[1] ?? ''
              resolve({ audio })
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          }

          recorder.start()
        })
        .catch(reject)
    })
  }, [])

  const start = useCallback(
    () => (isSupported ? listenWithSpeechRecognition() : listenWithMediaRecorder()),
    [isSupported, listenWithSpeechRecognition, listenWithMediaRecorder],
  )

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  return { start, stop, isListening, isSupported }
}

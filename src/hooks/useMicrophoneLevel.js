import { useEffect, useRef, useState } from 'react'

/**
 * Keeps the microphone meter strictly presentational: it never stores or uploads audio.
 * The Web Audio analyser is started only while speech recognition is listening and is fully released on stop.
 */
export function useMicrophoneLevel(isActive) {
  const [level, setLevel] = useState(0)
  const frameRef = useRef(0)

  useEffect(() => {
    const AudioContextImpl = window.AudioContext || window.webkitAudioContext
    if (!isActive || !navigator.mediaDevices?.getUserMedia || !AudioContextImpl) {
      setLevel(0)
      return undefined
    }

    let disposed = false
    let stream
    let context

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        context = new AudioContextImpl()
        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.78
        source.connect(analyser)

        const samples = new Uint8Array(analyser.fftSize)
        const sample = () => {
          analyser.getByteTimeDomainData(samples)
          let squaredSum = 0
          for (const value of samples) {
            const normalized = (value - 128) / 128
            squaredSum += normalized * normalized
          }
          const rms = Math.sqrt(squaredSum / samples.length)
          const normalizedLevel = Math.min(1, Math.max(0, rms * 7))
          setLevel(normalizedLevel)
          frameRef.current = window.requestAnimationFrame(sample)
        }
        sample()
      } catch {
        // Permission can be denied independently of Web Speech; retain the calm idle visual in that case.
        setLevel(0)
      }
    }

    start()

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameRef.current)
      stream?.getTracks().forEach((track) => track.stop())
      context?.close()
      setLevel(0)
    }
  }, [isActive])

  return level
}

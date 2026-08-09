import { useCallback, useEffect, useRef, useState } from 'react'
import { BRAND_CONFIDENCE_THRESHOLD } from '../data/megaCoffeeGuide'
import { cropRoiCanvas } from '../services/ocrService'
import { getRoiInVideoCoords, mapRoiWordToVideoBox, mapVideoBoxToDisplayBox } from '../services/coordinateMapper'
import { classifyBrand, findBestTextMatch } from '../services/kioskClassifier'
import { useOCR } from './useOCR'

// 매 프레임 OCR을 돌리면 성능 문제가 생기므로 이 주기로 throttling한다.
const OCR_INTERVAL_MS = 800

// AR 박스가 OCR 오차로 흔들리지 않도록 이전 좌표에 부여하는 가중치.
// newX = oldX * SMOOTHING_KEEP + detectedX * (1 - SMOOTHING_KEEP)
const SMOOTHING_KEEP = 0.7

/**
 * 카메라 영상에서 ROI를 잘라 주기적으로 OCR을 실행하고,
 * targetTexts와 일치하는 버튼의 위치를 실시간으로 추적(추적 중 smoothing 포함)하는 훅.
 *
 * @param {{
 *   videoRef: React.RefObject<HTMLVideoElement>,
 *   roiElementRef: React.RefObject<HTMLElement>,
 *   enabled: boolean,
 *   targetTexts: string[],
 * }} params
 */
export function useARTracking({ videoRef, roiElementRef, enabled, targetTexts }) {
  const { recognize, isReady } = useOCR()

  const [ocrWords, setOcrWords] = useState([]) // 디버그 표시용(화면 표시 퍼센트 좌표)
  const [rawWords, setRawWords] = useState([]) // 상태 자동판별용(원문 텍스트만 사용)
  const [brandResult, setBrandResult] = useState({ brand: 'UNKNOWN', confidence: 0, matchedKeywords: [] })
  const [targetBox, setTargetBox] = useState(null) // smoothing 적용된 표시 퍼센트 박스
  const [targetMatch, setTargetMatch] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastProcessMs, setLastProcessMs] = useState(0)
  const [cycleCount, setCycleCount] = useState(0)

  const processingRef = useRef(false)
  const smoothedBoxRef = useRef(null)
  const targetTextsRef = useRef(targetTexts)
  const prevEnabledRef = useRef(enabled)

  targetTextsRef.current = targetTexts

  // enabled가 false -> true로 바뀔 때(재인식 시작 등) 이전 추적 상태를 초기화한다.
  useEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      smoothedBoxRef.current = null
      setCycleCount(0)
      setTargetBox(null)
      setTargetMatch(null)
    }
    prevEnabledRef.current = enabled
  }, [enabled])

  const runCycle = useCallback(async () => {
    if (processingRef.current || !enabled || !isReady) return

    const video = videoRef.current
    const roiElement = roiElementRef.current
    if (!video || video.readyState < 2) return

    const roiVideoRect = getRoiInVideoCoords(video, roiElement)
    if (!roiVideoRect) return

    const cropped = cropRoiCanvas(video, roiVideoRect)
    if (!cropped) return

    processingRef.current = true
    setIsProcessing(true)
    const startedAtMs = performance.now()

    try {
      const words = await recognize(cropped.canvas)

      // ROI 캔버스 좌표 -> video 원본 픽셀 좌표로 되돌린다.
      const videoWords = words.map((word) => ({
        ...word,
        ...mapRoiWordToVideoBox(word, roiVideoRect, cropped.resizeScale),
      }))

      setRawWords(videoWords)
      setOcrWords(
        videoWords
          .map((word) => {
            const displayBox = mapVideoBoxToDisplayBox(word, video)
            return displayBox ? { text: word.text, ...displayBox } : null
          })
          .filter(Boolean),
      )

      const brand = classifyBrand(videoWords)
      setBrandResult(brand)

      const hasTarget = targetTextsRef.current?.length > 0
      const match =
        brand.confidence >= BRAND_CONFIDENCE_THRESHOLD && hasTarget
          ? findBestTextMatch(videoWords, targetTextsRef.current)
          : null

      if (match) {
        const displayBox = mapVideoBoxToDisplayBox(match.box, video)
        const previous = smoothedBoxRef.current

        const smoothed = previous
          ? {
              x: previous.x * SMOOTHING_KEEP + displayBox.x * (1 - SMOOTHING_KEEP),
              y: previous.y * SMOOTHING_KEEP + displayBox.y * (1 - SMOOTHING_KEEP),
              width: previous.width * SMOOTHING_KEEP + displayBox.width * (1 - SMOOTHING_KEEP),
              height: previous.height * SMOOTHING_KEEP + displayBox.height * (1 - SMOOTHING_KEEP),
            }
          : displayBox

        smoothedBoxRef.current = smoothed
        setTargetBox(smoothed)
        setTargetMatch({ text: match.text, confidence: match.confidence })
      } else {
        smoothedBoxRef.current = null
        setTargetBox(null)
        setTargetMatch(null)
      }
    } catch (err) {
      console.error('[useARTracking] OCR 처리 중 오류:', err)
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      setLastProcessMs(Math.round(performance.now() - startedAtMs))
      setCycleCount((count) => count + 1)
    }
  }, [enabled, isReady, recognize, roiElementRef, videoRef])

  useEffect(() => {
    if (!enabled) return undefined

    runCycle()
    const intervalId = setInterval(runCycle, OCR_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [enabled, runCycle])

  return {
    ocrWords,
    rawWords,
    brandResult,
    targetBox,
    targetMatch,
    isProcessing,
    lastProcessMs,
    cycleCount,
  }
}

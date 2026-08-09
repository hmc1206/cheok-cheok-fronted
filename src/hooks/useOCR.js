import { useCallback, useEffect, useRef, useState } from 'react'
import { getOcrWorker, recognizeText, terminateOcrWorker } from '../services/ocrService'

/**
 * Tesseract.js 워커 생명주기(초기화/종료)와 인식 요청을 다루는 훅.
 * 워커 준비 여부(isReady)를 노출해 준비 전에 인식을 시도하지 않도록 한다.
 */
export function useOCR() {
  const [isReady, setIsReady] = useState(false)
  const [initError, setInitError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    getOcrWorker()
      .then(() => {
        if (mountedRef.current) setIsReady(true)
      })
      .catch((err) => {
        console.error('[useOCR] Tesseract 워커 초기화 실패:', err)
        if (mountedRef.current) setInitError(err)
      })

    return () => {
      mountedRef.current = false
    }
  }, [])

  // 컴포넌트 언마운트 시 워커를 종료해 메모리 누수를 방지한다.
  useEffect(() => {
    return () => {
      terminateOcrWorker()
    }
  }, [])

  /**
   * @param {HTMLCanvasElement} canvas
   */
  const recognize = useCallback(async (canvas) => {
    try {
      return await recognizeText(canvas)
    } catch (err) {
      console.error('[useOCR] OCR 인식 실패:', err)
      return []
    }
  }, [])

  return { isReady, initError, recognize }
}

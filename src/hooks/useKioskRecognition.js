import { useCallback, useEffect, useMemo, useState } from 'react'
import { BRAND_CONFIDENCE_THRESHOLD, KIOSK_GUIDE_STEPS, ORDER_STATE } from '../data/megaCoffeeGuide'
import { detectOrderState } from '../services/kioskClassifier'
import { useARTracking } from './useARTracking'

const STATE_SEQUENCE = KIOSK_GUIDE_STEPS.map((step) => step.state)

/**
 * 메가커피 키오스크 실시간 인식 + 주문 단계 상태머신을 담당하는 훅.
 *
 * - useARTracking으로 현재 targetText 위치를 계속 추적한다.
 * - OCR 결과(화면 특징 단어)로 주문 단계 자동 전환을 시도한다.
 * - 자동판별이 불확실한 경우를 대비해 goPrev/goNext로 수동 이동도 항상 가능하다.
 */
export function useKioskRecognition({ videoRef, roiElementRef, enabled }) {
  const [orderState, setOrderState] = useState(ORDER_STATE.START)

  const currentStep = useMemo(
    () => KIOSK_GUIDE_STEPS.find((step) => step.state === orderState) ?? KIOSK_GUIDE_STEPS[0],
    [orderState],
  )

  const tracking = useARTracking({
    videoRef,
    roiElementRef,
    enabled,
    targetTexts: currentStep.targetTexts,
  })

  // OCR로 읽은 화면 특징 단어가 갱신될 때마다 자동 단계 판별을 시도한다.
  // 브랜드 confidence가 낮을 때(엉뚱한 화면)는 상태를 건드리지 않는다.
  useEffect(() => {
    if (!enabled) return
    if (tracking.brandResult.confidence < BRAND_CONFIDENCE_THRESHOLD) return

    setOrderState((current) => detectOrderState(tracking.rawWords, current))
  }, [tracking.rawWords, tracking.brandResult, enabled])

  const stateIndex = STATE_SEQUENCE.indexOf(orderState)

  const goNext = useCallback(() => {
    setOrderState((current) => {
      const idx = STATE_SEQUENCE.indexOf(current)
      return idx < STATE_SEQUENCE.length - 1 ? STATE_SEQUENCE[idx + 1] : current
    })
  }, [])

  const goPrev = useCallback(() => {
    setOrderState((current) => {
      const idx = STATE_SEQUENCE.indexOf(current)
      return idx > 0 ? STATE_SEQUENCE[idx - 1] : current
    })
  }, [])

  const reset = useCallback(() => {
    setOrderState(ORDER_STATE.START)
  }, [])

  return {
    ...tracking,
    orderState,
    currentStep,
    stateIndex,
    totalStates: STATE_SEQUENCE.length,
    isFirstState: stateIndex <= 0,
    isLastState: stateIndex >= STATE_SEQUENCE.length - 1,
    goNext,
    goPrev,
    reset,
  }
}

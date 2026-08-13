import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BRAND, getBrandEntry } from '../data/kioskBrands'
import { MOMS_ORDER_STATE, MOMS_SET_CONFIG_PHASE, MOMS_SET_CONFIG_PHASES, MOMS_SET_OPTION_PHASE, MOMS_SET_OPTION_PHASES } from '../data/momsTouchGuide'
import { detectBestSignalMatch, detectOrderState } from '../services/kioskClassifier'
import { useARTracking } from './useARTracking'

// 브랜드/주문 단계/하위 단계가 같은 값으로 이 횟수만큼 연속 감지되어야 실제로 확정한다.
// (OCR 한 번의 오인식으로 화면이 계속 바뀌는 flicker를 방지 - 기획 요구사항)
const CONSECUTIVE_CONFIRM_COUNT = 2

/**
 * 세트 구성/세트 옵션처럼 하나의 상태 안에 여러 하위 단계(phase)가 있는 브랜드 상태를 등록한다.
 * 여기에 없는 상태(메가커피 전체, 맘스터치의 대부분 상태)는 phase 없이 기존처럼 동작한다.
 */
const PHASE_CONFIG_BY_STATE = {
  [MOMS_ORDER_STATE.SET_CONFIGURATION]: {
    phases: MOMS_SET_CONFIG_PHASES,
    initialPhase: MOMS_SET_CONFIG_PHASE.CHICKEN,
  },
  [MOMS_ORDER_STATE.SET_OPTION]: {
    phases: MOMS_SET_OPTION_PHASES,
    initialPhase: MOMS_SET_OPTION_PHASE.BURGER,
  },
}

function nextCandidateCount(pendingRef, candidate) {
  if (pendingRef.current.value === candidate) {
    pendingRef.current.count += 1
  } else {
    pendingRef.current = { value: candidate, count: 1 }
  }
  return pendingRef.current.count
}

/**
 * 카메라 인식 종합 훅. useARTracking으로 실시간 targetText 위치를 추적하면서,
 * OCR 결과로 브랜드(메가커피/맘스터치 등) -> 주문 단계 -> (필요시) 하위 단계까지 자동 판별한다.
 *
 * - 브랜드/상태/하위단계 모두 "같은 값이 N회 연속 감지"되어야 확정되는 디바운스를 적용해
 *   한 번의 오인식으로 화면이 튀는 것을 막는다.
 * - 자동판별이 불확실한 경우를 대비해 goPrev/goNext로 수동 이동도 항상 가능하다.
 * - 매장/포장, 메뉴 종류, 옵션, 결제수단처럼 "사용자가 직접 골라야 하는" 단계는
 *   chooseOption()으로 선택한 대상을 targetTexts로 사용한다(선택 전에는 AR을 띄우지 않음).
 */
export function useKioskRecognition({ videoRef, roiElementRef, enabled }) {
  const [brand, setBrand] = useState(BRAND.UNKNOWN)
  const [orderState, setOrderState] = useState(null)
  const [phase, setPhase] = useState(null)
  const [chosenTarget, setChosenTarget] = useState(null)
  const [stateDebug, setStateDebug] = useState({ ratio: 0, matchedSignals: [] })

  const brandPendingRef = useRef({ value: BRAND.UNKNOWN, count: 0 })
  const statePendingRef = useRef({ value: null, count: 0 })
  const phasePendingRef = useRef({ value: null, count: 0 })
  const lastCycleRef = useRef(-1)
  const prevEnabledRef = useRef(enabled)

  const brandEntry = useMemo(() => getBrandEntry(brand), [brand])

  const currentGuideStep = useMemo(() => {
    if (!brandEntry) return null
    return brandEntry.guideSteps.find((step) => step.state === orderState) ?? brandEntry.guideSteps[0] ?? null
  }, [brandEntry, orderState])

  const phaseConfig = orderState ? PHASE_CONFIG_BY_STATE[orderState] : null
  const currentPhaseDef = useMemo(() => {
    if (!phaseConfig) return null
    return phaseConfig.phases.find((p) => p.phase === phase) ?? phaseConfig.phases[0] ?? null
  }, [phaseConfig, phase])

  // 실제 화면에 보여줄 단계 정보(하위 단계가 있으면 그쪽 문구/타깃을 우선한다)
  const resolvedStep = currentPhaseDef ?? currentGuideStep

  const baseTargetTexts = resolvedStep?.targetTexts ?? []
  const activeTargetTexts = chosenTarget?.targetTexts ?? baseTargetTexts

  const tracking = useARTracking({
    videoRef,
    roiElementRef,
    enabled,
    targetTexts: activeTargetTexts,
  })

  const resetAll = useCallback(() => {
    setBrand(BRAND.UNKNOWN)
    setOrderState(null)
    setPhase(null)
    setChosenTarget(null)
    setStateDebug({ ratio: 0, matchedSignals: [] })
    brandPendingRef.current = { value: BRAND.UNKNOWN, count: 0 }
    statePendingRef.current = { value: null, count: 0 }
    phasePendingRef.current = { value: null, count: 0 }
    lastCycleRef.current = -1
  }, [])

  // enabled가 false -> true로 바뀔 때("다시 인식하기" 등) 이전 인식 상태를 초기화한다.
  useEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      resetAll()
    }
    prevEnabledRef.current = enabled
  }, [enabled, resetAll])

  // OCR 사이클이 갱신될 때마다 브랜드 -> 상태 -> 하위단계 순서로 판별한다(요구사항: 브랜드 먼저,
  // 그 다음 해당 브랜드 안에서 상태, 그 다음 타깃 - 브랜드 간 상태 혼선을 막기 위함).
  useEffect(() => {
    if (!enabled) return
    if (tracking.cycleCount === lastCycleRef.current) return
    lastCycleRef.current = tracking.cycleCount
    if (tracking.cycleCount === 0) return

    // 1) 브랜드 판별(디바운스)
    const brandCandidate = tracking.brandResult.brand
    const brandConsecutive = nextCandidateCount(brandPendingRef, brandCandidate)

    if (brandCandidate !== brand && brandConsecutive >= CONSECUTIVE_CONFIRM_COUNT && brandCandidate !== BRAND.UNKNOWN) {
      const entry = getBrandEntry(brandCandidate)
      setBrand(brandCandidate)
      setOrderState(entry?.initialState ?? null)
      setPhase(entry ? (PHASE_CONFIG_BY_STATE[entry.initialState]?.initialPhase ?? null) : null)
      setChosenTarget(null)
      setStateDebug({ ratio: 0, matchedSignals: [] })
      statePendingRef.current = { value: null, count: 0 }
      phasePendingRef.current = { value: null, count: 0 }
      brandPendingRef.current = { value: brandCandidate, count: 0 }
      return
    }

    if (brand === BRAND.UNKNOWN) return

    const entry = getBrandEntry(brand)
    if (!entry) return

    // 2) 주문 단계 판별(디바운스)
    const stateResult = detectOrderState(tracking.rawWords, entry.guideSteps, orderState, entry.stateDetectThreshold)
    setStateDebug({ ratio: stateResult.ratio, matchedSignals: stateResult.matchedSignals })

    if (stateResult.key !== orderState) {
      const stateConsecutive = nextCandidateCount(statePendingRef, stateResult.key)

      if (stateConsecutive >= CONSECUTIVE_CONFIRM_COUNT) {
        if (import.meta.env.DEV) {
          console.log(`[${brand}] detected ${stateResult.key}\nreason:`, stateResult.matchedSignals)
        }
        setOrderState(stateResult.key)
        setChosenTarget(null)
        const nextPhaseConfig = PHASE_CONFIG_BY_STATE[stateResult.key]
        setPhase(nextPhaseConfig?.initialPhase ?? null)
        statePendingRef.current = { value: stateResult.key, count: 0 }
        phasePendingRef.current = { value: null, count: 0 }
      }
      return
    }

    statePendingRef.current = { value: orderState, count: 0 }

    // 3) 하위 단계(phase) 판별 - SET_OPTION/SET_CONFIGURATION처럼 등록된 상태에서만.
    // "스크롤 안내 반복 방지" 요구사항: phase는 앞으로만 진행하고 되돌아가지 않는다.
    const activePhaseConfig = PHASE_CONFIG_BY_STATE[orderState]
    if (!activePhaseConfig) return

    const phaseCandidates = activePhaseConfig.phases.map((p) => ({ key: p.phase, signals: p.signals }))
    const phaseResult = detectBestSignalMatch(tracking.rawWords, phaseCandidates, phase, entry.stateDetectThreshold)

    const currentIdx = activePhaseConfig.phases.findIndex((p) => p.phase === phase)
    const candidateIdx = activePhaseConfig.phases.findIndex((p) => p.phase === phaseResult.key)

    if (candidateIdx > currentIdx) {
      const phaseConsecutive = nextCandidateCount(phasePendingRef, phaseResult.key)

      if (phaseConsecutive >= CONSECUTIVE_CONFIRM_COUNT) {
        if (import.meta.env.DEV) {
          console.log(`[${brand}] ${orderState} phase -> ${phaseResult.key}\nreason:`, phaseResult.matchedSignals)
        }
        setPhase(phaseResult.key)
        setChosenTarget(null)
        phasePendingRef.current = { value: phaseResult.key, count: 0 }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking.cycleCount, enabled, brand, orderState, phase])

  /**
   * 매장/포장, 메뉴 종류, 옵션, 결제수단처럼 사용자가 직접 고른 항목을 targetTexts로 설정한다.
   * option.gotoState가 있으면(예: 장바구니에서 "메뉴 더 담기") 즉시 해당 상태로 이동한다.
   */
  const chooseOption = useCallback(
    (option) => {
      if (!option) return

      if (option.gotoState) {
        setOrderState(option.gotoState)
        setChosenTarget(null)
        setPhase(PHASE_CONFIG_BY_STATE[option.gotoState]?.initialPhase ?? null)
        statePendingRef.current = { value: option.gotoState, count: 0 }
        phasePendingRef.current = { value: null, count: 0 }
        return
      }

      setChosenTarget({ targetTexts: option.targetTexts, title: option.title, description: option.description })

      // 맘스터치 세트 옵션의 버거 단계에서 옵션을 고르면, 우리 서비스가 스스로
      // "아래에 더 있어요" 스크롤 안내(phase: SCROLL)로 넘어간다(OCR로 감지하지 않음).
      if (brand === BRAND.MOMS_TOUCH && orderState === MOMS_ORDER_STATE.SET_OPTION && phase === MOMS_SET_OPTION_PHASE.BURGER) {
        setPhase(MOMS_SET_OPTION_PHASE.SCROLL)
        phasePendingRef.current = { value: null, count: 0 }
      }
    },
    [brand, orderState, phase],
  )

  // --- 수동 이전/다음 (자동판별 실패 시 대비) ---
  const goNext = useCallback(() => {
    if (!brandEntry) return

    const activePhaseConfig = PHASE_CONFIG_BY_STATE[orderState]
    if (activePhaseConfig) {
      const idx = activePhaseConfig.phases.findIndex((p) => p.phase === phase)
      if (idx >= 0 && idx < activePhaseConfig.phases.length - 1) {
        setPhase(activePhaseConfig.phases[idx + 1].phase)
        setChosenTarget(null)
        return
      }
    }

    const stateIdx = brandEntry.guideSteps.findIndex((s) => s.state === orderState)
    if (stateIdx >= 0 && stateIdx < brandEntry.guideSteps.length - 1) {
      const nextState = brandEntry.guideSteps[stateIdx + 1].state
      setOrderState(nextState)
      setPhase(PHASE_CONFIG_BY_STATE[nextState]?.initialPhase ?? null)
      setChosenTarget(null)
    }
  }, [brandEntry, orderState, phase])

  const goPrev = useCallback(() => {
    if (!brandEntry) return

    const activePhaseConfig = PHASE_CONFIG_BY_STATE[orderState]
    if (activePhaseConfig) {
      const idx = activePhaseConfig.phases.findIndex((p) => p.phase === phase)
      if (idx > 0) {
        setPhase(activePhaseConfig.phases[idx - 1].phase)
        setChosenTarget(null)
        return
      }
    }

    const stateIdx = brandEntry.guideSteps.findIndex((s) => s.state === orderState)
    if (stateIdx > 0) {
      const prevState = brandEntry.guideSteps[stateIdx - 1].state
      setOrderState(prevState)
      const prevPhaseConfig = PHASE_CONFIG_BY_STATE[prevState]
      setPhase(prevPhaseConfig ? prevPhaseConfig.phases[prevPhaseConfig.phases.length - 1].phase : null)
      setChosenTarget(null)
    }
  }, [brandEntry, orderState, phase])

  // 진행률 표시용 - 하위 단계가 있는 상태는 그 개수만큼 넓게 잡아 프로그레스바에 반영한다.
  const { flatIndex, flatTotal } = useMemo(() => {
    if (!brandEntry) return { flatIndex: 0, flatTotal: 1 }

    let index = 0
    let total = 0

    for (const step of brandEntry.guideSteps) {
      const pc = PHASE_CONFIG_BY_STATE[step.state]
      const count = pc ? pc.phases.length : 1

      if (step.state === orderState) {
        const phaseIdx = pc ? Math.max(0, pc.phases.findIndex((p) => p.phase === phase)) : 0
        index = total + phaseIdx
      }

      total += count
    }

    return { flatIndex: index, flatTotal: Math.max(1, total) }
  }, [brandEntry, orderState, phase])

  const reset = useCallback(() => {
    resetAll()
  }, [resetAll])

  return {
    ...tracking,
    brand,
    orderState,
    phase,
    currentStep: resolvedStep,
    chosenTarget,
    stateConfidence: stateDebug.ratio,
    stateMatchedSignals: stateDebug.matchedSignals,
    stateIndex: flatIndex,
    totalStates: flatTotal,
    isFirstState: flatIndex <= 0,
    isLastState: flatIndex >= flatTotal - 1,
    chooseOption,
    goNext,
    goPrev,
    reset,
  }
}

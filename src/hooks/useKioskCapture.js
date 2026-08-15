import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cropRoiCanvas } from '../services/ocrService'
import { getRoiInVideoCoords } from '../services/coordinateMapper'
import { computeEdgeDensity, computeFrameDiff } from '../services/captureQuality'
import { sampleColorProfile } from '../services/colorProfile'
import { detectKioskBrand } from '../recognition/detectKioskBrand'
import { detectMegaState } from '../recognition/detectMegaState'
import { detectMomsTouchState } from '../recognition/detectMomsTouchState'
import { MEGA_FLOW_FIRST_STEP_ID, MEGA_FLOW_STEPS } from '../data/megaFlow'
import { MOMS_TOUCH_FLOW_FIRST_STEP_ID, MOMS_TOUCH_FLOW_STEPS } from '../data/momsTouchFlow'
import { KIOSK_BRAND } from '../types/kiosk'
import { useCamera } from './useCamera'
import { useOCR } from './useOCR'

/**
 * "촬영 기반" 키오스크 안내 엔진 - 메가커피/맘스터치 공용 카메라 화면.
 *
 * 이전 버전(메가커피 전용)에서는 이 훅이 하나의 고정된 flow만 받아서 썼지만, 이번
 * 작업(브랜드 자동판별 추가)부터는 아래 흐름으로 바뀌었다:
 *
 *   카메라 실행 -> 가이드에 맞춤 -> 안정되면 촬영 -> 카메라 정지 -> OCR 1회
 *   -> detectKioskBrand로 "메가커피/맘스터치/UNKNOWN" 판별
 *   -> (판별된 브랜드의) detectMegaState 또는 detectMomsTouchState로 화면 상태 판별
 *   -> 그 브랜드/상태에 해당하는 flow 스텝으로 이동해 AR 안내 표시
 *   -> "다음 화면 촬영"을 누르면 다시 카메라를 켜고 반복(이때도 브랜드를 다시 확인하되,
 *      세션에 저장해둔 activeBrand를 쉽게 뒤집지 않는다 - 아래 resolveBrandTransition 참고)
 *
 * 카메라/가이드/안정성 측정/촬영/크롭 같은 "공통 카메라 촬영 구조"는 이전 버전과 완전히
 * 동일하게 유지했다(요구사항: 기존 카메라 촬영 구조를 최대한 재사용). 새로 생긴 것은
 * OCR 결과를 브랜드 판별 -> 상태 판별 순서의 "2단 분류"로 쓰는 부분과, 브랜드 세션
 * 유지/재확인 규칙이다.
 */
export function useKioskCapture() {
  // 관리할 화면 상태. 이전 버전 대비 BRAND_CONFIRM(브랜드 전환 확인 팝업)이 추가됐다.
  const PHASE = useMemo(
    () => ({
      CAMERA_PREPARING: 'camera-preparing',
      ALIGNING: 'aligning',
      COUNTDOWN: 'countdown',
      CAPTURED: 'captured',
      ANALYZING: 'analyzing',
      BRAND_CONFIRM: 'brand-confirm',
      GUIDING: 'guiding',
      LOW_CONFIDENCE: 'low-confidence',
      SELECTING_STATE: 'selecting-state',
      RETAKING: 'retaking',
      CAMERA_ERROR: 'camera-error',
    }),
    [],
  )

  // 브랜드별 flow 데이터 레지스트리. 이 훅이 두 브랜드를 모두 알아야 "브랜드 판별 ->
  // 상태 판별 -> 해당 브랜드 flow 사용"을 한 곳에서 처리할 수 있다(요구사항 1장: 카메라
  // 화면을 브랜드별로 따로 만들지 않고 공통 화면 하나로 처리). 새 브랜드를 추가할 때는
  // 이 객체에 항목 하나만 더하면 된다.
  const BRAND_REGISTRY = useMemo(
    () => ({
      [KIOSK_BRAND.MEGA]: {
        flowSteps: MEGA_FLOW_STEPS,
        firstStepId: MEGA_FLOW_FIRST_STEP_ID,
        detectState: detectMegaState,
      },
      [KIOSK_BRAND.MOMS_TOUCH]: {
        flowSteps: MOMS_TOUCH_FLOW_STEPS,
        firstStepId: MOMS_TOUCH_FLOW_FIRST_STEP_ID,
        detectState: detectMomsTouchState,
      },
    }),
    [],
  )

  // ── 튜닝 가능한 상수 (카메라/촬영 관련은 이전 버전과 동일) ──────────────
  const CHECK_INTERVAL_MS = 150
  const AUTO_CAPTURE_STABLE_MS = 1500
  const FILL_EDGE_THRESHOLD = 0.35
  const STABILITY_DIFF_THRESHOLD = 6
  const MEASURE_MAX_WIDTH = 240
  // 브랜드가 확실히 "바뀌었다"고 보고 사용자에게 확인 팝업을 띄우는 신뢰도 기준.
  // detectKioskBrand의 기본 확정 기준(약 0.45)보다 높게 잡아, 약한 신호로는 세션 브랜드를
  // 흔들지 않게 한다(요구사항 4장: "높은 신뢰도로 확인됐을 때만 브랜드 변경 확인").
  const BRAND_CHANGE_CONFIRM_THRESHOLD = 0.6

  const { videoRef, cameraStatus, errorType, startCamera, stopCamera } = useCamera()
  const { isReady: ocrReady, recognize } = useOCR()

  const guideElementRef = useRef(null)

  const [phase, setPhase] = useState(PHASE.CAMERA_PREPARING)
  const [fillRatio, setFillRatio] = useState(0)
  const [isStable, setIsStable] = useState(false)
  const [countdownProgress, setCountdownProgress] = useState(0)
  const [capturedImage, setCapturedImage] = useState(null)

  // 세션의 현재 브랜드(요구사항 4장: activeBrand). 첫 촬영 전에는 null.
  const [activeBrand, setActiveBrand] = useState(null)
  const [pendingBrandChange, setPendingBrandChange] = useState(null) // 확인 대기 중인 후보 브랜드
  const [currentStepId, setCurrentStepId] = useState(null)

  const [lastBrandResult, setLastBrandResult] = useState(null) // BrandDetectionResult
  const [lastStateResult, setLastStateResult] = useState(null) // {state, confidence, matchedKeywords}
  // "촬영 완료 -> 브랜드 확인 중 -> ~인식했어요 -> 현재 화면 확인 중 -> ~인식했어요" 순서
  // 표시(요구사항 10장)를 화면이 그대로 따라 그릴 수 있도록 분석 단계를 노출한다.
  const [analysisStage, setAnalysisStage] = useState('idle') // 'idle'|'brand'|'state'|'done'

  const [debugWords, setDebugWords] = useState([]) // 개발 모드 디버그 표시 + STEP6 버거 검증용
  const [lastAnalysisMs, setLastAnalysisMs] = useState(0)

  // 측정용 재사용 캔버스/참조들 (이전 버전과 동일)
  const measureCanvasRef = useRef(null)
  const prevMeasureImageDataRef = useRef(null)
  const stableSinceRef = useRef(null)
  const rafIdRef = useRef(null)
  const capturingRef = useRef(false)
  const captureTokenRef = useRef(0)

  // activeBrand를 ref로도 미러링해 비동기 콜백(analyzeImage 등)에서 항상 최신 값을
  // 읽게 한다(state는 클로저에 갇힐 수 있어 ref를 함께 쓴다 - 리액트 표준 패턴).
  const activeBrandRef = useRef(null)
  useEffect(() => {
    activeBrandRef.current = activeBrand
  }, [activeBrand])

  // 같은 화면 상태 안에 여러 안내 단계가 있을 때(예: 맘스터치 MOMS_SET_OPTION_TOP의
  // CHICKEN/BURGER/SCROLL) "처음 스텝으로 리셋"하지 않고 "마지막으로 본 단계 다음"부터
  // 이어가기 위한 인덱스 기록. 브랜드가 바뀌면 0으로 초기화된다.
  const lastVisitedStepIndexRef = useRef(-1)

  // 브랜드 전환 확인 팝업이 뜬 상태에서 사용자의 확인/취소를 기다리는 동안 보관해둘
  // "이미 분석된" OCR 결과. 확인/취소 시 재촬영 없이 이 값으로 상태 판별을 마저 진행한다.
  const pendingWordsRef = useRef(null)
  const pendingTokenRef = useRef(null)

  const beginCapture = useCallback(() => {
    startCamera()
  }, [startCamera])

  useEffect(() => {
    if (cameraStatus === 'denied' || cameraStatus === 'unsupported' || cameraStatus === 'error') {
      setPhase(PHASE.CAMERA_ERROR)
      return
    }
    if (cameraStatus === 'active') {
      setPhase((prev) => (prev === PHASE.CAMERA_PREPARING || prev === PHASE.RETAKING ? PHASE.ALIGNING : prev))
    }
  }, [cameraStatus, PHASE])

  /** 현재 촬영 영역의 점유율/흔들림을 측정하고 조건이 유지되면 자동 촬영한다(이전 버전과 동일). */
  const runAlignmentCheck = useCallback(
    (now) => {
      const video = videoRef.current
      const guideEl = guideElementRef.current
      if (!video || !guideEl || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return

      const roi = getRoiInVideoCoords(video, guideEl)
      if (!roi) return

      if (!measureCanvasRef.current) measureCanvasRef.current = document.createElement('canvas')
      const canvas = measureCanvasRef.current
      const measureScale = Math.min(1, MEASURE_MAX_WIDTH / roi.width)
      canvas.width = Math.max(1, Math.round(roi.width * measureScale))
      canvas.height = Math.max(1, Math.round(roi.height * measureScale))

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(video, roi.x, roi.y, roi.width, roi.height, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const edgeDensity = computeEdgeDensity(imageData)
      const diff = prevMeasureImageDataRef.current ? computeFrameDiff(prevMeasureImageDataRef.current, imageData) : Infinity
      prevMeasureImageDataRef.current = imageData

      const filled = edgeDensity >= FILL_EDGE_THRESHOLD
      const stable = diff <= STABILITY_DIFF_THRESHOLD

      setFillRatio(Math.min(1, edgeDensity / FILL_EDGE_THRESHOLD))
      setIsStable(stable)

      if (filled && stable) {
        if (stableSinceRef.current == null) stableSinceRef.current = now
        const elapsed = now - stableSinceRef.current
        setCountdownProgress(Math.min(1, elapsed / AUTO_CAPTURE_STABLE_MS))
        setPhase((prev) => (prev === PHASE.ALIGNING ? PHASE.COUNTDOWN : prev))

        if (elapsed >= AUTO_CAPTURE_STABLE_MS && !capturingRef.current) {
          // eslint-disable-next-line no-use-before-define
          capture()
        }
      } else {
        stableSinceRef.current = null
        setCountdownProgress(0)
        setPhase((prev) => (prev === PHASE.COUNTDOWN ? PHASE.ALIGNING : prev))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [PHASE],
  )

  useEffect(() => {
    if (phase !== PHASE.ALIGNING && phase !== PHASE.COUNTDOWN) return undefined

    let cancelled = false
    let lastCheck = 0

    const loop = (now) => {
      if (cancelled) return
      if (now - lastCheck >= CHECK_INTERVAL_MS) {
        lastCheck = now
        runAlignmentCheck(now)
      }
      rafIdRef.current = requestAnimationFrame(loop)
    }

    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [phase, runAlignmentCheck, PHASE])

  /**
   * 이전 활성 브랜드(prevBrand)와 이번에 새로 판별된 brandResult를 비교해 이번 사이클에
   * 실제로 적용할 브랜드를 결정한다(요구사항 4장의 4가지 규칙을 그대로 구현).
   *
   * @param {string|null} prevBrand
   * @param {import('../types/kiosk').BrandDetectionResult} brandResult
   * @param {{state:string|null}|null} activeBrandStateResult - prevBrand가 있고 brandResult가
   *   UNKNOWN일 때만 계산해서 넘겨준다("브랜드 키워드는 안 보여도 화면 상태가 명확하면 유지").
   * @returns {{ brand: string|null, needsConfirmation: boolean, candidateBrand?: string }}
   */
  function resolveBrandTransition(prevBrand, brandResult, activeBrandStateResult) {
    // 세션 첫 촬영: 판별된 값을 그대로 쓴다(UNKNOWN이면 브랜드 미확정 상태로 남긴다).
    if (!prevBrand) {
      if (brandResult.brand === KIOSK_BRAND.UNKNOWN) return { brand: null, needsConfirmation: false }
      return { brand: brandResult.brand, needsConfirmation: false }
    }

    // 규칙 1: 이전 브랜드와 같은 결과 -> 그대로 진행.
    if (brandResult.brand === prevBrand) {
      return { brand: prevBrand, needsConfirmation: false }
    }

    // 규칙 2: 브랜드 고유 키워드가 안 보여도(UNKNOWN) 활성 브랜드의 화면 상태가 명확하면 유지.
    if (brandResult.brand === KIOSK_BRAND.UNKNOWN) {
      if (activeBrandStateResult?.state) {
        return { brand: prevBrand, needsConfirmation: false }
      }
      // 상태도 불명확하면 "브랜드 불확실" 화면으로 보낸다(즉시 실패 대신 재촬영/직접선택 제공).
      return { brand: null, needsConfirmation: false }
    }

    // 여기부터는 "활성 브랜드가 아닌 다른 브랜드"로 판정된 경우.
    // 규칙 3+4: 신뢰도가 충분히 높을 때만 전환을 "확인"받고, 약하면 무시하고 기존 브랜드 유지.
    if (brandResult.confidence >= BRAND_CHANGE_CONFIRM_THRESHOLD) {
      return { brand: prevBrand, needsConfirmation: true, candidateBrand: brandResult.brand }
    }

    return { brand: prevBrand, needsConfirmation: false }
  }

  /**
   * 브랜드가 확정된 뒤(또는 확인 팝업에서 결정된 뒤) 그 브랜드의 상태 판별기를 돌려
   * 해당하는 flow 스텝으로 이동한다. 브랜드 판별과 상태 판별을 분리한 이유는, 브랜드
   * 전환 확인 팝업에서 사용자가 "예/아니오"를 고를 때까지 상태 판별을 미뤄야 하기 때문이다
   * (confirmBrandChange/cancelBrandChange에서도 이 함수를 그대로 재사용한다).
   */
  const finalizeBrandAndDetectState = useCallback(
    (brand, words, token) => {
      if (captureTokenRef.current !== token) return // 그사이 다시 촬영됨 - 폐기

      const brandChanged = activeBrandRef.current !== brand
      activeBrandRef.current = brand
      setActiveBrand(brand)
      setPendingBrandChange(null)
      if (brandChanged) lastVisitedStepIndexRef.current = -1

      setAnalysisStage('state')

      const brandConfig = BRAND_REGISTRY[brand]
      const stateResult = brandConfig.detectState(words)
      setLastStateResult(stateResult)

      if (!stateResult.state) {
        setAnalysisStage('done')
        setPhase(PHASE.LOW_CONFIDENCE)
        return
      }

      // 같은 상태를 가진 스텝이 여러 개면(예: 맘스터치 옵션 화면의 CHICKEN/BURGER/SCROLL),
      // 항상 첫 스텝으로 리셋하지 않고 "지금까지 진행한 위치 다음"부터 이어간다.
      const candidateIndices = brandConfig.flowSteps
        .map((step, index) => (step.state === stateResult.state ? index : -1))
        .filter((index) => index !== -1)

      let targetIndex
      if (candidateIndices.length <= 1) {
        targetIndex = candidateIndices[0] ?? 0
      } else {
        const nextUnvisited = candidateIndices.find((index) => index > lastVisitedStepIndexRef.current)
        targetIndex = nextUnvisited ?? candidateIndices[0]
      }

      const matchedStep = brandConfig.flowSteps[targetIndex]
      setCurrentStepId(matchedStep.id)
      setAnalysisStage('done')
      setPhase(PHASE.GUIDING)
    },
    [BRAND_REGISTRY, PHASE],
  )

  /** 촬영된 이미지 한 장을 분석한다: OCR 1회 -> 브랜드 판별 -> (필요시 확인) -> 상태 판별. */
  const analyzeImage = useCallback(
    async (canvas, token) => {
      setPhase(PHASE.ANALYZING)
      setAnalysisStage('brand')
      const startedAt = performance.now()

      try {
        // 요구사항: 촬영 이미지당 OCR은 한 번만 실행하고, 그 결과를 브랜드 판별과 화면
        // 상태 판별에 함께 사용한다.
        const words = await recognize(canvas)
        if (captureTokenRef.current !== token) return // 그사이 다시 촬영됨 - 폐기

        setDebugWords(words)

        // 색상은 어디까지나 "보조 점수"라 실패해도 브랜드 판별 자체는 계속 진행해야 한다.
        let colorProfile
        try {
          const ctx = canvas.getContext('2d')
          colorProfile = sampleColorProfile(ctx.getImageData(0, 0, canvas.width, canvas.height))
        } catch (colorErr) {
          console.warn('[useKioskCapture] 색상 분석 실패(보조 신호이므로 무시하고 계속):', colorErr)
        }

        const brandResult = detectKioskBrand(words, colorProfile)
        setLastBrandResult(brandResult)
        setLastAnalysisMs(Math.round(performance.now() - startedAt))

        const activeBrandStateResult =
          brandResult.brand === KIOSK_BRAND.UNKNOWN && activeBrandRef.current
            ? BRAND_REGISTRY[activeBrandRef.current].detectState(words)
            : null

        const resolved = resolveBrandTransition(activeBrandRef.current, brandResult, activeBrandStateResult)

        if (resolved.needsConfirmation) {
          // 사용자에게 "다른 키오스크가 감지됐어요" 확인을 받는 동안 결과를 보관해둔다.
          pendingWordsRef.current = words
          pendingTokenRef.current = token
          setPendingBrandChange(resolved.candidateBrand)
          setPhase(PHASE.BRAND_CONFIRM)
          return
        }

        if (!resolved.brand) {
          setLastStateResult(null)
          setAnalysisStage('done')
          setPhase(PHASE.LOW_CONFIDENCE)
          return
        }

        finalizeBrandAndDetectState(resolved.brand, words, token)
      } catch (err) {
        console.error('[useKioskCapture] 이미지 분석 실패:', err)
        if (captureTokenRef.current === token) {
          setAnalysisStage('done')
          setPhase(PHASE.LOW_CONFIDENCE)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recognize, finalizeBrandAndDetectState, BRAND_REGISTRY, PHASE],
  )

  /** 자동/수동 공통 촬영 로직(이전 버전과 동일 - 가이드 내부만 잘라 저장하고 카메라를 끈다). */
  const capture = useCallback(async () => {
    if (capturingRef.current) return
    const video = videoRef.current
    const guideEl = guideElementRef.current
    if (!video || !guideEl) return

    const roi = getRoiInVideoCoords(video, guideEl)
    if (!roi) return

    const cropped = cropRoiCanvas(video, roi)
    if (!cropped) return

    capturingRef.current = true
    const token = ++captureTokenRef.current

    const dataUrl = cropped.canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage({ dataUrl, width: cropped.canvas.width, height: cropped.canvas.height })
    setPhase(PHASE.CAPTURED)
    stableSinceRef.current = null
    setCountdownProgress(0)

    // 요구사항: 촬영 후 카메라 스트림 정리.
    stopCamera()

    await analyzeImage(cropped.canvas, token)
    capturingRef.current = false
  }, [videoRef, stopCamera, analyzeImage, PHASE])

  const captureManually = useCallback(() => {
    capture()
  }, [capture])

  /** "다시 촬영" - 카메라를 재실행하고 정렬 화면으로 되돌아간다. activeBrand는 유지한다. */
  const retake = useCallback(async () => {
    captureTokenRef.current += 1 // 진행 중이던 분석 결과 무효화
    setCapturedImage(null)
    setPendingBrandChange(null)
    prevMeasureImageDataRef.current = null
    stableSinceRef.current = null
    setCountdownProgress(0)
    setFillRatio(0)
    setIsStable(false)
    setPhase(PHASE.RETAKING)
    await startCamera()
  }, [startCamera, PHASE])

  const captureNextScreen = useCallback(() => {
    retake()
  }, [retake])

  const advanceOnSameCapture = useCallback(() => {
    if (!activeBrand) return
    const step = BRAND_REGISTRY[activeBrand].flowSteps.find((s) => s.id === currentStepId)
    if (step?.sameCaptureNextId) {
      setCurrentStepId(step.sameCaptureNextId)
    }
  }, [BRAND_REGISTRY, activeBrand, currentStepId])

  const goToPrevStep = useCallback(() => {
    if (!activeBrand) return
    const steps = BRAND_REGISTRY[activeBrand].flowSteps
    const idx = steps.findIndex((s) => s.id === currentStepId)
    if (idx > 0) setCurrentStepId(steps[idx - 1].id)
  }, [BRAND_REGISTRY, activeBrand, currentStepId])

  /** 브랜드 전환 확인 팝업 - "예, OOO 안내로 변경할게요". */
  const confirmBrandChange = useCallback(() => {
    const words = pendingWordsRef.current
    const token = pendingTokenRef.current
    const brand = pendingBrandChange
    if (!words || !brand) return
    finalizeBrandAndDetectState(brand, words, token)
  }, [pendingBrandChange, finalizeBrandAndDetectState])

  /** 브랜드 전환 확인 팝업 - "아니요" (기존 활성 브랜드를 유지한 채 상태만 다시 판별). */
  const cancelBrandChange = useCallback(() => {
    const words = pendingWordsRef.current
    const token = pendingTokenRef.current
    const brand = activeBrandRef.current
    setPendingBrandChange(null)
    if (!words || !brand) {
      setAnalysisStage('done')
      setPhase(PHASE.LOW_CONFIDENCE)
      return
    }
    finalizeBrandAndDetectState(brand, words, token)
  }, [finalizeBrandAndDetectState, PHASE])

  /** "화면 직접 선택" - 인식이 틀렸을 때 사용자가 (이미 정해진) 활성 브랜드 안에서 상태를 고른다. */
  const selectStateManually = useCallback(
    (state) => {
      if (!activeBrand) return
      const step = BRAND_REGISTRY[activeBrand].flowSteps.find((s) => s.state === state)
      if (!step) return
      setCurrentStepId(step.id)
      setLastStateResult({ state, confidence: 1, matchedKeywords: [] })
      setPhase(PHASE.GUIDING)
    },
    [BRAND_REGISTRY, activeBrand, PHASE],
  )

  /**
   * "메가커피 직접 선택" / "맘스터치 직접 선택" - 브랜드 자체를 확신하지 못했을 때
   * (activeBrand가 없을 때) 쓰는 보조 기능이다. 브랜드를 이걸로 먼저 골라야만 쓸 수 있는
   * "처음부터 브랜드 선택" 방식이 되지 않도록, 자동판별이 실패했을 때만 노출한다(요구사항 2장).
   */
  const selectBrandManually = useCallback((brand) => {
    activeBrandRef.current = brand
    setActiveBrand(brand)
    lastVisitedStepIndexRef.current = -1
    setPhase(PHASE.SELECTING_STATE)
  }, [PHASE])

  const openStateSelector = useCallback(() => setPhase(PHASE.SELECTING_STATE), [PHASE])
  const closeStateSelector = useCallback(() => {
    setPhase(currentStepId ? PHASE.GUIDING : PHASE.LOW_CONFIDENCE)
  }, [currentStepId, PHASE])

  // currentStepId가 바뀔 때마다(수동 이동 포함) "마지막으로 본 위치"를 기록해, 다음 촬영이
  // 같은 상태로 돌아왔을 때 처음 스텝으로 되돌리지 않고 이어갈 수 있게 한다.
  useEffect(() => {
    if (!activeBrand || !currentStepId) return
    const idx = BRAND_REGISTRY[activeBrand].flowSteps.findIndex((s) => s.id === currentStepId)
    if (idx >= 0) lastVisitedStepIndexRef.current = idx
  }, [BRAND_REGISTRY, activeBrand, currentStepId])

  // BRAND_REGISTRY[brand].flowSteps 자체는 안정적인(모듈 최상단에 고정된) 배열이지만,
  // "activeBrand ? ... : []" 삼항식은 매 렌더마다 새 빈 배열을 만들어 아래 useMemo들의
  // 의존성 배열이 매번 바뀌었다고 오인되므로, activeBrand가 실제로 바뀔 때만 재계산되게
  // useMemo로 한 번 더 감싼다.
  const activeFlowSteps = useMemo(() => (activeBrand ? BRAND_REGISTRY[activeBrand].flowSteps : []), [BRAND_REGISTRY, activeBrand])
  const currentStep = useMemo(() => activeFlowSteps.find((s) => s.id === currentStepId) ?? null, [activeFlowSteps, currentStepId])
  const currentStepIndex = useMemo(() => activeFlowSteps.findIndex((s) => s.id === currentStepId), [activeFlowSteps, currentStepId])

  /** 화면/앱 전체를 처음 상태로 되돌린다("처음부터 다시 보기" 등에서 사용). */
  const reset = useCallback(() => {
    captureTokenRef.current += 1
    setPhase(PHASE.CAMERA_PREPARING)
    setCapturedImage(null)
    setActiveBrand(null)
    activeBrandRef.current = null
    setPendingBrandChange(null)
    setCurrentStepId(null)
    setLastBrandResult(null)
    setLastStateResult(null)
    setAnalysisStage('idle')
    setFillRatio(0)
    setIsStable(false)
    setCountdownProgress(0)
    lastVisitedStepIndexRef.current = -1
    prevMeasureImageDataRef.current = null
    stableSinceRef.current = null
  }, [PHASE])

  return {
    PHASE,
    phase,
    videoRef,
    guideElementRef,
    cameraStatus,
    cameraErrorType: errorType,
    ocrReady,
    fillRatio,
    isStable,
    countdownProgress,
    capturedImage,
    activeBrand,
    pendingBrandChange,
    currentStep,
    currentStepIndex,
    totalSteps: activeFlowSteps.length,
    lastBrandResult,
    lastStateResult,
    analysisStage,
    debugWords,
    lastAnalysisMs,
    // actions
    beginCapture,
    captureManually,
    retake,
    captureNextScreen,
    advanceOnSameCapture,
    goToPrevStep,
    selectStateManually,
    selectBrandManually,
    confirmBrandChange,
    cancelBrandChange,
    openStateSelector,
    closeStateSelector,
    reset,
  }
}

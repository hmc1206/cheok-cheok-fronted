import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cropRoiCanvas } from '../services/ocrService'
import { getRoiInVideoCoords } from '../services/coordinateMapper'
import { computeEdgeDensity, computeFrameDiff } from '../services/captureQuality'
import { classifyScreenState } from '../services/screenStateClassifier'
import { useCamera } from './useCamera'
import { useOCR } from './useOCR'

/**
 * "촬영 기반" 키오스크 안내 엔진.
 *
 * 기존 KioskLiveScreen/useKioskRecognition은 카메라 영상을 계속 실시간으로 OCR하면서
 * AR을 그렸다(연속 인식 방식). 이 훅은 완전히 다른 방식이다:
 *   카메라 실행 -> 가이드에 화면을 맞춤 -> 안정되면 "사진 한 장"을 찍음 -> 카메라를 끔
 *   -> 그 사진 한 장만 분석 -> 사진 위에 고정된 AR을 그림 -> 사용자가 실제 키오스크를 조작
 *   -> "다음 화면 촬영"을 누르면 다시 카메라를 켜고 반복
 *
 * 브랜드(메가커피 등)에 종속된 로직은 전혀 없다 - 어떤 브랜드의 flow 데이터(예:
 * data/megaFlow.js와 같은 모양)를 넘기든 그대로 동작한다. 나중에 맘스터치도 같은 방식으로
 * 옮길 때 이 훅은 그대로 두고 momsFlow.js 같은 데이터 파일만 새로 만들어 넘기면 된다.
 *
 * @param {Object} params
 * @param {Array} params.flowSteps - MegaFlowStep[] 형태의 단계 배열(순서대로 진행됨)
 * @param {Record<string, Array<{text:string, weight:number}>>} params.stateKeywords - 상태별 키워드 맵
 * @param {number} params.confidenceThreshold - classifyScreenState에 넘길 임계값
 * @param {string} params.firstStepId - 최초 진입 시 보여줄 스텝 id
 */
export function useKioskCapture({ flowSteps, stateKeywords, confidenceThreshold, firstStepId }) {
  // 관리할 화면 상태(요구사항 7장): 카메라 준비/화면 정렬 중/자동 촬영 카운트다운/
  // 촬영 완료/분석 중/안내 중(=상태 판정 완료 직후)/다시 촬영/직접 화면 선택/카메라 오류.
  // "상태 판정 완료"는 ANALYZING -> GUIDING으로 넘어가는 순간에 recognitionResult가
  // 채워지는 것으로 표현한다(별도의 지속 화면이 필요 없어 순간적인 전이로 처리).
  const PHASE = useMemo(
    () => ({
      CAMERA_PREPARING: 'camera-preparing',
      ALIGNING: 'aligning',
      COUNTDOWN: 'countdown',
      CAPTURED: 'captured',
      ANALYZING: 'analyzing',
      GUIDING: 'guiding',
      LOW_CONFIDENCE: 'low-confidence',
      SELECTING_STATE: 'selecting-state',
      RETAKING: 'retaking',
      CAMERA_ERROR: 'camera-error',
    }),
    [],
  )

  // ── 튜닝 가능한 상수 ──────────────────────────────────────────────────
  // 정렬 상태(점유율/흔들림)를 측정하는 주기. 너무 짧으면 불필요하게 CPU를 쓴다.
  const CHECK_INTERVAL_MS = 150
  // 요구사항: "촬영 조건이 약 1.5초 유지되면 자동 촬영".
  const AUTO_CAPTURE_STABLE_MS = 1500
  // computeEdgeDensity가 이 값 이상이면 "가이드가 70% 이상 찼다"고 간주한다(휴리스틱).
  const FILL_EDGE_THRESHOLD = 0.35
  // computeFrameDiff(0~255 스케일)가 이 값 이하면 "흔들리지 않는다"고 간주한다.
  const STABILITY_DIFF_THRESHOLD = 6
  // 정렬/안정성 측정용으로 캔버스를 다운스케일할 목표 폭(px). 작을수록 빠르다.
  const MEASURE_MAX_WIDTH = 240

  const { videoRef, cameraStatus, errorType, startCamera, stopCamera } = useCamera()
  const { isReady: ocrReady, recognize } = useOCR()

  // CaptureGuide 컴포넌트가 렌더링하는 가이드 사각형 DOM에 이 ref를 붙여야
  // getRoiInVideoCoords로 실제 촬영 영역을 계산할 수 있다.
  const guideElementRef = useRef(null)

  const [phase, setPhase] = useState(PHASE.CAMERA_PREPARING)
  const [fillRatio, setFillRatio] = useState(0) // 0~1, 디버그/UI 표시용
  const [isStable, setIsStable] = useState(false)
  const [countdownProgress, setCountdownProgress] = useState(0) // 0~1
  const [capturedImage, setCapturedImage] = useState(null) // {dataUrl, width, height}
  const [currentStepId, setCurrentStepId] = useState(firstStepId)
  const [recognitionResult, setRecognitionResult] = useState(null) // {state, confidence, matchedKeywords}
  const [debugWords, setDebugWords] = useState([]) // 개발 모드 디버그 표시용 OCR 원시 결과
  const [lastAnalysisMs, setLastAnalysisMs] = useState(0)

  // 측정용 재사용 캔버스(매 프레임 새로 만들지 않기 위해 ref로 보관 - 메모리 압박 완화).
  const measureCanvasRef = useRef(null)
  const prevMeasureImageDataRef = useRef(null)
  const stableSinceRef = useRef(null) // 정렬 조건이 충족되기 시작한 시각(performance.now())
  const rafIdRef = useRef(null)
  const capturingRef = useRef(false) // 중복 촬영 방지 lock
  // 분석 도중 사용자가 "다시 촬영"을 눌러버리는 경쟁 상태를 막기 위한 토큰.
  // capture()마다 값을 올리고, retake()에서도 올려서 진행 중이던 분석 결과가
  // 뒤늦게 도착해 화면을 덮어쓰지 않도록 analyzeImage에서 토큰을 검사한다.
  const captureTokenRef = useRef(0)

  // 카메라는 이 훅이 mount되는 즉시 켜지 않는다. KioskCaptureScreen이 소개/권한 안내
  // 화면을 먼저 보여준 뒤, 사용자가 명시적으로 동의했을 때만 beginCapture()를 호출해
  // startCamera()가 실행되도록 한다(기존 KioskLiveScreen의 intro -> permission 흐름과
  // 동일한 게이팅 방식). 언마운트 시에는 useCamera 자체가 트랙을 정리해준다(기존 훅 재사용).
  const beginCapture = useCallback(() => {
    startCamera()
  }, [startCamera])

  // 카메라 상태 -> phase 반영 (권한 거부/카메라 없음/실행 실패를 CAMERA_ERROR로 통일)
  useEffect(() => {
    if (cameraStatus === 'denied' || cameraStatus === 'unsupported' || cameraStatus === 'error') {
      setPhase(PHASE.CAMERA_ERROR)
      return
    }
    if (cameraStatus === 'active') {
      setPhase((prev) => (prev === PHASE.CAMERA_PREPARING || prev === PHASE.RETAKING ? PHASE.ALIGNING : prev))
    }
  }, [cameraStatus, PHASE])

  /**
   * 현재 촬영 영역(가이드 사각형)의 점유율(occupancy 근사치)과 흔들림 정도를 측정하고,
   * 두 조건을 모두 만족한 채로 AUTO_CAPTURE_STABLE_MS 이상 유지되면 자동으로 촬영한다.
   */
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
      // 첫 측정에는 비교 대상이 없으므로 "불안정"으로 간주해 최소 한 번은 더 기다리게 한다.
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
        // 요구사항: 흔들리거나 가이드에서 벗어나면 타이머 초기화.
        stableSinceRef.current = null
        setCountdownProgress(0)
        setPhase((prev) => (prev === PHASE.COUNTDOWN ? PHASE.ALIGNING : prev))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [PHASE],
  )

  // 3) ALIGNING/COUNTDOWN 동안에만 정렬 측정 루프를 돌린다. requestAnimationFrame을 쓰되
  //    CHECK_INTERVAL_MS 간격으로만 실제 계산을 수행해 불필요한 연산을 줄인다.
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
   * 촬영된 이미지 한 장을 OCR로 분석해 화면 상태를 판별하고 해당 안내로 이동한다.
   * token: 이 분석을 시작시킨 capture() 호출의 토큰. 분석이 끝났을 때 그사이 사용자가
   * "다시 촬영"을 눌러 captureTokenRef가 바뀌어 있다면(=이 분석 결과는 더 이상 유효하지
   * 않음) 화면 갱신을 건너뛴다.
   */
  const analyzeImage = useCallback(
    async (canvas, token) => {
      setPhase(PHASE.ANALYZING)
      const startedAt = performance.now()

      try {
        const words = await recognize(canvas)
        if (captureTokenRef.current !== token) return // 그사이 다시 촬영됨 - 이 결과는 폐기

        setDebugWords(words)

        const result = classifyScreenState(words, stateKeywords, confidenceThreshold)
        setRecognitionResult(result)
        setLastAnalysisMs(Math.round(performance.now() - startedAt))

        if (!result.state) {
          // 인식 신뢰도가 낮다고 즉시 실패시키지 않고, "다시 촬영"/"직접 선택"을 고를 수 있는
          // 화면을 보여준다(요구사항 3장).
          setPhase(PHASE.LOW_CONFIDENCE)
          return
        }

        // 판별된 상태에 해당하는 플로우의 첫 스텝으로 이동한다. 재촬영은 항상 "새로운 화면"으로
        // 취급해, 이전에 STEP4a에 있었더라도 다시 MEGA_OPTION으로 판정되면 STEP4a부터 다시
        // 보여준다(사용자가 옵션을 다시 만졌을 수도 있으므로 안전한 쪽으로 리셋한다).
        const matchedStep = flowSteps.find((step) => step.state === result.state)
        setCurrentStepId(matchedStep ? matchedStep.id : firstStepId)
        setPhase(PHASE.GUIDING)
      } catch (err) {
        console.error('[useKioskCapture] 이미지 분석 실패:', err)
        if (captureTokenRef.current === token) setPhase(PHASE.LOW_CONFIDENCE)
      }
    },
    [recognize, stateKeywords, confidenceThreshold, flowSteps, firstStepId, PHASE],
  )

  /** 자동/수동 공통 촬영 로직. 가이드 내부만 잘라서 저장하고(cropRoiCanvas 재사용) 카메라를 끈다. */
  const capture = useCallback(async () => {
    if (capturingRef.current) return // 중복 촬영 방지
    const video = videoRef.current
    const guideEl = guideElementRef.current
    if (!video || !guideEl) return

    const roi = getRoiInVideoCoords(video, guideEl)
    if (!roi) return

    // 기존 ocrService.cropRoiCanvas를 그대로 재사용한다 - ROI clamp/최소 크기 검증까지
    // 이미 다 되어 있어 새로 만들 필요가 없다(표시용 이미지와 OCR용 이미지를 겸한다).
    const cropped = cropRoiCanvas(video, roi)
    if (!cropped) return

    capturingRef.current = true
    const token = ++captureTokenRef.current

    const dataUrl = cropped.canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage({ dataUrl, width: cropped.canvas.width, height: cropped.canvas.height })
    setPhase(PHASE.CAPTURED)
    stableSinceRef.current = null
    setCountdownProgress(0)

    // 요구사항: 촬영이 완료되면 카메라 스트림을 중지한다(자원 절약 + 다음 화면 촬영 전까지는
    // 카메라가 필요 없다).
    stopCamera()

    await analyzeImage(cropped.canvas, token)
    capturingRef.current = false
  }, [videoRef, stopCamera, analyzeImage, PHASE])

  /** 하단의 "직접 촬영" 버튼 - 자동 촬영이 안 될 때 사용자가 강제로 촬영한다. */
  const captureManually = useCallback(() => {
    capture()
  }, [capture])

  /** "다시 촬영" - 카메라를 재실행하고 정렬 화면으로 되돌아간다(요구사항 5장 전이 규칙). */
  const retake = useCallback(async () => {
    // 진행 중이던 분석이 있다면 그 결과가 나중에 도착해도 무시되도록 토큰을 무효화한다.
    captureTokenRef.current += 1
    setCapturedImage(null)
    setRecognitionResult(null)
    prevMeasureImageDataRef.current = null
    stableSinceRef.current = null
    setCountdownProgress(0)
    setFillRatio(0)
    setIsStable(false)
    setPhase(PHASE.RETAKING)
    await startCamera()
    // startCamera 완료 후 cameraStatus effect가 ALIGNING으로 넘겨준다.
  }, [startCamera, PHASE])

  /**
   * 실제 키오스크 화면이 바뀌는 단계에서 호출한다: 다음 스텝으로 미리 넘겨둔 뒤(화면
   * 표시용) 곧바로 재촬영 흐름을 시작한다. 요구사항 5장의
   * "사용자 조작 -> 다음 화면 촬영 -> 카메라 재실행 -> 새 화면 촬영 -> 새 상태 판별 -> 새 안내"
   * 순서를 그대로 따른다 - 실제 새 스텝 결정은 재촬영 후 analyzeImage가 다시 판별해서 덮어쓴다.
   */
  const captureNextScreen = useCallback(() => {
    retake()
  }, [retake])

  /** 같은 사진을 유지한 채(재촬영 없이) 다음 안내 문구로만 넘어간다(예: "원하는 상품이 이미 보여요"). */
  const advanceOnSameCapture = useCallback(() => {
    const step = flowSteps.find((s) => s.id === currentStepId)
    if (step?.sameCaptureNextId) {
      setCurrentStepId(step.sameCaptureNextId)
    }
  }, [flowSteps, currentStepId])

  /** 이전 안내로 돌아간다(같은 사진 기준, 재촬영하지 않는다). */
  const goToPrevStep = useCallback(() => {
    const idx = flowSteps.findIndex((s) => s.id === currentStepId)
    if (idx > 0) setCurrentStepId(flowSteps[idx - 1].id)
  }, [flowSteps, currentStepId])

  /** "화면 직접 선택" - 인식이 틀렸을 때 사용자가 직접 현재 상태를 고른다. */
  const selectStateManually = useCallback(
    (state) => {
      const step = flowSteps.find((s) => s.state === state)
      if (!step) return
      setCurrentStepId(step.id)
      setRecognitionResult({ state, confidence: 1, matchedKeywords: [], manual: true })
      setPhase(PHASE.GUIDING)
    },
    [flowSteps, PHASE],
  )

  const openStateSelector = useCallback(() => setPhase(PHASE.SELECTING_STATE), [PHASE])
  const closeStateSelector = useCallback(() => {
    // 취소 시에는 이전 화면(있으면 GUIDING, 없으면 LOW_CONFIDENCE)으로 되돌아간다.
    setPhase(recognitionResult?.state ? PHASE.GUIDING : PHASE.LOW_CONFIDENCE)
  }, [recognitionResult, PHASE])

  const currentStep = useMemo(() => flowSteps.find((s) => s.id === currentStepId) ?? null, [flowSteps, currentStepId])
  const currentStepIndex = useMemo(() => flowSteps.findIndex((s) => s.id === currentStepId), [flowSteps, currentStepId])

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
    currentStep,
    currentStepIndex,
    totalSteps: flowSteps.length,
    recognitionResult,
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
    openStateSelector,
    closeStateSelector,
  }
}

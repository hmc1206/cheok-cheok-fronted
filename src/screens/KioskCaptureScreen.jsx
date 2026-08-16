import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { AnalysisProgress } from '../components/kiosk/AnalysisProgress'
import { AROverlayDebugPanel } from '../components/kiosk/AROverlayDebugPanel'
import { BrandBadge } from '../components/kiosk/BrandBadge'
import { BrandMismatchConfirm } from '../components/kiosk/BrandMismatchConfirm'
import { CameraErrorUI } from '../components/kiosk/CameraErrorUI'
import { CaptureGuide } from '../components/kiosk/CaptureGuide'
import { CapturedScreenGuide } from '../components/kiosk/CapturedScreenGuide'
import { InstructionPanel } from '../components/kiosk/InstructionPanel'
import { KioskCamera } from '../components/kiosk/KioskCamera'
import { KioskIntroStep } from '../components/kiosk/KioskIntroStep'
import { KioskMobileLayout } from '../components/kiosk/KioskMobileLayout'
import { KioskPermissionStep } from '../components/kiosk/KioskPermissionStep'
import { StateSelector } from '../components/kiosk/StateSelector'
import { MEGA_STATE_LABELS } from '../data/megaFlow'
import { checkBurgerRequestMismatch, MOMS_TOUCH_STATE_LABELS } from '../data/momsTouchFlow'
import { useKioskCapture } from '../hooks/useKioskCapture'
import { useSpeech } from '../hooks/useSpeech'
import { KIOSK_BRAND } from '../types/kiosk'

// 브랜드별 "화면 직접 선택" 목록에 쓸 라벨 사전. StateSelector는 브랜드에 종속되지 않는
// 범용 컴포넌트라, 어떤 사전을 넘길지는 이 화면이 activeBrand를 보고 결정한다.
const STATE_LABELS_BY_BRAND = {
  [KIOSK_BRAND.MEGA]: MEGA_STATE_LABELS,
  [KIOSK_BRAND.MOMS_TOUCH]: MOMS_TOUCH_STATE_LABELS,
}

// STEP6(맘스터치 버거 요청사항 팝업)에서만 쓰는 상품명 검증 - 다른 스텝에서는 이 id가
// 아니므로 그냥 넘어간다. 특정 스텝 id에 종속된 검증이라 브랜드 데이터 파일
// (momsTouchFlow.js)에 함께 두고 여기서는 스텝 id로만 분기한다.
const BURGER_REQUEST_STEP_ID = 'moms-6-burger-request'

/**
 * 메가커피 + 맘스터치 "공통" 촬영 기반 키오스크 안내 화면.
 *
 * 브랜드를 먼저 고르게 하지 않는다(요구사항 1장) - 카메라 하나로 촬영한 뒤, OCR 결과로
 * 메가커피/맘스터치를 자동 판별하고 그 브랜드의 flow로 안내한다. 판별 로직은
 * recognition/detectKioskBrand.js + detectMegaState.js/detectMomsTouchState.js에,
 * 브랜드별 안내 데이터는 data/megaFlow.js/momsTouchFlow.js에 있고, 이 화면은 그
 * 결과(useKioskCapture)를 받아 그리기만 한다.
 *
 * 기존 실시간 엔진(useKioskRecognition/useARTracking/megaCoffeeGuide.js/
 * momsTouchGuide.js/kioskBrands.js/kioskClassifier.js/KioskLiveScreen.jsx 등)은
 * 이번 작업에서도 한 줄도 건드리지 않았다 - "/kiosk-legacy" 경로로 그대로 남아있다.
 */
export function KioskCaptureScreen() {
  const navigate = useNavigate()

  // intro -> permission -> camera (camera 안에서는 capture.phase로 세부 화면을 나눈다)
  const [stepState, setStepState] = useState('intro')

  const { speak, stop: stopSpeech, isMuted, toggleMute } = useSpeech()

  // 브랜드에 종속되지 않는 범용 훅 - 더 이상 flow를 인자로 받지 않는다(내부에서 두
  // 브랜드를 모두 알고 있다가, OCR 결과로 판별된 쪽을 쓴다).
  const capture = useKioskCapture()
  const { PHASE } = capture

  const handleGoHome = useCallback(() => {
    stopSpeech()
    navigate('/home')
  }, [navigate, stopSpeech])

  const handleStartIntro = useCallback(() => setStepState('permission'), [])

  const handleRequestPermission = useCallback(() => {
    setStepState('camera')
    capture.beginCapture()
  }, [capture])

  // 이 촬영 기반 방식은 "카메라 없이 도움받기" 시뮬레이션 모드를 제공하지 않는다
  // (요구사항에 해당 내용이 없어 범위를 넘는 기능을 임의로 만들지 않았음 - 알려진 제한사항).
  const handleBypassCamera = useCallback(() => {
    handleGoHome()
  }, [handleGoHome])

  // guiding 상태로 들어오거나 스텝이 바뀔 때마다 안내 음성을 자동 재생한다.
  const prevSpokenStepIdRef = useRef(null)
  useEffect(() => {
    if (capture.phase !== PHASE.GUIDING || !capture.currentStep) return
    if (prevSpokenStepIdRef.current === capture.currentStep.id) return
    prevSpokenStepIdRef.current = capture.currentStep.id
    speak(capture.currentStep.instruction)
  }, [capture.phase, capture.currentStep, PHASE.GUIDING, speak])

  const handleReListen = useCallback(() => {
    if (capture.currentStep) speak(capture.currentStep.instruction)
  }, [capture.currentStep, speak])

  const isCameraLikePhase =
    capture.phase === PHASE.CAMERA_PREPARING ||
    capture.phase === PHASE.ALIGNING ||
    capture.phase === PHASE.COUNTDOWN ||
    capture.phase === PHASE.RETAKING

  // 브랜드 확인 팝업(BRAND_CONFIRM)도 "촬영한 이미지를 계속 보여주는" 화면군에 포함한다.
  const isCapturedLikePhase =
    capture.phase === PHASE.CAPTURED ||
    capture.phase === PHASE.ANALYZING ||
    capture.phase === PHASE.BRAND_CONFIRM ||
    capture.phase === PHASE.GUIDING ||
    capture.phase === PHASE.LOW_CONFIDENCE ||
    capture.phase === PHASE.SELECTING_STATE

  // 지금 열려 있는(또는 열려던) StateSelector에 넘길 라벨 사전 - activeBrand 기준.
  const stateLabelsForSelector = capture.activeBrand ? STATE_LABELS_BY_BRAND[capture.activeBrand] : null

  // 요구사항 6장: STEP6(버거 요청사항 팝업)에서 목표(아라비아따치즈버거)가 아닌 다른
  // 버거가 감지되면 경고 문구를 보여준다. 이 스텝일 때만 계산한다(불필요한 연산 방지).
  const burgerMismatchWarning = useMemo(() => {
    if (capture.currentStep?.id !== BURGER_REQUEST_STEP_ID) return null
    return checkBurgerRequestMismatch(capture.debugWords)
  }, [capture.currentStep, capture.debugWords])

  // "현재 화면 확인 중 -> OOO 화면을 인식했어요" 표시용 - 판별된 상태의 사람이 읽는 라벨.
  const recognizedStateLabel =
    capture.activeBrand && capture.lastStateResult?.state ? STATE_LABELS_BY_BRAND[capture.activeBrand]?.[capture.lastStateResult.state] : null

  return (
    <AppFrame>
      <KioskMobileLayout>
        {/* 1. 소개 화면 */}
        {stepState === 'intro' && <KioskIntroStep onNext={handleStartIntro} onBack={handleGoHome} />}

        {/* 2. 권한 안내 화면 */}
        {stepState === 'permission' && (
          <KioskPermissionStep onRequestPermission={handleRequestPermission} onBack={() => setStepState('intro')} />
        )}

        {/* 3. 카메라 오류 화면(권한 거부/카메라 없음/실행 실패를 구분해 CameraErrorUI가 안내) */}
        {stepState === 'camera' && capture.phase === PHASE.CAMERA_ERROR && (
          <CameraErrorUI errorType={capture.cameraErrorType} onRetry={capture.beginCapture} onBypassCamera={handleBypassCamera} />
        )}

        {/* 4. 카메라 정렬/촬영 화면 - 메가커피/맘스터치 공용(브랜드를 미리 고르지 않는다) */}
        {stepState === 'camera' && isCameraLikePhase && (
          <div className="relative w-full flex-1 bg-black overflow-hidden">
            <KioskCamera videoRef={capture.videoRef} cameraStatus={capture.cameraStatus} />
            <CaptureGuide
              guideRef={capture.guideElementRef}
              fillRatio={capture.fillRatio}
              isStable={capture.isStable}
              countdownProgress={capture.countdownProgress}
              phase={capture.phase}
              onManualCapture={capture.captureManually}
              onExit={handleGoHome}
            />
          </div>
        )}

        {/* 5. 촬영 후 안내 화면: 상단 70~75% 촬영 이미지+AR, 하단 25~30% 안내 문구 */}
        {stepState === 'camera' && isCapturedLikePhase && capture.capturedImage && (
          <div className="relative w-full flex-1 bg-black flex flex-col overflow-hidden">
            <div className="h-[72%] w-full relative">
              <CapturedScreenGuide
                capturedImage={capture.capturedImage}
                currentStep={capture.currentStep}
                phase={capture.phase}
                onRetake={capture.retake}
                onOpenStateSelector={capture.openStateSelector}
                brandBadge={capture.activeBrand && capture.phase !== PHASE.ANALYZING ? <BrandBadge brand={capture.activeBrand} /> : null}
                analyzingNode={
                  capture.phase === PHASE.ANALYZING || capture.phase === PHASE.CAPTURED ? (
                    <AnalysisProgress analysisStage={capture.analysisStage} brand={capture.activeBrand} stateLabel={recognizedStateLabel} />
                  ) : null
                }
              />

              {/* 브랜드 전환 확인 팝업(요구사항 4장) - 촬영 이미지 위에 덮어 표시 */}
              {capture.phase === PHASE.BRAND_CONFIRM && (
                <BrandMismatchConfirm
                  candidateBrand={capture.pendingBrandChange}
                  onConfirm={capture.confirmBrandChange}
                  onCancel={capture.cancelBrandChange}
                />
              )}

              {/* "화면 직접 선택" - activeBrand가 정해진 뒤에만 그 브랜드의 상태 목록을 보여준다 */}
              {capture.phase === PHASE.SELECTING_STATE && stateLabelsForSelector && (
                <StateSelector stateLabels={stateLabelsForSelector} onSelect={capture.selectStateManually} onClose={capture.closeStateSelector} />
              )}

              {/* 개발 모드 전용 디버그 패널 - 운영 화면에는 표시되지 않는다(요구사항 10장)
              {import.meta.env.DEV && (
                <AROverlayDebugPanel
                  phase={capture.phase}
                  activeBrand={capture.activeBrand}
                  lastBrandResult={capture.lastBrandResult}
                  lastStateResult={capture.lastStateResult}
                  debugWords={capture.debugWords}
                  lastAnalysisMs={capture.lastAnalysisMs}
                  ocrReady={capture.ocrReady}
                />
              )} */}
            </div>

            <div className="h-[28%] w-full">
              {capture.phase === PHASE.LOW_CONFIDENCE ? (
                // 브랜드 자체가 불확실(activeBrand 없음)한 경우와, 브랜드는 알지만 화면
                // 상태만 불확실한 경우를 구분한다(요구사항 2장 vs 6장 - 버튼 구성이 다르다).
                <div className="w-full h-full bg-neutral-950 text-white flex flex-col p-4 gap-3 justify-center">
                  {capture.activeBrand ? (
                    <>
                      <p className="text-xl font-extrabold text-red-300 leading-snug">현재 화면을 정확하게 확인하지 못했어요.</p>
                      <p className="text-sm text-neutral-300 font-medium">다시 촬영하거나, 지금 보이는 화면을 직접 선택해주세요.</p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={capture.retake}
                          className="min-h-[48px] rounded-xl font-extrabold text-sm bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg transition-all"
                        >
                          다시 촬영
                        </button>
                        <button
                          type="button"
                          onClick={capture.openStateSelector}
                          className="min-h-[48px] rounded-xl font-bold text-sm bg-neutral-800 border border-neutral-600 text-white hover:bg-neutral-700 transition-all"
                        >
                          {capture.activeBrand === KIOSK_BRAND.MEGA ? '메가커피' : '맘스터치'} 화면 직접 선택
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-extrabold text-red-300 leading-snug">키오스크 브랜드를 정확하게 확인하지 못했어요.</p>
                      <p className="text-sm text-neutral-300 font-medium">다시 촬영하거나, 지금 보이는 브랜드를 직접 선택해주세요.</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={capture.retake}
                          className="min-h-[48px] rounded-xl font-extrabold text-xs bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg transition-all"
                        >
                          다시 촬영
                        </button>
                        <button
                          type="button"
                          onClick={() => capture.selectBrandManually(KIOSK_BRAND.MEGA)}
                          className="min-h-[48px] rounded-xl font-bold text-xs bg-neutral-800 border border-neutral-600 text-white hover:bg-neutral-700 transition-all"
                        >
                          메가커피
                          <br />
                          직접 선택
                        </button>
                        <button
                          type="button"
                          onClick={() => capture.selectBrandManually(KIOSK_BRAND.MOMS_TOUCH)}
                          className="min-h-[48px] rounded-xl font-bold text-xs bg-neutral-800 border border-neutral-600 text-white hover:bg-neutral-700 transition-all"
                        >
                          맘스터치
                          <br />
                          직접 선택
                        </button>
                      </div>
                    </>
                  )}
                  <button type="button" onClick={handleGoHome} className="text-sm font-semibold text-neutral-400 underline underline-offset-4 mt-1">
                    그만두고 홈으로 가기
                  </button>
                </div>
              ) : capture.phase === PHASE.ANALYZING || capture.phase === PHASE.CAPTURED || capture.phase === PHASE.BRAND_CONFIRM ? (
                <div className="w-full h-full bg-neutral-950 text-white flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm font-semibold text-neutral-300">
                    {capture.phase === PHASE.BRAND_CONFIRM ? '위 팝업에서 안내를 계속할지 선택해주세요.' : '잠시만 기다려주세요.'}
                  </p>
                </div>
              ) : capture.phase === PHASE.SELECTING_STATE && !capture.currentStep ? (
                // 브랜드만 방금 고른 직후(아직 상태를 못 골라 currentStep이 없음) - 안내만 표시.
                <div className="w-full h-full bg-neutral-950 text-white flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm font-semibold text-neutral-300">위에서 지금 화면에 맞는 단계를 골라주세요.</p>
                </div>
              ) : (
                capture.currentStep && (
                  <InstructionPanel
                    stepIndex={capture.currentStepIndex}
                    totalSteps={capture.totalSteps}
                    step={capture.currentStep}
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                    onReListen={handleReListen}
                    onPrevStep={capture.goToPrevStep}
                    onNextCapture={capture.captureNextScreen}
                    onSameCaptureNext={capture.advanceOnSameCapture}
                    onExit={handleGoHome}
                    warningMessage={burgerMismatchWarning}
                  />
                )
              )}
            </div>
          </div>
        )}
      </KioskMobileLayout>
    </AppFrame>
  )
}

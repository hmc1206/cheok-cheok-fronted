import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { AROverlayDebugPanel } from '../components/kiosk/AROverlayDebugPanel'
import { CameraErrorUI } from '../components/kiosk/CameraErrorUI'
import { CaptureGuide } from '../components/kiosk/CaptureGuide'
import { CapturedScreenGuide } from '../components/kiosk/CapturedScreenGuide'
import { InstructionPanel } from '../components/kiosk/InstructionPanel'
import { KioskCamera } from '../components/kiosk/KioskCamera'
import { KioskIntroStep } from '../components/kiosk/KioskIntroStep'
import { KioskMobileLayout } from '../components/kiosk/KioskMobileLayout'
import { KioskPermissionStep } from '../components/kiosk/KioskPermissionStep'
import { StateSelector } from '../components/kiosk/StateSelector'
import {
  MEGA_FLOW_FIRST_STEP_ID,
  MEGA_FLOW_STEPS,
  MEGA_STATE_CONFIDENCE_THRESHOLD,
  MEGA_STATE_KEYWORDS,
  MEGA_STATE_LABELS,
} from '../data/megaFlow'
import { useKioskCapture } from '../hooks/useKioskCapture'
import { useSpeech } from '../hooks/useSpeech'

/**
 * 메가커피 전용 "촬영 기반" 키오스크 안내 화면.
 *
 * 기존 KioskLiveScreen(실시간 연속 인식 - 카메라 영상을 계속 OCR하며 AR을 실시간으로
 * 따라다니게 하는 방식)과는 완전히 다른 새 방식이다:
 *
 *   카메라 실행 -> 가이드에 화면을 맞춤(자동/수동 촬영) -> 카메라 정지 -> 촬영 이미지 분석
 *   -> 그 정지 이미지 위에 고정된 AR 표시 -> 사용자가 실제 키오스크를 조작
 *   -> "다음 화면 촬영"으로 다시 카메라를 켜고 반복
 *
 * 이번 작업 범위는 "메가커피 키오스크만"이라, 여기서는 data/megaFlow.js(메가커피 전용
 * 데이터)만 주입한다. 다만 실제 엔진(useKioskCapture, screenStateClassifier,
 * captureQuality, AROverlay 등)은 브랜드에 전혀 종속되지 않게 만들어서, 나중에
 * 맘스터치를 같은 방식으로 옮길 때 momsFlow.js 같은 데이터 파일 하나만 추가하면
 * 재사용할 수 있다(사용자 확인: "이후에 맘스터치도 새 촬영 기반 방식으로 수정할 것이니
 * 효율적으로 작업해달라"는 요청 반영).
 *
 * 기존 실시간 엔진(useKioskRecognition/useARTracking/megaCoffeeGuide.js/
 * momsTouchGuide.js/kioskBrands.js/kioskClassifier.js/KioskLiveScreen.jsx 등)은
 * 이 작업에서 단 한 줄도 수정하지 않았다 - 맘스터치는 계속 그 엔진을 그대로 쓴다.
 * App.jsx에서 "/kiosk-legacy" 경로로 기존 화면을 그대로 남겨뒀다.
 */
export function KioskCaptureScreen() {
  const navigate = useNavigate()

  // intro -> permission -> camera (camera 안에서는 capture.phase로 세부 화면을 나눈다)
  const [stepState, setStepState] = useState('intro')

  const { speak, stop: stopSpeech, isMuted, toggleMute } = useSpeech()

  const capture = useKioskCapture({
    flowSteps: MEGA_FLOW_STEPS,
    stateKeywords: MEGA_STATE_KEYWORDS,
    confidenceThreshold: MEGA_STATE_CONFIDENCE_THRESHOLD,
    firstStepId: MEGA_FLOW_FIRST_STEP_ID,
  })
  const { PHASE } = capture

  const handleGoHome = useCallback(() => {
    stopSpeech()
    navigate('/home')
  }, [navigate, stopSpeech])

  // 1. 소개 화면 -> 권한 안내 화면
  const handleStartIntro = useCallback(() => setStepState('permission'), [])

  // 2. 권한 허용 -> 카메라 실행 시작(요구사항: 후면 카메라 우선은 기존 useCamera가 이미 처리)
  const handleRequestPermission = useCallback(() => {
    setStepState('camera')
    capture.beginCapture()
  }, [capture])

  // 이 새 촬영 기반 방식은 "카메라 없이 도움받기" 시뮬레이션 모드를 제공하지 않는다
  // (요구사항에 해당 내용이 없어 범위를 넘는 기능을 임의로 만들지 않았음 - 알려진 제한사항).
  // 카메라를 쓸 수 없는 환경에서는 홈으로 안내한다.
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

  const isCapturedLikePhase =
    capture.phase === PHASE.CAPTURED ||
    capture.phase === PHASE.ANALYZING ||
    capture.phase === PHASE.GUIDING ||
    capture.phase === PHASE.LOW_CONFIDENCE ||
    capture.phase === PHASE.SELECTING_STATE

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

        {/* 4. 카메라 정렬/촬영 화면 */}
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
        {stepState === 'camera' && isCapturedLikePhase && capture.currentStep && (
          <div className="relative w-full flex-1 bg-black flex flex-col overflow-hidden">
            <div className="h-[72%] w-full relative">
              <CapturedScreenGuide
                capturedImage={capture.capturedImage}
                targets={capture.currentStep.targets}
                phase={capture.phase}
                isAnalyzing={capture.phase === PHASE.ANALYZING}
                onRetake={capture.retake}
                onOpenStateSelector={capture.openStateSelector}
              />

              {capture.phase === PHASE.SELECTING_STATE && (
                <StateSelector stateLabels={MEGA_STATE_LABELS} onSelect={capture.selectStateManually} onClose={capture.closeStateSelector} />
              )}

              {/* 개발 모드 전용 디버그 패널 - 운영 화면에는 표시되지 않는다 */}
              {import.meta.env.DEV && (
                <AROverlayDebugPanel
                  phase={capture.phase}
                  recognitionResult={capture.recognitionResult}
                  debugWords={capture.debugWords}
                  lastAnalysisMs={capture.lastAnalysisMs}
                  ocrReady={capture.ocrReady}
                />
              )}
            </div>

            <div className="h-[28%] w-full">
              {capture.phase === PHASE.LOW_CONFIDENCE ? (
                <div className="w-full h-full bg-neutral-950 text-white flex flex-col p-4 gap-3 justify-center">
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
                      화면 직접 선택
                    </button>
                  </div>
                  <button type="button" onClick={handleGoHome} className="text-sm font-semibold text-neutral-400 underline underline-offset-4 mt-1">
                    그만두고 홈으로 가기
                  </button>
                </div>
              ) : capture.phase === PHASE.ANALYZING || capture.phase === PHASE.CAPTURED ? (
                <div className="w-full h-full bg-neutral-950 text-white flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-neutral-300">화면을 분석하고 있어요...</p>
                </div>
              ) : (
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
                />
              )}
            </div>
          </div>
        )}
      </KioskMobileLayout>
    </AppFrame>
  )
}

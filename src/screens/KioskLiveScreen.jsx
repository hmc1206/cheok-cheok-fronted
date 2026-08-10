import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { CameraErrorUI } from '../components/kiosk/CameraErrorUI'
import { KioskARControlCard } from '../components/kiosk/KioskARControlCard'
import { KioskAROverlay } from '../components/kiosk/KioskAROverlay'
import { KioskAlignmentOverlay } from '../components/kiosk/KioskAlignmentOverlay'
import { KioskDebugPanel } from '../components/kiosk/KioskDebugPanel'
import { KioskIntroStep } from '../components/kiosk/KioskIntroStep'
import { KioskMobileLayout } from '../components/kiosk/KioskMobileLayout'
import { KioskPermissionStep } from '../components/kiosk/KioskPermissionStep'
import { useCamera } from '../hooks/useCamera'
import { useKioskRecognition } from '../hooks/useKioskRecognition'
import { useSpeech } from '../hooks/useSpeech'

// 카메라를 쓸 수 없는 환경(PC 등)에서 "카메라 없이 도움받기"를 눌렀을 때 보여주는
// 시뮬레이션 전용 3단계 샘플 데이터. 실제 카메라 인식과는 무관하게 그대로 유지한다.
const SIMULATION_AR_STEPS = [
  {
    id: 1,
    title: '메뉴를 선택해주세요',
    description: '화면 중앙의 메뉴 버튼을 눌러주세요.',
    target: {
      x: 50,
      y: 35,
      width: 45,
      height: 12,
    },
  },
  {
    id: 2,
    title: '원하는 상품을 선택해주세요',
    description: '주문하려는 상품의 사진을 눌러주세요.',
    target: {
      x: 30,
      y: 52,
      width: 25,
      height: 22,
    },
  },
  {
    id: 3,
    title: '결제하기를 눌러주세요',
    description: '화면 아래쪽의 결제하기 버튼을 눌러주세요.',
    target: {
      x: 50,
      y: 85,
      width: 65,
      height: 12,
    },
  },
]

// targetText를 아직 찾지 못했을 때 컨트롤 카드에 대신 보여주는 안내 문구.
// 잘못된 위치에 AR을 띄우는 대신 계속 탐색 중임을 알린다.
const SEARCHING_STEP = {
  title: '버튼을 찾고 있어요',
  description: '키오스크 화면이 잘 보이도록 카메라를 조금 움직여주세요.',
}

// "화면을 맞췄어요" 이후 메가커피 키오스크인지 확인하는 데 허용하는 최대 인식 주기 수.
// useARTracking의 OCR 주기(약 800ms) 기준 약 4초 안에 판별한다.
const CHECKING_MAX_CYCLES = 5

/**
 * 실전 키오스크 도움 종합 화면 (KioskLiveScreen)
 *
 * 전체 흐름:
 * 1. 키오스크 도움 소개 화면 ('intro')
 * 2. 카메라 권한 안내 화면 ('permission')
 * 3. 카메라 실행 및 정렬 화면 ('alignment')
 * 4. 메가커피 키오스크 확인 중 화면 ('checking') - 실제 카메라 모드에서만 사용
 * 5. 메가커피 키오스크 인식 실패 화면 ('mismatch') - 실제 카메라 모드에서만 사용
 * 6. 단계별 AR 안내 화면 ('ar')
 * 7. 안내 완료 화면 ('complete')
 *
 * 카메라 없이 도움받기(시뮬레이션) 모드에서는 기존처럼 고정된 SIMULATION_AR_STEPS를 그대로 사용하고,
 * 실제 카메라 모드에서는 useKioskRecognition이 OCR로 실시간 인식한 targetBox를 사용한다.
 */
export function KioskLiveScreen() {
  const navigate = useNavigate()

  // 전체 화면 뷰 상태
  const [stepState, setStepState] = useState('intro')

  // 카메라 미지원/거부 환경용 시뮬레이션 우회 플래그
  const [isCameraBypassed, setIsCameraBypassed] = useState(false)

  // 시뮬레이션 모드 전용 AR 단계 인덱스 (0, 1, 2)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // 커스텀 훅 불러오기
  const { videoRef, cameraStatus, errorType, startCamera, stopCamera } = useCamera()
  const { speak, stop: stopSpeech, isMuted, toggleMute } = useSpeech()

  // 정렬 화면에서 지정한 가이드 사각형과 동일한 위치/크기를 갖는 ROI 기준 엘리먼트
  const roiElementRef = useRef(null)

  // 실제 카메라 모드에서만 OCR 기반 실시간 인식을 돌린다('checking' 또는 'ar' 단계일 때만 활성화)
  const isRecognitionActive = !isCameraBypassed && (stepState === 'checking' || stepState === 'ar')
  const recognition = useKioskRecognition({ videoRef, roiElementRef, enabled: isRecognitionActive })

  // 컨트롤 카드/오버레이에 전달할 현재 진행 정보를 모드에 따라 통일한다
  const totalSteps = isCameraBypassed ? SIMULATION_AR_STEPS.length : recognition.totalStates
  const activeIndex = isCameraBypassed ? currentStepIndex : recognition.stateIndex
  const hasSpecificTarget = !isCameraBypassed && recognition.currentStep.targetTexts.length > 0
  const activeStep = isCameraBypassed
    ? SIMULATION_AR_STEPS[currentStepIndex]
    : !hasSpecificTarget || recognition.targetBox
      ? recognition.currentStep
      : SEARCHING_STEP
  const shouldShowAROverlay = stepState === 'ar' && (isCameraBypassed || recognition.targetBox)

  // 홈 화면으로 되돌아가기
  // ("/"가 core 라우팅 수정으로 로그인/스플래시 화면이 되어, 실제 홈은 "/home")
  const handleGoHome = useCallback(() => {
    stopCamera()
    stopSpeech()
    navigate('/home')
  }, [navigate, stopCamera, stopSpeech])

  // 1. 소개 화면 -> 권한 안내 화면
  const handleStartIntro = useCallback(() => {
    setStepState('permission')
  }, [])

  // 2. 권한 허용 -> 카메라 실행 요청 및 정렬 화면 이동
  const handleRequestPermission = useCallback(async () => {
    setIsCameraBypassed(false)
    setStepState('alignment')
    await startCamera()
  }, [startCamera])

  // 카메라 없이 시뮬레이션 도움 받기 우회
  const handleBypassCamera = useCallback(() => {
    setIsCameraBypassed(true)
    setStepState('alignment')
  }, [])

  // 3. 정렬 완료 -> (실카메라) 메가커피 확인 단계 / (시뮬레이션) AR 안내 단계로 진입
  const handleConfirmAlignment = useCallback(() => {
    if (isCameraBypassed) {
      setStepState('ar')
      setCurrentStepIndex(0)
      speak(SIMULATION_AR_STEPS[0].description)
      return
    }

    setStepState('checking')
  }, [isCameraBypassed, speak])

  // "다시 인식하기" - 인식 실패 화면에서 확인 단계를 재시작
  const handleRetryRecognition = useCallback(() => {
    setStepState('checking')
  }, [])

  // 4. 'checking' 단계: OCR 인식 결과를 지켜보다가 메가커피로 확인되면 'ar'로,
  //    일정 주기 안에 확인되지 않으면 'mismatch'로 전환한다.
  useEffect(() => {
    if (isCameraBypassed || stepState !== 'checking') return
    if (recognition.cycleCount === 0) return

    if (recognition.brandResult.brand === 'MEGA_COFFEE') {
      setStepState('ar')
      speak(recognition.currentStep.description)
      return
    }

    if (recognition.cycleCount >= CHECKING_MAX_CYCLES) {
      setStepState('mismatch')
    }
  }, [recognition.cycleCount, stepState, isCameraBypassed, recognition.brandResult, recognition.currentStep, speak])

  // 실카메라 모드: 자동/수동 여부와 관계없이 주문 단계(orderState)가 바뀌면 안내 음성을 재생한다.
  const prevOrderStateRef = useRef(recognition.orderState)
  useEffect(() => {
    if (isCameraBypassed || stepState !== 'ar') return
    if (prevOrderStateRef.current === recognition.orderState) return
    prevOrderStateRef.current = recognition.orderState
    speak(recognition.currentStep.description)
  }, [recognition.orderState, stepState, isCameraBypassed, recognition.currentStep, speak])

  // AR 단계 변경 시 TTS 음성 읽기 자동 트리거
  const handleNextStep = useCallback(() => {
    if (isCameraBypassed) {
      if (currentStepIndex < SIMULATION_AR_STEPS.length - 1) {
        const nextIdx = currentStepIndex + 1
        setCurrentStepIndex(nextIdx)
        speak(SIMULATION_AR_STEPS[nextIdx].description)
      } else {
        // 마지막 단계에서 "안내 완료" 클릭 시
        setStepState('complete')
        speak('키오스크 안내가 모두 완료되었습니다.')
      }
      return
    }

    if (recognition.isLastState) {
      setStepState('complete')
      speak('키오스크 안내가 모두 완료되었습니다.')
    } else {
      recognition.goNext()
    }
  }, [isCameraBypassed, currentStepIndex, speak, recognition])

  const handlePrevStep = useCallback(() => {
    if (isCameraBypassed) {
      if (currentStepIndex > 0) {
        const prevIdx = currentStepIndex - 1
        setCurrentStepIndex(prevIdx)
        speak(SIMULATION_AR_STEPS[prevIdx].description)
      }
      return
    }

    recognition.goPrev()
  }, [isCameraBypassed, currentStepIndex, speak, recognition])

  const handleReListen = useCallback(() => {
    if (isCameraBypassed) {
      speak(SIMULATION_AR_STEPS[currentStepIndex].description)
      return
    }
    speak(activeStep.description)
  }, [isCameraBypassed, currentStepIndex, speak, activeStep])

  // 단계 초기화 및 다시 시작
  const handleRestart = useCallback(() => {
    setStepState('intro')
    setCurrentStepIndex(0)
    recognition.reset()
    stopCamera()
    stopSpeech()
  }, [stopCamera, stopSpeech, recognition])

  // 오류 상태 여부 확인
  const isCameraError =
    !isCameraBypassed &&
    (cameraStatus === 'denied' || cameraStatus === 'unsupported' || cameraStatus === 'error' || errorType !== null)

  return (
    // core 공용 AppFrame(393x852 고정 + 48px 라운드)으로 감싸고, 팀원분이 만든
    // KioskMobileLayout(반응형 모바일 프리셋)은 그 안에서 그대로 유지한다.
    <AppFrame>
      <KioskMobileLayout>
      {/* 1. 키오스크 도움 소개 화면 */}
      {stepState === 'intro' && <KioskIntroStep onNext={handleStartIntro} onBack={handleGoHome} />}

      {/* 2. 카메라 권한 안내 화면 */}
      {stepState === 'permission' && (
        <KioskPermissionStep onRequestPermission={handleRequestPermission} onBack={() => setStepState('intro')} />
      )}

      {/* 3. 카메라 실행 중 오류가 발생한 경우 오류 화면 노출 */}
      {stepState !== 'intro' && stepState !== 'permission' && isCameraError && (
        <CameraErrorUI errorType={errorType} onRetry={startCamera} onBypassCamera={handleBypassCamera} />
      )}

      {/* 4. 카메라 뷰 및 AR 안내 레이어 (오류가 없거나 우회된 경우)
          min-h-dvh(실제 뷰포트 기준) 대신 flex-1만 사용 — AppFrame이 준 h-full 안에서
          flex-col 부모 기준으로 남는 공간을 채우면 되고, dvh를 쓰면 852px 프레임을
          넘어갈 수 있다. */}
      {stepState !== 'intro' && stepState !== 'permission' && !isCameraError && (
        <div className="relative w-full flex-1 bg-black flex flex-col justify-center overflow-hidden">
          {/* 실제 비디오 스트림 영역 */}
          {!isCameraBypassed ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
                  }`}
                onCanPlay={() => {
                  // 비디오 준비 완료 이벤트 핸들러
                }}
              />

              {/* 카메라 로딩 인디케이터 */}
              {cameraStatus === 'requesting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 gap-3 z-30">
                  <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-lg font-bold">카메라를 켜는 중입니다...</p>
                </div>
              )}

              {/* 정렬 화면의 가이드 사각형과 동일한 위치/크기의 ROI 기준 엘리먼트.
                  화면에는 보이지 않지만("opacity-0"), 화면 맞추기가 끝난 뒤에도 계속 존재해야
                  OCR 실시간 추적이 같은 영역을 ROI로 계속 사용할 수 있다.
                  주의: ref는 반드시 실제 가이드 박스 크기(max-w-[340px] aspect-[3/4])를 갖는
                  안쪽 div에 달아야 한다. 바깥 div는 inset-0으로 항상 컨테이너 전체 크기이므로,
                  거기에 ref를 달면 getBoundingClientRect()가 video 전체 영역을 반환해
                  ROI가 사실상 "잘라내지 않은 전체 화면"이 되어버린다. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center px-6 my-2 pointer-events-none opacity-0"
              >
                <div ref={roiElementRef} className="w-full max-w-[340px] aspect-[3/4]" />
              </div>
            </div>
          ) : (
            /* 카메라 없이 도움받기 시뮬레이션 모드 배경 (가상 키오스크 샘플 화면) */
            <div className="relative w-full h-full min-h-[500px] bg-gradient-to-br from-slate-800 via-slate-900 to-black flex flex-col items-center justify-center p-6 text-slate-400 select-none">
              <div className="w-full max-w-xs border-2 border-slate-700 rounded-2xl p-4 bg-slate-800/80 shadow-inner flex flex-col gap-4">
                <div className="h-8 bg-slate-700 rounded-lg w-3/4 mx-auto" />
                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="h-16 bg-slate-700/60 rounded-xl" />
                  <div className="h-16 bg-slate-700/60 rounded-xl" />
                  <div className="h-16 bg-slate-700/60 rounded-xl" />
                  <div className="h-16 bg-slate-700/60 rounded-xl" />
                </div>
                <div className="h-10 bg-slate-700 rounded-xl w-full" />
              </div>
              <span className="text-xs text-slate-500 mt-4">[시뮬레이션 가상 키오스크 화면]</span>
            </div>
          )}

          {/* 키오스크 화면 맞추기 오버레이 */}
          {stepState === 'alignment' && (
            <KioskAlignmentOverlay
              onConfirmAlignment={handleConfirmAlignment}
              onBack={() => setStepState('permission')}
              onExit={handleGoHome}
            />
          )}

          {/* 메가커피 키오스크 확인 중 로딩 오버레이 */}
          {stepState === 'checking' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/50 text-white pointer-events-none">
              <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-bold drop-shadow-md">키오스크 화면을 확인하고 있어요...</p>
            </div>
          )}

          {/* 메가커피 키오스크로 확인되지 않은 경우 */}
          {stepState === 'mismatch' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm p-6 text-center pointer-events-auto">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center text-red-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                <p className="text-xl font-extrabold text-white leading-snug">메가커피 키오스크를 인식하지 못했어요.</p>
                <p className="text-base font-medium text-neutral-200 leading-relaxed">
                  키오스크 화면 전체가 보이도록 카메라를 움직여주세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRetryRecognition}
                className="w-full max-w-xs min-h-[56px] bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all focus-visible:outline-4 focus-visible:outline-white"
              >
                다시 인식하기
              </button>

              <button
                type="button"
                onClick={handleGoHome}
                className="text-sm font-semibold text-neutral-300 underline underline-offset-4"
              >
                그만두고 홈으로 가기
              </button>
            </div>
          )}

          {/* 개발 환경 전용 디버그 패널 (프로덕션 사용자 화면에는 표시되지 않음) */}
          {import.meta.env.DEV && isRecognitionActive && (
            <KioskDebugPanel
              brand={recognition.brandResult}
              orderState={recognition.orderState}
              ocrWords={recognition.ocrWords}
              targetMatch={recognition.targetMatch}
              processingMs={recognition.lastProcessMs}
              debugInfo={recognition.debugInfo}
            />
          )}

          {/* AR 강조 가이드 오버레이 - 카메라 영상 속 실제 버튼 위치를 따라간다 */}
          {shouldShowAROverlay && (
            <KioskAROverlay
              step={
                isCameraBypassed
                  ? SIMULATION_AR_STEPS[currentStepIndex]
                  : {
                    title: recognition.currentStep.title,
                    description: recognition.currentStep.description,
                    target: recognition.targetBox,
                  }
              }
            />
          )}

          {/* 하단 컨트롤 카드 */}
          {stepState === 'ar' && (
            <KioskARControlCard
              currentIndex={activeIndex}
              totalSteps={totalSteps}
              step={activeStep}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onPrev={handlePrevStep}
              onReListen={handleReListen}
              onNext={handleNextStep}
              onExit={handleGoHome}
            />
          )}
        </div>
      )}

      {/* 5. 안내 완료 화면 */}
      {stepState === 'complete' && (
        <div className="flex flex-col justify-between flex-1 p-6 pb-8 bg-white text-center">
          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-md">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold text-neutral-900">안내를 완료했어요!</h2>
              <p className="text-lg text-neutral-700 leading-relaxed font-medium">
                키오스크 주문에 성공하셨나요?
                <br />
                언제든 필요할 때 다시 불러주세요.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleRestart}
              className="w-full min-h-[60px] bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[20px] rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all focus-visible:outline-4 focus-visible:outline-blue-800"
            >
              <span>처음부터 다시 보기</span>
            </button>

            <button
              type="button"
              onClick={handleGoHome}
              className="w-full min-h-[56px] bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-all focus-visible:outline-4 focus-visible:outline-neutral-800"
            >
              <span>메인 화면으로 이동</span>
            </button>
          </div>
        </div>
      )}
      </KioskMobileLayout>
    </AppFrame>
  )
}

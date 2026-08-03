import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraErrorUI } from '../components/kiosk/CameraErrorUI'
import { KioskARControlCard } from '../components/kiosk/KioskARControlCard'
import { KioskAROverlay } from '../components/kiosk/KioskAROverlay'
import { KioskAlignmentOverlay } from '../components/kiosk/KioskAlignmentOverlay'
import { KioskIntroStep } from '../components/kiosk/KioskIntroStep'
import { KioskMobileLayout } from '../components/kiosk/KioskMobileLayout'
import { KioskPermissionStep } from '../components/kiosk/KioskPermissionStep'
import { useCamera } from '../hooks/useCamera'
import { useSpeech } from '../hooks/useSpeech'

// 7. 가이드라인 기반 단계별 AR 안내 샘플 데이터
const AR_STEPS = [
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

/**
 * 실전 키오스크 도움 종합 화면 (KioskLiveScreen)
 *
 * 전체 흐름:
 * 1. 키오스크 도움 소개 화면 ('intro')
 * 2. 카메라 권한 안내 화면 ('permission')
 * 3. 카메라 실행 및 정렬 화면 ('alignment')
 * 4. 단계별 AR 안내 화면 ('ar')
 * 5. 안내 완료 화면 ('complete')
 */
export function KioskLiveScreen() {
  const navigate = useNavigate()

  // 전체 화면 뷰 상태: 'intro' | 'permission' | 'alignment' | 'ar' | 'complete'
  const [stepState, setStepState] = useState('intro')

  // 카메라 미지원/거부 환경용 시뮬레이션 우회 플래그
  const [isCameraBypassed, setIsCameraBypassed] = useState(false)

  // AR 단계 인덱스 (0, 1, 2)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // 커스텀 훅 불러오기
  const { videoRef, cameraStatus, errorType, startCamera, stopCamera } = useCamera()
  const { speak, stop: stopSpeech, isMuted, toggleMute } = useSpeech()

  // 홈 화면으로 되돌아가기
  const handleGoHome = useCallback(() => {
    stopCamera()
    stopSpeech()
    navigate('/')
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

  // 3. 정렬 완료 -> AR 안내 단계 시작
  const handleConfirmAlignment = useCallback(() => {
    setStepState('ar')
    setCurrentStepIndex(0)
    speak(AR_STEPS[0].description)
  }, [speak])

  // AR 단계 변경 시 TTS 음성 읽기 자동 트리거
  const handleNextStep = useCallback(() => {
    if (currentStepIndex < AR_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1
      setCurrentStepIndex(nextIdx)
      speak(AR_STEPS[nextIdx].description)
    } else {
      // 마지막 단계에서 "안내 완료" 클릭 시
      setStepState('complete')
      speak('키오스크 안내가 모두 완료되었습니다.')
    }
  }, [currentStepIndex, speak])

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1
      setCurrentStepIndex(prevIdx)
      speak(AR_STEPS[prevIdx].description)
    }
  }, [currentStepIndex, speak])

  const handleReListen = useCallback(() => {
    speak(AR_STEPS[currentStepIndex].description)
  }, [currentStepIndex, speak])

  // 단계 초기화 및 다시 시작
  const handleRestart = useCallback(() => {
    setStepState('intro')
    setCurrentStepIndex(0)
    stopCamera()
    stopSpeech()
  }, [stopCamera, stopSpeech])

  // 오류 상태 여부 확인
  const isCameraError =
    !isCameraBypassed &&
    (cameraStatus === 'denied' || cameraStatus === 'unsupported' || cameraStatus === 'error' || errorType !== null)

  return (
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

      {/* 4. 카메라 뷰 및 AR 안내 레이어 (오류가 없거나 우회된 경우) */}
      {stepState !== 'intro' && stepState !== 'permission' && !isCameraError && (
        <div className="relative w-full flex-1 min-h-dvh bg-black flex flex-col justify-center overflow-hidden">
          {/* 실제 비디오 스트림 영역 */}
          {!isCameraBypassed ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
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

          {/* AR 강조 가이드 오버레이 */}
          {stepState === 'ar' && <KioskAROverlay step={AR_STEPS[currentStepIndex]} />}

          {/* 하단 컨트롤 카드 */}
          {stepState === 'ar' && (
            <KioskARControlCard
              currentIndex={currentStepIndex}
              totalSteps={AR_STEPS.length}
              step={AR_STEPS[currentStepIndex]}
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
  )
}

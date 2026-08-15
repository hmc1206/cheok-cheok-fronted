/**
 * "카드 촬영처럼" 키오스크 화면을 맞추는 가이드 오버레이.
 *
 * - guideRef: 이 사각형 DOM에 ref를 붙여야 useKioskCapture(getRoiInVideoCoords)가
 *   실제 촬영할 영역(video 픽셀 좌표)을 계산할 수 있다. 반드시 실제 크기를 가진
 *   요소(아래 aspect-[3/4] div)에 ref를 달아야 한다 - 예전에 바깥쪽 inset-0 래퍼에
 *   ref를 달았다가 ROI가 전체 화면이 되어버리는 버그가 있었으므로 동일한 실수를
 *   반복하지 않도록 주의(참고: 이 프로젝트의 기존 실시간 엔진에서 겪었던 문제).
 * - fillRatio(0~1): 1 이상이면 "충분히 찼다"고 보고 테두리를 초록색으로 바꾼다
 *   (요구사항: 약 70% 이상 채우면 노란색 -> 초록색).
 * - phase === 'countdown'일 때는 자동 촬영까지 남은 진행률을 게이지로 보여준다.
 */
export function CaptureGuide({ guideRef, fillRatio, isStable, countdownProgress, phase, onManualCapture, onExit }) {
  const isFilled = fillRatio >= 1
  const borderColorClass = isFilled ? 'border-emerald-400' : 'border-yellow-400'
  const isCountingDown = phase === 'countdown'

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-between pointer-events-none">
      {/* 상단 종료 버튼 */}
      <div className="w-full flex justify-end p-4 pointer-events-auto">
        <button
          type="button"
          onClick={onExit}
          className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg bg-black/50 hover:bg-black/70 text-white focus-visible:outline-3 focus-visible:outline-white"
          aria-label="종료하고 홈으로 이동"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 가이드 사각형: 세로형 키오스크 화면 비율(3:4)에 맞춘 프레임 */}
      <div className="flex-1 w-full flex flex-col items-center justify-center px-6 py-4">
        <div
          ref={guideRef}
          className={`relative w-full max-w-[320px] aspect-[3/4] rounded-3xl border-4 transition-colors duration-300 ${borderColorClass}`}
          style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }}
          aria-hidden="true"
        >
          {isCountingDown && (
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              {/* 자동 촬영까지 남은 시간을 아래에서 위로 채워지는 막대로 표시 */}
              <div
                className="absolute inset-x-0 bottom-0 bg-emerald-400/35 transition-[height] duration-150 ease-linear"
                style={{ height: `${countdownProgress * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 하단 안내 문구 + 직접 촬영 버튼 */}
      <div className="w-full p-6 pointer-events-auto flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
        <p className="text-white text-lg font-bold text-center leading-snug drop-shadow-md">
          키오스크 화면이 네모 안에 들어오도록 맞춰주세요.
        </p>
        <p className={`text-sm font-semibold text-center ${isFilled && isStable ? 'text-emerald-300' : 'text-neutral-300'}`}>
          {isFilled && isStable
            ? '움직이지 말고 잠시만 기다려주세요...'
            : '화면 전체가 잘 보이도록 카메라를 움직여주세요.'}
        </p>

        <button
          type="button"
          onClick={onManualCapture}
          className="w-full min-h-[56px] bg-white text-black font-extrabold text-lg rounded-2xl shadow-xl transition-transform active:scale-95 focus-visible:outline-4 focus-visible:outline-yellow-400"
        >
          직접 촬영
        </button>
      </div>
    </div>
  )
}

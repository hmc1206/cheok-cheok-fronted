/**
 * "촬영 후 안내 화면"의 하단 영역(요구사항 2장, 화면의 약 25~30%).
 * STEP 진행 상태, 큰 글씨 안내 문구, 음성/이전/다음 촬영 버튼을 담당한다.
 * 고령자 접근성을 고려해 버튼 높이 48px 이상, 큰 글씨, 높은 색상 대비를 유지한다.
 */
export function InstructionPanel({
  stepIndex,
  totalSteps,
  step,
  isMuted,
  onToggleMute,
  onReListen,
  onPrevStep,
  onNextCapture,
  onSameCaptureNext,
  onExit,
}) {
  const progressPercent = totalSteps > 0 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0
  const isFirstStep = stepIndex <= 0

  return (
    <div className="w-full h-full bg-neutral-950 text-white flex flex-col p-4 gap-3 overflow-y-auto">
      {/* STEP 진행 상태 + 음성 토글 + 종료 */}
      <div className="flex items-center justify-between">
        <span className="bg-yellow-400 text-black font-extrabold text-xs px-2.5 py-1 rounded-full">
          STEP {stepIndex + 1} / {totalSteps}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2.5 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center border transition-all ${
              isMuted ? 'bg-red-500/20 border-red-400 text-red-300' : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
            }`}
            aria-label={isMuted ? '음성 안내 켜기' : '음성 안내 끄기'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="p-2.5 min-w-[48px] min-h-[48px] rounded-xl bg-white/10 border border-white/30 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="안내 종료하고 홈으로"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
        <div className="bg-yellow-400 h-full transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* 핵심 안내 문구 - 고령자도 읽기 쉽게 크게 */}
      <div className="flex-1 flex flex-col justify-center gap-2 min-h-0">
        <h2 className="text-lg font-extrabold text-yellow-300 leading-snug">{step.title}</h2>
        <p className="text-2xl font-extrabold leading-snug">{step.instruction}</p>
        {step.subInstruction && <p className="text-base text-neutral-300 font-medium leading-relaxed">{step.subInstruction}</p>}
      </div>

      {/* 같은 사진을 유지한 채 다음 안내로 넘어가는 보조 버튼(데이터에 정의된 경우에만 표시) */}
      {step.sameCaptureNextId && (
        <button
          type="button"
          onClick={onSameCaptureNext}
          className="w-full min-h-[48px] bg-white/10 border-2 border-yellow-400 text-yellow-300 font-bold text-base rounded-xl transition-all hover:bg-white/20 focus-visible:outline-4 focus-visible:outline-yellow-400"
        >
          {step.sameCaptureButtonLabel}
        </button>
      )}

      {/* 이전 안내 / 다시 듣기 / 다음 화면 촬영 - 항상 노출(자동판별 실패 대비 수동 이동) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onPrevStep}
          disabled={isFirstStep}
          className={`min-h-[48px] rounded-xl font-bold text-sm border transition-all ${
            isFirstStep
              ? 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
              : 'bg-neutral-800 border-neutral-600 text-white hover:bg-neutral-700'
          }`}
        >
          이전 안내
        </button>

        <button
          type="button"
          onClick={onReListen}
          className="min-h-[48px] rounded-xl font-bold text-sm bg-neutral-800 border border-neutral-600 text-white hover:bg-neutral-700 transition-all"
        >
          다시 듣기
        </button>

        <button
          type="button"
          onClick={onNextCapture}
          className="min-h-[48px] rounded-xl font-extrabold text-sm bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black shadow-lg transition-all"
        >
          {step.captureButtonLabel ?? '다음 화면 촬영'}
        </button>
      </div>
    </div>
  )
}

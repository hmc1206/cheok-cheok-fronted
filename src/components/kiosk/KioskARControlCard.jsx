/**
 * 8. 하단 안내 컨트롤 카드 & 9. 음성 제어 Component
 *
 * 카메라 화면 하단에 고정되어 현재 단계 정보, 진행률 바,
 * 이전/다시 듣기/다음(안내 완료) 버튼 및 음성 토글 버튼을 제공합니다.
 */
export function KioskARControlCard({
  currentIndex,
  totalSteps,
  step,
  isMuted,
  onToggleMute,
  onPrev,
  onReListen,
  onNext,
  onExit,
}) {
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalSteps - 1

  const progressPercent = Math.round(((currentIndex + 1) / totalSteps) * 100)

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 p-4 bg-gradient-to-t from-black/95 via-black/85 to-transparent pointer-events-auto">
      {/* 상단 액션 및 음성 제어 헤더 */}
      <div className="flex items-center justify-between mb-3 text-white">
        <div className="flex items-center gap-2">
          <span className="bg-yellow-400 text-black font-extrabold text-xs px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {totalSteps} 단계
          </span>
          <span className="text-xs font-semibold text-neutral-300">진행률 {progressPercent}%</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 음성 토글 버튼 */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2.5 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center border transition-all ${
              isMuted
                ? 'bg-red-500/20 border-red-400 text-red-300'
                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
            }`}
            aria-label={isMuted ? '음성 안내 켜기' : '음성 안내 끄기'}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            )}
          </button>

          {/* 종료 버튼 */}
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

      {/* 진행률 바 */}
      <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden mb-4">
        <div
          className="bg-yellow-400 h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 카드 내용 */}
      <div className="bg-neutral-900/90 border border-neutral-700 rounded-2xl p-4 shadow-xl mb-4 text-white">
        <h3 className="text-xl font-extrabold text-yellow-300 leading-tight mb-1">{step.title}</h3>
        <p className="text-base font-medium text-neutral-200 leading-relaxed">{step.description}</p>
      </div>

      {/* 이전 / 다시 듣기 / 다음 컨트롤 버튼 3종 */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className={`min-h-[56px] rounded-xl font-bold text-base flex items-center justify-center gap-1 border transition-all ${
            isFirst
              ? 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed'
              : 'bg-neutral-800 border-neutral-600 text-white hover:bg-neutral-700 active:bg-neutral-900'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span>이전</span>
        </button>

        <button
          type="button"
          onClick={onReListen}
          className="min-h-[56px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border border-neutral-600 text-white font-bold text-base rounded-xl flex items-center justify-center gap-1.5 transition-all"
        >
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>다시 듣기</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className={`min-h-[56px] rounded-xl font-extrabold text-base flex items-center justify-center gap-1 shadow-lg transition-all ${
            isLast
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black'
          }`}
        >
          <span>{isLast ? '안내 완료' : '다음'}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

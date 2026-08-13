/**
 * "사용자가 직접 골라야 하는" 단계(매장/포장, 메뉴 종류, 옵션, 결제수단, 상품명 등)에서
 * 하단 컨트롤 카드 대신 표시하는 선택 카드.
 *
 * fixedOptions는 데이터 파일에 미리 정의된 후보(매장/포장 등), dynamicCandidates는 화면에서
 * 실시간으로 인식된 텍스트 중 사용자가 고를 수 있는 후보(상품명/음료명 등)다.
 * 이전/다시 듣기/종료는 선택 화면에서도 계속 쓸 수 있도록 작은 아이콘 버튼으로 유지한다.
 */
export function KioskChoicePicker({
  title,
  description,
  fixedOptions = [],
  dynamicCandidates = [],
  dynamicHint,
  onChooseFixed,
  onChooseDynamic,
  onPrev,
  onReListen,
  onNext,
  onExit,
  isMuted,
  onToggleMute,
}) {
  const hasCandidates = fixedOptions.length > 0 || dynamicCandidates.length > 0

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 p-4 bg-gradient-to-t from-black/95 via-black/85 to-transparent pointer-events-auto max-h-[70%] overflow-y-auto">
      {/* 상단 액션 헤더 (이전 / 음성 토글 / 종료) */}
      <div className="flex items-center justify-between mb-3 text-white">
        <button
          type="button"
          onClick={onPrev}
          className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-white/10 border border-white/30 text-white hover:bg-white/20 flex items-center justify-center"
          aria-label="이전 단계로"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2.5 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border transition-all ${
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
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-white/10 border border-white/30 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="안내 종료하고 홈으로"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 안내 카드 */}
      <div className="bg-neutral-900/90 border border-neutral-700 rounded-2xl p-4 shadow-xl mb-3 text-white">
        <h3 className="text-xl font-extrabold text-yellow-300 leading-tight mb-1">{title}</h3>
        {description && <p className="text-base font-medium text-neutral-200 leading-relaxed">{description}</p>}
      </div>

      {/* 고정 선택지 */}
      {fixedOptions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {fixedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChooseFixed(option)}
              className="min-h-[56px] bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black font-bold text-base rounded-xl px-3 flex items-center justify-center text-center"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* 실시간 인식된 동적 후보(상품명/음료명 등) */}
      {dynamicCandidates.length > 0 && (
        <div className="space-y-2 mb-2">
          {dynamicHint && <p className="text-xs text-neutral-300 font-medium">{dynamicHint}</p>}
          <div className="flex flex-wrap gap-2">
            {dynamicCandidates.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => onChooseDynamic(text)}
                className="min-h-[44px] bg-white/10 border border-white/30 hover:bg-white/20 text-white font-semibold text-sm rounded-xl px-3"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasCandidates && (
        <p className="text-sm text-neutral-300 text-center py-3">화면에서 메뉴를 인식하고 있어요. 카메라를 조금 움직여보세요.</p>
      )}

      {/* 자동 인식이 실패했을 때를 대비한 수동 이동 링크 */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <button type="button" onClick={onReListen} className="text-sm font-semibold text-neutral-300 underline underline-offset-4">
          다시 듣기
        </button>
        <button type="button" onClick={onNext} className="text-sm font-semibold text-yellow-300 underline underline-offset-4">
          다음 단계로 넘어가기
        </button>
      </div>
    </div>
  )
}

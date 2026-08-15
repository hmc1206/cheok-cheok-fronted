/**
 * "화면 직접 선택" 오버레이.
 * 자동 인식 결과가 없거나(인식 실패) 잘못 인식했을 때, 사용자가 현재 키오스크 화면이
 * 무엇인지 목록에서 직접 골라 안내를 이어갈 수 있게 한다. stateLabels는
 * data/megaFlow.js의 MEGA_STATE_LABELS(브랜드별 데이터)를 그대로 넘겨 쓴다.
 */
export function StateSelector({ stateLabels, onSelect, onClose }) {
  return (
    <div className="absolute inset-0 z-30 bg-black/90 flex flex-col p-5 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between text-white">
        <h2 className="text-lg font-extrabold">지금 보이는 화면을 선택해주세요</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 border border-white/30 text-white flex items-center justify-center"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {Object.entries(stateLabels).map(([state, label]) => (
          <button
            key={state}
            type="button"
            onClick={() => onSelect(state)}
            className="min-h-[56px] w-full text-left px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-white font-semibold transition-all focus-visible:outline-3 focus-visible:outline-yellow-400"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

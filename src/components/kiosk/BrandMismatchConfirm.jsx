import { KIOSK_BRAND } from '../../types/kiosk'

const BRAND_NAME = {
  [KIOSK_BRAND.MEGA]: '메가커피',
  [KIOSK_BRAND.MOMS_TOUCH]: '맘스터치',
}

/**
 * "이전과 다른 키오스크가 감지됐어요" 확인 팝업(요구사항 4장).
 * 다른 브랜드의 고유 키워드가 높은 신뢰도로 확인됐을 때만 이 팝업이 뜬다(약한 신호로는
 * useKioskCapture의 resolveBrandTransition이 조용히 기존 브랜드를 유지한다).
 */
export function BrandMismatchConfirm({ candidateBrand, onConfirm, onCancel }) {
  const candidateName = BRAND_NAME[candidateBrand] ?? candidateBrand

  return (
    <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center p-6 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-300">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <p className="text-xl font-extrabold text-white leading-snug">
        이전과 다른 키오스크가 감지됐어요.
        <br />
        {candidateName} 안내로 변경할까요?
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[56px] rounded-2xl font-bold text-base bg-neutral-800 border border-neutral-600 text-white hover:bg-neutral-700 transition-all"
        >
          아니요
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-[56px] rounded-2xl font-extrabold text-base bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black shadow-xl transition-all"
        >
          예, 변경할게요
        </button>
      </div>
    </div>
  )
}

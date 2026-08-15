import { KIOSK_BRAND } from '../../types/kiosk'

const BRAND_LABELS = {
  [KIOSK_BRAND.MEGA]: '메가커피 키오스크 인식됨',
  [KIOSK_BRAND.MOMS_TOUCH]: '맘스터치 키오스크 인식됨',
}

/**
 * 브랜드가 판별되면 안내 화면 상단에 표시하는 작은 배지(요구사항 10장).
 * 브랜드 판별 점수/OCR 원문 같은 개발용 정보는 여기 넣지 않는다 - 그건 DEV 전용
 * 디버그 패널(KioskAnalysisDebugPanel)에서만 보여준다.
 */
export function BrandBadge({ brand }) {
  const label = BRAND_LABELS[brand]
  if (!label) return null

  return (
    <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full bg-black/70 border border-yellow-400 text-yellow-300 text-xs font-extrabold shadow-lg">
      {label}
    </div>
  )
}

import { KIOSK_BRAND } from '../../types/kiosk'

const BRAND_NAME = {
  [KIOSK_BRAND.MEGA]: '메가커피',
  [KIOSK_BRAND.MOMS_TOUCH]: '맘스터치',
}

/**
 * 촬영 완료 -> 분석 중 화면에 표시하는 단계별 안내 문구(요구사항 10장).
 *
 *   키오스크 화면 촬영 완료
 *   -> 브랜드 확인 중
 *   -> (판별되면) OOO 키오스크를 인식했어요
 *   -> 현재 화면 확인 중
 *   -> (판별되면) OOO 화면을 인식했어요
 *
 * useKioskCapture의 analysisStage('brand'|'state'|'done')와 lastBrandResult/
 * lastStateResult를 그대로 반영한다. 점수나 OCR 원문 같은 개발용 정보는 절대 넣지 않는다
 * (그건 DEV 전용 디버그 패널에서만 보여준다).
 */
export function AnalysisProgress({ analysisStage, brand, stateLabel }) {
  const lines = ['키오스크 화면 촬영 완료']

  if (analysisStage === 'brand') {
    lines.push('브랜드 확인 중...')
  } else if (analysisStage === 'state' || analysisStage === 'done') {
    lines.push(brand ? `${BRAND_NAME[brand] ?? brand} 키오스크를 인식했어요` : '브랜드 확인 중...')
  }

  if (analysisStage === 'state') {
    lines.push('현재 화면 확인 중...')
  } else if (analysisStage === 'done' && stateLabel) {
    lines.push('현재 화면 확인 중...')
    lines.push(`${stateLabel}을(를) 인식했어요`)
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3 z-20 px-6">
      <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        {lines.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className={`text-sm font-semibold ${index === lines.length - 1 ? 'text-white' : 'text-neutral-400'}`}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

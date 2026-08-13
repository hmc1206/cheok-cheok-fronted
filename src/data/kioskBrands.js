import {
  BRAND_CONFIDENCE_THRESHOLD as MEGA_COFFEE_BRAND_CONFIDENCE_THRESHOLD,
  KIOSK_GUIDE_STEPS as MEGA_COFFEE_GUIDE_STEPS,
  MEGA_COFFEE_BRAND_KEYWORDS,
  STATE_DETECT_THRESHOLD as MEGA_COFFEE_STATE_DETECT_THRESHOLD,
} from './megaCoffeeGuide'
import {
  MOMS_STATE_DETECT_THRESHOLD,
  MOMS_TOUCH_BRAND_CONFIDENCE_THRESHOLD,
  MOMS_TOUCH_BRAND_KEYWORDS,
  MOMS_TOUCH_GUIDE_STEPS,
} from './momsTouchGuide'

/**
 * 카메라에 비친 키오스크가 어느 브랜드인지 구분하기 위한 값.
 * 새 브랜드를 추가할 때 여기에 값을 하나 추가하고 KIOSK_BRAND_REGISTRY에 항목을 등록하면 된다.
 */
export const BRAND = {
  MEGA_COFFEE: 'MEGA_COFFEE',
  MOMS_TOUCH: 'MOMS_TOUCH',
  UNKNOWN: 'UNKNOWN',
}

/**
 * 지원하는 키오스크 브랜드 레지스트리.
 *
 * useKioskRecognition/kioskClassifier는 이 배열만 보고 동작하므로, 브랜드를 추가할 때
 * 기존 브랜드(megaCoffeeGuide.js 등)의 코드나 데이터를 건드릴 필요가 없다.
 */
export const KIOSK_BRAND_REGISTRY = [
  {
    brand: BRAND.MEGA_COFFEE,
    keywords: MEGA_COFFEE_BRAND_KEYWORDS,
    brandThreshold: MEGA_COFFEE_BRAND_CONFIDENCE_THRESHOLD,
    stateDetectThreshold: MEGA_COFFEE_STATE_DETECT_THRESHOLD,
    guideSteps: MEGA_COFFEE_GUIDE_STEPS,
    initialState: MEGA_COFFEE_GUIDE_STEPS[0]?.state ?? null,
  },
  {
    brand: BRAND.MOMS_TOUCH,
    keywords: MOMS_TOUCH_BRAND_KEYWORDS,
    brandThreshold: MOMS_TOUCH_BRAND_CONFIDENCE_THRESHOLD,
    stateDetectThreshold: MOMS_STATE_DETECT_THRESHOLD,
    guideSteps: MOMS_TOUCH_GUIDE_STEPS,
    initialState: MOMS_TOUCH_GUIDE_STEPS[0]?.state ?? null,
  },
]

export function getBrandEntry(brand) {
  return KIOSK_BRAND_REGISTRY.find((entry) => entry.brand === brand) ?? null
}

import { normalizeText } from '../services/textMatch'
import { isReasonableMatch } from '../services/screenStateClassifier'
import { MEGA_BRAND_KEYWORDS } from '../data/megaFlow'
import { MOMS_TOUCH_BRAND_KEYWORDS } from '../data/momsTouchFlow'
import { KIOSK_BRAND } from '../types/kiosk'

/**
 * 공통 카메라 화면에서 촬영한 이미지 한 장으로 "메가커피인지 맘스터치인지"를 판별하는
 * 순수 함수. 브라우저 API나 React에 의존하지 않아 scripts/test-kiosk-recognition.mjs에서
 * 그대로 단위 테스트할 수 있다.
 *
 * kioskClassifier.classifyBrand(기존 실시간 엔진용)와 원리는 같지만(여러 키워드의 가중치를
 * 합산, 단일 키워드로 확정 안 함) 이 새 촬영 기반 시스템은 완전히 별도 파이프라인이라
 * 그 파일을 가져다 쓰지 않고 독립적으로 구현했다 - 두 브랜드의 점수를 "동시에" 계산해
 * 서로 비교해야 하는데, 기존 함수는 "레지스트리를 순회하며 임계값 넘는 것 중 최고점"
 * 방식이라 이번 요구사항(점수 차이가 작으면 UNKNOWN, scores.mega/scores.momsTouch를
 * 그대로 노출)과 반환 형태가 달라서 새로 만드는 편이 더 명확했다.
 */

// 최고 점수가 이 값 미만이면 브랜드를 확정하지 않는다(요구사항 2장).
export const BRAND_CONFIDENCE_THRESHOLD = 0.45
// 두 브랜드 점수 차이가 이 값보다 작으면(=애매하면) UNKNOWN 처리한다(요구사항 2장:
// "두 브랜드 점수 차이가 작으면 UNKNOWN 처리").
export const BRAND_SCORE_GAP_THRESHOLD = 0.15
// 색상 신호가 브랜드 점수에 더할 수 있는 최대 보너스. 낮게 잡아서 "색상만으로 브랜드를
// 확정"하는 일이 없도록 한다(요구사항: 색상은 보조 점수로만 사용).
const COLOR_BONUS_CAP = 0.08

/** keywords 배열(각 {text, weight})을 정규화된 OCR 텍스트와 대조해 가중치를 합산한다. */
function scoreKeywords(normalizedTexts, keywords) {
  let score = 0
  const matched = []

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword.text)
    // 공백/대소문자/작은따옴표 차이는 normalizeText가 흡수하고, 나머지 OCR 오인식은
    // fuzzyIncludes(편집 거리 기반)가 흡수한다 - 둘 다 기존 textMatch.js를 그대로 재사용.
    // screenStateClassifier.isReasonableMatch: fuzzyIncludes(공용, 수정하지 않음)의 "포함"
    // 판정에 길이 비율 가드를 한 겹 더 씌워, 짧은 단어가 긴 키워드 문구에 우연히 포함되는
    // 것만으로 매칭되지 않게 한다(예: "카드"가 "카드전용 주문기기 입니다"에 잘못 매칭되는 것 방지).
    if (normalizedTexts.some((text) => isReasonableMatch(text, normalizedKeyword))) {
      matched.push(keyword.text)
      score += keyword.weight
    }
  }

  return { score: Math.min(1, score), matched }
}

/**
 * 촬영 이미지의 색상 구성(services/colorProfile.js의 sampleColorProfile 결과)으로부터
 * 브랜드별 아주 작은 보너스 점수를 계산한다.
 * - 메가커피: 노란색 + 검정 비중이 크면 소폭 가점(요구사항: "노란색과 검정색 중심")
 * - 맘스터치: 노란색/주황색 + 흰색 비중이 크면 소폭 가점(요구사항: "노란색 또는
 *   주황색과 흰색 중심")
 * @param {{yellow:number, black:number, orange:number, white:number}|undefined} colorProfile
 */
function scoreColor(colorProfile) {
  if (!colorProfile) return { mega: 0, momsTouch: 0 }

  const megaColorScore = Math.min(COLOR_BONUS_CAP, (colorProfile.yellow + colorProfile.black) * 0.15)
  const momsColorScore = Math.min(COLOR_BONUS_CAP, (colorProfile.yellow + colorProfile.orange + colorProfile.white) * 0.1)

  return { mega: megaColorScore, momsTouch: momsColorScore }
}

/**
 * @param {Array<{text: string}>} words - 촬영 이미지 한 장에서 인식된 OCR 단어 목록
 *   (요구사항: "촬영 이미지당 OCR은 한 번만 실행하고, 그 결과를 브랜드 판별과 화면 상태
 *   판별에 함께 사용" - 이 함수는 그 결과 words를 그대로 받아 재사용만 한다)
 * @param {{yellow:number, black:number, orange:number, white:number}} [colorProfile] - 선택적
 *   색상 프로필. 없어도 동작하며(키워드 점수만 사용), 있으면 아주 작은 보너스만 더한다.
 * @returns {import('../types/kiosk').BrandDetectionResult}
 */
export function detectKioskBrand(words, colorProfile) {
  const emptyResult = {
    brand: KIOSK_BRAND.UNKNOWN,
    confidence: 0,
    scores: { mega: 0, momsTouch: 0 },
    matchedKeywords: [],
  }
  if (!words?.length) return emptyResult

  const normalizedTexts = words.map((word) => normalizeText(word.text)).filter(Boolean)

  const megaKeywordResult = scoreKeywords(normalizedTexts, MEGA_BRAND_KEYWORDS)
  const momsKeywordResult = scoreKeywords(normalizedTexts, MOMS_TOUCH_BRAND_KEYWORDS)
  const colorBonus = scoreColor(colorProfile)

  const megaScore = Math.min(1, Number((megaKeywordResult.score + colorBonus.mega).toFixed(2)))
  const momsScore = Math.min(1, Number((momsKeywordResult.score + colorBonus.momsTouch).toFixed(2)))
  const scores = { mega: megaScore, momsTouch: momsScore }

  const gap = Math.abs(megaScore - momsScore)
  const top =
    megaScore >= momsScore
      ? { brand: KIOSK_BRAND.MEGA, confidence: megaScore, matchedKeywords: megaKeywordResult.matched }
      : { brand: KIOSK_BRAND.MOMS_TOUCH, confidence: momsScore, matchedKeywords: momsKeywordResult.matched }

  // 요구사항: 최고 점수가 기준보다 낮거나, 두 브랜드 점수 차이가 작으면 UNKNOWN.
  // ("분석 중 한 번 UNKNOWN이 나왔다고 즉시 실패시키지 않기"는 이 함수를 호출하는 쪽
  // (useKioskCapture)에서 세션 유지 규칙으로 처리한다 - 이 함수 자체는 그 순간의
  // 이미지 하나만 보고 순수하게 점수를 매길 뿐이다.)
  if (top.confidence < BRAND_CONFIDENCE_THRESHOLD || gap < BRAND_SCORE_GAP_THRESHOLD) {
    return { brand: KIOSK_BRAND.UNKNOWN, confidence: top.confidence, scores, matchedKeywords: top.matchedKeywords }
  }

  return { brand: top.brand, confidence: top.confidence, scores, matchedKeywords: top.matchedKeywords }
}

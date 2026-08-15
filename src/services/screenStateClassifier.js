import { fuzzyIncludes, normalizeText } from './textMatch'

/**
 * "촬영 기반" 키오스크 플로우 전용, 브랜드에 종속되지 않는 화면 상태 분류기.
 *
 * kioskClassifier.js의 classifyBrand()와 원리는 동일하다(여러 키워드의 가중치를
 * 합산해 점수를 매기고, 단일 키워드만으로는 확정하지 않는다). 다만 classifyBrand는
 * "브랜드 레지스트리(kioskBrands.js)"라는 실시간 연속 인식 엔진 전용 구조에 묶여 있어
 * 그대로 재사용하기 어렵고, 촬영 기반 엔진(useKioskCapture)은 애초에 브랜드에
 * 종속되지 않게 설계했으므로(맘스터치도 나중에 이 파일을 그대로 재사용할 예정) 여기서는
 * "상태별 키워드 맵"만 받는 순수 함수로 따로 둔다. kioskClassifier.js/kioskBrands.js는
 * 건드리지 않는다(기존 실시간 엔진 및 맘스터치가 계속 사용 중).
 */

/**
 * @typedef {Object} StateKeyword
 * @property {string} text   - 인식 키워드 원문
 * @property {number} weight - 이 키워드가 발견됐을 때 더해지는 점수(가중치)
 */

/**
 * @param {Array<{text: string}>} words - OCR로 인식된 단어 목록(하나의 촬영 이미지 전체)
 * @param {Record<string, StateKeyword[]>} stateKeywordMap - 상태값 -> 키워드 배열
 * @param {number} threshold - confidence가 이 값 이상이어야 해당 상태로 확정한다
 * @returns {{ state: string|null, confidence: number, matchedKeywords: string[] }}
 *   state가 null이면 "어떤 상태인지 확실하지 않음"을 의미한다(인식 실패 처리용).
 */
export function classifyScreenState(words, stateKeywordMap, threshold) {
  const unresolved = { state: null, confidence: 0, matchedKeywords: [] }
  if (!words?.length) return unresolved

  const normalizedTexts = words.map((word) => normalizeText(word.text)).filter(Boolean)

  let best = unresolved

  for (const [state, keywords] of Object.entries(stateKeywordMap)) {
    let score = 0
    const matchedKeywords = []

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword.text)
      // OCR 오인식(공백/특수문자/대소문자 차이)을 흡수하기 위해 정규화 후 fuzzy 매칭한다.
      const isMatched = normalizedTexts.some((text) => fuzzyIncludes(text, normalizedKeyword))

      if (isMatched) {
        matchedKeywords.push(keyword.text)
        score += keyword.weight
      }
    }

    const confidence = Math.min(1, Number(score.toFixed(2)))

    if (confidence > best.confidence) {
      best = { state, confidence, matchedKeywords }
    }
  }

  // threshold를 넘지 못하면 state를 null로 되돌려 "인식 실패"임을 명확히 한다.
  // (best.confidence/matchedKeywords는 디버그 표시를 위해 그대로 남겨둔다.)
  return best.confidence >= threshold ? best : { ...best, state: null }
}

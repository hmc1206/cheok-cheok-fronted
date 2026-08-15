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

// 두 정규화 문자열의 길이 비율이 이 값보다 작으면(=한쪽이 훨씬 짧으면) fuzzyIncludes의
// "포함" 판정을 매칭으로 인정하지 않는다.
const MIN_LENGTH_RATIO_FOR_MATCH = 0.5

/**
 * services/textMatch.js의 fuzzyIncludes(공용 - 기존 실시간 엔진도 그대로 사용 중이라
 * 수정하지 않는다)는 "짧은 문자열이 긴 문자열에 포함되는지"만 본다. 이 프로젝트의
 * 상태 판별 키워드에는 "신용카드를 투입구에 끝까지 넣으시고"처럼 아주 긴 문장이 있는데,
 * 그 안에 "신용카드"라는 흔한 단어가 우연히 통째로 포함되어 있으면 fuzzyIncludes가
 * "매칭"으로 보고 전혀 다른 화면과 잘못 연결되는 문제가 실제로 있었다(테스트로 확인).
 * 그래서 여기서는 fuzzyIncludes 결과에 "두 문자열 길이가 어느 정도 비슷할 때만 인정"하는
 * 가드를 한 겹 더 씌운다. "결제하기"/"결제 하기"처럼 원래 의도한 오인식 흡수는 길이가
 * 비슷하므로 계속 통과하고, "신용카드" vs 15자짜리 문장처럼 길이 차이가 큰 우연한 포함만
 * 걸러진다.
 * @param {string} normalizedText
 * @param {string} normalizedKeyword
 */
export function isReasonableMatch(normalizedText, normalizedKeyword) {
  if (!fuzzyIncludes(normalizedText, normalizedKeyword)) return false

  const shorterLength = Math.min(normalizedText.length, normalizedKeyword.length)
  const longerLength = Math.max(normalizedText.length, normalizedKeyword.length)
  if (longerLength === 0) return false

  return shorterLength / longerLength >= MIN_LENGTH_RATIO_FOR_MATCH
}

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
      // OCR 오인식(공백/특수문자/대소문자 차이)을 흡수하기 위해 정규화 후 fuzzy 매칭하되,
      // 길이가 크게 다른 우연한 포함은 매칭으로 인정하지 않는다(위 isReasonableMatch 참고).
      const isMatched = normalizedTexts.some((text) => isReasonableMatch(text, normalizedKeyword))

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

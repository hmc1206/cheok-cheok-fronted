import { TARGET_MATCH_THRESHOLD } from '../data/megaCoffeeGuide'
import { BRAND, KIOSK_BRAND_REGISTRY } from '../data/kioskBrands'
import { fuzzyIncludes, normalizeText, textSimilarity } from './textMatch'

/**
 * OCR 단어 목록을 종합해 현재 카메라에 보이는 키오스크가 어느 브랜드인지 판단한다.
 * 단일 단어만으로 판단하지 않고, 브랜드별 키워드 가중치를 합산해 confidence score를 계산한다.
 *
 * 여러 브랜드(메가커피/맘스터치 등)를 KIOSK_BRAND_REGISTRY에서 모두 채점한 뒤,
 * 자기 자신의 threshold를 넘긴 브랜드 중 confidence가 가장 높은 쪽을 채택한다.
 * "음료", "결제하기"처럼 여러 브랜드에 공통으로 등장하는 단어만으로는 어느 한쪽으로
 * 확정되지 않도록, 브랜드 고유 키워드(로고/상호명)에 훨씬 큰 가중치를 준다.
 *
 * @param {Array<{text: string}>} words
 * @returns {{brand: string, confidence: number, matchedKeywords: string[]}}
 */
export function classifyBrand(words) {
  const unknown = { brand: BRAND.UNKNOWN, confidence: 0, matchedKeywords: [] }
  if (!words || words.length === 0) return unknown

  const normalizedTexts = words.map((word) => normalizeText(word.text)).filter(Boolean)

  let best = unknown

  for (const entry of KIOSK_BRAND_REGISTRY) {
    let score = 0
    const matchedKeywords = []

    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalizeText(keyword.text)
      const isMatched = normalizedTexts.some((text) => fuzzyIncludes(text, normalizedKeyword))

      if (isMatched) {
        matchedKeywords.push(keyword.text)
        score += keyword.weight
      }
    }

    const confidence = Math.min(1, Number(score.toFixed(2)))

    if (confidence >= entry.brandThreshold && confidence > best.confidence) {
      best = { brand: entry.brand, confidence, matchedKeywords }
    }
  }

  return best
}

/**
 * OCR 단어 목록에서 targetTexts 후보들과 가장 유사한 단어를 찾는다.
 * 정확히 문자열이 같지 않아도 정규화 + fuzzy 유사도로 근접한 결과를 인정한다.
 * @param {Array<{text: string, x:number, y:number, width:number, height:number}>} words
 * @param {string[]} targetTexts
 * @returns {{text: string, confidence: number, box: {x:number,y:number,width:number,height:number}}|null}
 */
export function findBestTextMatch(words, targetTexts) {
  if (!words?.length || !targetTexts?.length) return null

  let best = null

  for (const word of words) {
    const normalizedWord = normalizeText(word.text)
    if (!normalizedWord) continue

    for (const target of targetTexts) {
      const normalizedTarget = normalizeText(target)
      const similarity = textSimilarity(normalizedWord, normalizedTarget)

      if (similarity > (best?.confidence ?? 0)) {
        best = {
          text: word.text,
          confidence: similarity,
          box: { x: word.x, y: word.y, width: word.width, height: word.height },
        }
      }
    }
  }

  return best && best.confidence >= TARGET_MATCH_THRESHOLD ? best : null
}

/**
 * 임의의 key별 signals(특징 단어) 후보 목록에서 현재 OCR 단어와 가장 잘 맞는 key를 찾는다.
 * 브랜드별 주문 단계(guideSteps) 판별과, 맘스터치 세트 구성/세트 옵션처럼 한 상태 안의
 * 하위 단계(phase) 판별에 공통으로 재사용하는 범용 함수다.
 *
 * @param {Array<{text: string}>} words
 * @param {Array<{key: string, signals?: string[]}>} candidates
 * @param {string|null} currentKey 신호가 불확실할 때 유지할 기본값
 * @param {number} threshold 이 비율 이상 일치해야 currentKey를 바꾼다
 * @returns {{key: string|null, ratio: number, matchedSignals: string[]}}
 */
export function detectBestSignalMatch(words, candidates, currentKey, threshold) {
  const fallback = { key: currentKey, ratio: 0, matchedSignals: [] }
  if (!words?.length || !candidates?.length) return fallback

  const normalizedTexts = words.map((word) => normalizeText(word.text)).filter(Boolean)

  let bestKey = currentKey
  let bestRatio = 0
  let bestSignals = []

  for (const candidate of candidates) {
    if (!candidate.signals?.length) continue

    const matchedSignals = candidate.signals.filter((signal) =>
      normalizedTexts.some((text) => fuzzyIncludes(text, normalizeText(signal))),
    )
    const ratio = matchedSignals.length / candidate.signals.length

    if (ratio > bestRatio) {
      bestRatio = ratio
      bestKey = candidate.key
      bestSignals = matchedSignals
    }
  }

  if (bestRatio >= threshold) {
    return { key: bestKey, ratio: bestRatio, matchedSignals: bestSignals }
  }

  return { key: currentKey, ratio: bestRatio, matchedSignals: bestSignals }
}

/**
 * 브랜드의 guideSteps를 이용해 현재 주문 단계를 추정한다(메가커피/맘스터치 공용).
 * 신호가 불확실하면 currentState를 그대로 유지한다(자동판별 실패 시 수동 버튼으로 이동 가능).
 * @param {Array<{text: string}>} words
 * @param {Array<{state: string, stateSignals?: string[]}>} guideSteps
 * @param {string|null} currentState
 * @param {number} threshold
 */
export function detectOrderState(words, guideSteps, currentState, threshold) {
  const candidates = guideSteps.map((step) => ({ key: step.state, signals: step.stateSignals }))
  return detectBestSignalMatch(words, candidates, currentState, threshold)
}

// 상품/음료 후보 목록에서 노이즈로 제외할 공통 단어(가격 단위, 뱃지 문구 등).
const DYNAMIC_CANDIDATE_STOPWORDS = ['원', '개', 'NEW', 'SOLDOUT', 'HOT', 'BEST']

/**
 * 상품명/음료명처럼 매장·시기에 따라 바뀌는 화면에서, 실시간 OCR 결과 중
 * 사용자가 고를 만한 후보 텍스트만 추려낸다(가격/뱃지 등 노이즈 및 중복 제거).
 * @param {Array<{text: string}>} words
 * @param {{ exclude?: string[], limit?: number }} [options]
 * @returns {string[]}
 */
export function extractDynamicCandidates(words, options = {}) {
  const { exclude = [], limit = 8 } = options
  if (!words?.length) return []

  const excludeNormalized = new Set(exclude.map((text) => normalizeText(text)))
  const seen = new Set()
  const candidates = []

  for (const word of words) {
    const normalized = normalizeText(word.text)
    if (!normalized || normalized.length < 2) continue
    if (seen.has(normalized) || excludeNormalized.has(normalized)) continue
    if (DYNAMIC_CANDIDATE_STOPWORDS.some((stopword) => normalizeText(stopword) === normalized)) continue

    seen.add(normalized)
    candidates.push(word.text.trim())

    if (candidates.length >= limit) break
  }

  return candidates
}

import {
  BRAND_CONFIDENCE_THRESHOLD,
  KIOSK_GUIDE_STEPS,
  MEGA_COFFEE_BRAND_KEYWORDS,
  STATE_DETECT_THRESHOLD,
  TARGET_MATCH_THRESHOLD,
} from '../data/megaCoffeeGuide'
import { fuzzyIncludes, normalizeText, textSimilarity } from './textMatch'

/**
 * OCR 단어 목록을 종합해 현재 카메라에 보이는 키오스크가 메가커피인지 판단한다.
 * 단일 단어만으로 판단하지 않고, 여러 키워드의 가중치를 합산해 confidence score를 계산한다.
 * @param {Array<{text: string}>} words
 * @returns {{brand: 'MEGA_COFFEE'|'UNKNOWN', confidence: number, matchedKeywords: string[]}}
 */
export function classifyBrand(words) {
  if (!words || words.length === 0) {
    return { brand: 'UNKNOWN', confidence: 0, matchedKeywords: [] }
  }

  const normalizedTexts = words.map((word) => normalizeText(word.text)).filter(Boolean)

  let score = 0
  const matchedKeywords = []

  for (const keyword of MEGA_COFFEE_BRAND_KEYWORDS) {
    const normalizedKeyword = normalizeText(keyword.text)
    const isMatched = normalizedTexts.some((text) => fuzzyIncludes(text, normalizedKeyword))

    if (isMatched) {
      matchedKeywords.push(keyword.text)
      score += keyword.weight
    }
  }

  const confidence = Math.min(1, Number(score.toFixed(2)))
  const brand = confidence >= BRAND_CONFIDENCE_THRESHOLD ? 'MEGA_COFFEE' : 'UNKNOWN'

  return { brand, confidence, matchedKeywords }
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
 * 현재 OCR 결과(화면 특징 단어)를 이용해 주문 단계가 바뀌었는지 추정한다.
 * 신호가 불확실하면 currentState를 그대로 유지한다(자동판별 실패 시 수동 버튼으로 이동 가능).
 * @param {Array<{text: string}>} words
 * @param {string} currentState ORDER_STATE 값
 * @returns {string} ORDER_STATE 값
 */
export function detectOrderState(words, currentState) {
  if (!words?.length) return currentState

  const normalizedTexts = words.map((word) => normalizeText(word.text)).filter(Boolean)

  let bestState = currentState
  let bestRatio = 0

  for (const step of KIOSK_GUIDE_STEPS) {
    if (!step.stateSignals?.length) continue

    const matchedCount = step.stateSignals.filter((signal) =>
      normalizedTexts.some((text) => fuzzyIncludes(text, normalizeText(signal))),
    ).length

    const ratio = matchedCount / step.stateSignals.length
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestState = step.state
    }
  }

  return bestRatio >= STATE_DETECT_THRESHOLD ? bestState : currentState
}

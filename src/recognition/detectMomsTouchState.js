import { classifyScreenState } from '../services/screenStateClassifier'
import { MOMS_TOUCH_STATE_CONFIDENCE_THRESHOLD, MOMS_TOUCH_STATE_KEYWORDS } from '../data/momsTouchFlow'

/**
 * 브랜드가 맘스터치로 판별된 뒤, 그 안에서 현재 화면이 어떤 상태(MOMS_START/MOMS_MENU/...)
 * 인지 판별한다. detectMegaState.js와 완전히 같은 패턴 - services/screenStateClassifier.js에
 * 맘스터치 전용 데이터(data/momsTouchFlow.js)만 주입하는 얇은 래퍼다.
 *
 * @param {Array<{text: string}>} words - 촬영 이미지에서 인식된 OCR 단어 목록
 * @returns {{ state: string|null, confidence: number, matchedKeywords: string[] }}
 */
export function detectMomsTouchState(words) {
  return classifyScreenState(words, MOMS_TOUCH_STATE_KEYWORDS, MOMS_TOUCH_STATE_CONFIDENCE_THRESHOLD)
}

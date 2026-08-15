import { classifyScreenState } from '../services/screenStateClassifier'
import { MEGA_STATE_CONFIDENCE_THRESHOLD, MEGA_STATE_KEYWORDS } from '../data/megaFlow'

/**
 * 브랜드가 메가커피로 판별된 뒤, 그 안에서 현재 화면이 어떤 상태(MEGA_START/MEGA_MENU/...)
 * 인지 판별한다. services/screenStateClassifier.js(브랜드 무관 범용 가중치 분류기)에
 * 메가커피 전용 데이터(data/megaFlow.js)만 주입하는 얇은 래퍼다 - recognition/ 폴더 아래
 * "브랜드별 상태 판별" 진입점을 분리해두면(요구사항 3장) 나중에 다른 브랜드를 추가할 때도
 * 같은 패턴(detectXxxState.js)을 따르면 된다는 걸 명확히 보여준다.
 *
 * @param {Array<{text: string}>} words - 촬영 이미지에서 인식된 OCR 단어 목록
 * @returns {{ state: string|null, confidence: number, matchedKeywords: string[] }}
 */
export function detectMegaState(words) {
  return classifyScreenState(words, MEGA_STATE_KEYWORDS, MEGA_STATE_CONFIDENCE_THRESHOLD)
}

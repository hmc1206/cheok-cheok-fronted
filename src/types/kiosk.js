/**
 * "촬영 기반" 키오스크 인식 시스템(useKioskCapture 및 하위 모듈)에서 공용으로 쓰는
 * 브랜드/좌표/플로우 타입 정의 모음.
 *
 * 프로젝트가 순수 JavaScript(JSX)라 .ts 대신 JSDoc typedef로 타입을 명시한다.
 * 런타임에는 KIOSK_BRAND 상수 객체만 실제로 존재하고 나머지는 전부 주석(JSDoc)이다.
 * 이 파일은 브랜드에 종속되지 않는 "형태" 정의만 담고, 실제 브랜드별 데이터는
 * data/megaFlow.js, data/momsTouchFlow.js에 둔다.
 */

/**
 * 지원하는 키오스크 브랜드. 촬영 이미지가 어느 브랜드인지 확신할 수 없을 때는 UNKNOWN.
 * (참고: 기존 실시간 연속 인식 엔진(services/kioskClassifier.js, data/kioskBrands.js)은
 * 완전히 별개 시스템이라 'MEGA_COFFEE'라는 다른 문자열을 쓴다 - 서로 건드리지 않으므로
 * 이름이 달라도 충돌하지 않는다.)
 */
export const KIOSK_BRAND = {
  MEGA: 'MEGA',
  MOMS_TOUCH: 'MOMS_TOUCH',
  UNKNOWN: 'UNKNOWN',
}

/**
 * @typedef {Object} BrandDetectionResult
 * @property {string} brand - KIOSK_BRAND 값 중 하나
 * @property {number} confidence - 채택된 brand의 점수(0~1). UNKNOWN이면 두 브랜드 중 더 높은 점수.
 * @property {{ mega: number, momsTouch: number }} scores - 두 브랜드 각각의 원점수(0~1로 클램프)
 * @property {string[]} matchedKeywords - 점수에 반영된 키워드 원문 목록(디버그용)
 */

/**
 * @typedef {Object} GuideTarget
 * @property {number} x       - 촬영 이미지 기준 강조 영역의 좌측(top-left) x, 0~100 퍼센트
 * @property {number} y       - 촬영 이미지 기준 강조 영역의 상단(top-left) y, 0~100 퍼센트
 * @property {number} width   - 촬영 이미지 너비 대비 강조 영역 너비, 0~100 퍼센트
 * @property {number} height  - 촬영 이미지 높이 대비 강조 영역 높이, 0~100 퍼센트
 * @property {string} label   - 강조 영역 옆에 붙는 짧은 라벨. 예: "① 여기를 눌러주세요"
 * @property {'primary'|'secondary'} [emphasis] - primary(기본값)는 가장 강하게, secondary는 보조적으로
 */

/**
 * @typedef {Object} KioskFlowStep
 * @property {string} id                    - 플로우 내 고유 id
 * @property {string} brand                 - KIOSK_BRAND 값. 이 스텝이 어느 브랜드 소속인지
 * @property {string} state                 - 브랜드별 화면 상태값(MegaState 또는 MomsTouchState)
 * @property {string} [optionStep]           - 같은 state 안에 여러 안내 단계가 있을 때 구분하는 내부 id
 *   (예: 맘스터치 MOMS_SET_OPTION_TOP 상태 안의 'CHICKEN'/'BURGER'/'SCROLL')
 * @property {string} title                 - STEP 제목(짧게)
 * @property {string} instruction           - 큰 글씨 핵심 안내 문구
 * @property {string} [subInstruction]      - 보조 설명(작은 글씨)
 * @property {string[]} recognitionKeywords - 이 스텝이 속한 상태를 재확인할 때 쓰는 키워드
 * @property {GuideTarget[]} targets        - 촬영 이미지 위에 표시할 AR 강조 영역들(백분율 좌표)
 * @property {string} [captureButtonLabel]  - "다음 화면 촬영" 버튼 문구(기본값 "다음 화면 촬영")
 * @property {string} [sameCaptureNextId]   - 값이 있으면 재촬영 없이 같은 사진을 유지한 채 이
 *   id의 스텝으로 넘어가는 보조 버튼을 하나 더 보여준다(실제 키오스크 화면은 아직 안 바뀐 경우)
 * @property {string} [sameCaptureButtonLabel] - sameCaptureNextId가 있을 때 그 보조 버튼 문구
 * @property {boolean} [noTargetSearch]      - true면 AR 강조 박스를 표시하지 않고 방향 안내만 표시
 * @property {'up'|'down'} [directionHint]   - noTargetSearch일 때 화살표 방향
 */

/**
 * 맘스터치 "옵션 화면" 내부 안내 단계. 같은 화면 상태(state) 안에서 여러 행동이 필요한 경우
 * 이 값으로 구분한다(요구사항: 화면 상태와 안내 단계를 분리).
 */
export const MOMS_OPTION_GUIDE_STEP = {
  CHICKEN: 'CHICKEN',
  BURGER: 'BURGER',
  BURGER_REQUEST: 'BURGER_REQUEST',
  SCROLL: 'SCROLL',
  DRINK: 'DRINK',
  EXTRA: 'EXTRA',
  ADD_TO_CART: 'ADD_TO_CART',
  CONFIRM_ORDER: 'CONFIRM_ORDER',
  SELECT_PAYMENT: 'SELECT_PAYMENT',
}

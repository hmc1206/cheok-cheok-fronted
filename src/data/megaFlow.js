/**
 * 메가커피 키오스크 "촬영 기반" 안내 플로우 데이터.
 *
 * 기존 실시간 연속 인식 방식(megaCoffeeGuide.js + useKioskRecognition)과는 완전히 다른,
 * "사진 한 장을 찍어서 분석하고, 그 사진 위에 AR을 그려주는" 새 방식 전용 데이터다.
 * megaCoffeeGuide.js는 맘스터치(momsTouchGuide.js)와 함께 기존 실시간 엔진에서 계속
 * 쓰이므로 이 파일에서는 건드리지 않는다. 이 새 엔진(useKioskCapture 등)은 브랜드에
 * 종속되지 않게 만들어서, 나중에 맘스터치도 같은 방식으로 옮길 때 이 파일과 같은 모양의
 * data 파일(예: momsFlow.js) 하나만 새로 추가하면 되도록 했다.
 *
 * 실제 메가커피 키오스크를 촬영한 사진(사용자 제공)을 근거로 각 화면의 실제 한국어 문구와
 * 화면 상태를 확인해 키워드를 채웠다:
 * - 시작 화면: "화면터치", "상품선택", "결제/주문확인", "주문완료", "쉬운모드"
 * - 메뉴 화면: 상단 카테고리 탭(신메뉴/추천메뉴/스페셜굿즈/메가엠지씨커피/커피/디카페인/티/음료/푸드/상품)
 *   + 우측 장바구니 패널(장바구니 조회/결제하기/전체삭제)
 * - 옵션 화면: "선택하신 상품의 옵션상품을 모두 선택해주세요", "옵션추가", "텀블러선택"
 * - 먹고가기/포장하기 화면: 하단 큰 버튼 2개 + "일회용컵 사용 불가" 안내
 * - 결제수단 화면: "할인수단을 선택해주세요"(STEP1, 선택사항) / "결제수단을 선택해주세요"(STEP2, 필수)
 * - 스탬프 화면: "스탬프 적립" + 010- 숫자 키패드 + "적립" 버튼
 * - CJ ONE 화면: "CJ ONE 포인트를 적립하시겠습니까?" + 예/아니요
 * - 일회용품 화면: "일회용품 필요여부를 선택(체크)해주세요" + 4개 체크박스 + "선택완료"
 */

// ─────────────────────────────────────────────────────────────────────────
// 화면 상태(state) 정의
// ─────────────────────────────────────────────────────────────────────────

/**
 * 촬영한 이미지가 어떤 키오스크 화면인지 분류할 때 쓰는 상태값.
 * STEP2(카테고리 선택)와 STEP3(상품 선택)은 실제 키오스크 화면 자체는 둘 다
 * MEGA_MENU 상태로 동일하다(카테고리를 눌러도 같은 "메뉴" 화면 안에서 상품 목록만 바뀔 뿐이다).
 * 두 스텝을 구분하는 것은 "우리 서비스가 지금 어떤 안내를 보여주고 있는가"이지,
 * 키오스크 화면 자체의 상태가 아니다.
 */
export const MEGA_STATE = {
  START: 'MEGA_START',
  MENU: 'MEGA_MENU',
  OPTION: 'MEGA_OPTION',
  CART: 'MEGA_CART',
  ORDER_TYPE: 'MEGA_ORDER_TYPE',
  PAYMENT: 'MEGA_PAYMENT',
  STAMP: 'MEGA_STAMP',
  CJ_POINT: 'MEGA_CJ_POINT',
  DISPOSABLE: 'MEGA_DISPOSABLE',
}

/**
 * 화면 상태 판별에 사용하는 상태별 키워드 점수표.
 * 키워드 하나만 발견됐다고 그 상태로 확정하지 않고(요구사항), 여러 키워드의 가중치를
 * 합산해 confidence를 계산한다(services/megaScreenClassifier.js에서 사용).
 * 브랜드 판별(kioskClassifier.classifyBrand)과 동일한 "가중치 합산" 방식을 그대로 재사용한다.
 *
 * 가중치 원칙:
 * - 그 화면에서만 나오는 고유한 문구(예: "일회용품 필요여부")는 높은 가중치
 * - 여러 화면에 공통으로 나올 수 있는 단어(예: "결제하기"는 메뉴/카트 화면 모두에 등장)는
 *   낮은 가중치만 부여해 단어 하나로 오판정되지 않게 한다
 */
export const MEGA_STATE_KEYWORDS = {
  [MEGA_STATE.START]: [
    { text: '화면터치', weight: 0.4 },
    { text: '쉬운모드', weight: 0.2 },
    { text: '상품선택', weight: 0.25 },
    { text: '결제/주문확인', weight: 0.3 },
    { text: '결제/주문서확인', weight: 0.3 },
    { text: '주문완료', weight: 0.2 },
  ],
  [MEGA_STATE.MENU]: [
    { text: '메가엠지씨커피', weight: 0.3 },
    { text: '신메뉴', weight: 0.15 },
    { text: '추천메뉴', weight: 0.15 },
    { text: '스페셜굿즈', weight: 0.15 },
    { text: '커피', weight: 0.08 },
    { text: '디카페인', weight: 0.1 },
    { text: '티', weight: 0.05 },
    { text: '음료', weight: 0.05 },
    { text: '푸드', weight: 0.1 },
    { text: '상품', weight: 0.05 },
    { text: '장바구니 조회', weight: 0.2 },
    { text: '결제하기', weight: 0.1 },
  ],
  [MEGA_STATE.OPTION]: [
    { text: '선택하신 상품의 옵션상품', weight: 0.45 },
    { text: '선택된 옵션', weight: 0.3 },
    { text: '옵션 추가', weight: 0.25 },
    { text: '초기화', weight: 0.1 },
    { text: '주문담기', weight: 0.15 },
    { text: '텀블러선택', weight: 0.15 },
  ],
  [MEGA_STATE.CART]: [
    { text: '선택한 상품', weight: 0.3 },
    { text: '수량', weight: 0.1 },
    { text: '가격', weight: 0.1 },
    { text: '전체삭제', weight: 0.15 },
    { text: '결제하기', weight: 0.15 },
  ],
  [MEGA_STATE.ORDER_TYPE]: [
    { text: '주문 세부내역', weight: 0.3 },
    { text: '먹고가기', weight: 0.35 },
    { text: '포장하기', weight: 0.35 },
    { text: '총 결제금액', weight: 0.15 },
    { text: '일회용컵 사용 불가', weight: 0.2 },
  ],
  [MEGA_STATE.PAYMENT]: [
    { text: '결제수단 선택', weight: 0.35 },
    { text: '결제수단을 선택해주세요', weight: 0.35 },
    { text: '할인수단', weight: 0.25 },
    { text: '카드결제', weight: 0.2 },
    { text: '앱카드', weight: 0.15 },
    { text: '카카오페이', weight: 0.1 },
    { text: '네이버페이', weight: 0.1 },
    { text: '모바일상품권', weight: 0.15 },
  ],
  [MEGA_STATE.STAMP]: [
    { text: '스탬프 적립', weight: 0.5 },
    { text: '010', weight: 0.15 },
    { text: '적립', weight: 0.2 },
  ],
  [MEGA_STATE.CJ_POINT]: [
    { text: 'CJ ONE포인트', weight: 0.4 },
    { text: 'CJ ONE 포인트', weight: 0.4 },
    { text: '적립 하시겠습니까', weight: 0.35 },
    { text: '예', weight: 0.05 },
    { text: '아니요', weight: 0.1 },
  ],
  [MEGA_STATE.DISPOSABLE]: [
    { text: '일회용품 필요여부', weight: 0.45 },
    { text: '선택안함', weight: 0.15 },
    { text: '빨대/스틱 필요', weight: 0.2 },
    { text: '캐리어/봉투 필요', weight: 0.2 },
    { text: '직접 가져갈게요', weight: 0.2 },
    { text: '선택완료', weight: 0.15 },
  ],
}

// 이 confidence 이상이어야 해당 상태로 확정한다. 넘지 못하면 "인식 실패" 처리.
export const MEGA_STATE_CONFIDENCE_THRESHOLD = 0.5

// ─────────────────────────────────────────────────────────────────────────
// 타입 정의 (JSDoc) — 프로젝트가 순수 JS(JSX)라 .ts 대신 JSDoc으로 타입을 명시한다.
// ─────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GuideTarget
 * @property {number} x       - 촬영 이미지 기준 강조 영역의 좌측(top-left) x, 0~100 퍼센트
 * @property {number} y       - 촬영 이미지 기준 강조 영역의 상단(top-left) y, 0~100 퍼센트
 * @property {number} width   - 촬영 이미지 너비 대비 강조 영역 너비, 0~100 퍼센트
 * @property {number} height  - 촬영 이미지 높이 대비 강조 영역 높이, 0~100 퍼센트
 * @property {string} label   - 강조 영역 옆에 붙는 짧은 라벨. 예: "① 여기를 눌러주세요"
 * @property {'primary'|'secondary'} [emphasis] - primary(기본값)는 가장 강하게, secondary는
 *   보조적으로 강조한다(요구사항: 한 화면에서는 한 가지 핵심 행동을 가장 강하게 강조).
 */

/**
 * @typedef {Object} MegaFlowStep
 * @property {string} id                    - 플로우 내 고유 id
 * @property {string} state                 - MEGA_STATE 값. 이 스텝이 어떤 화면 상태에 대응하는지
 * @property {string} title                 - STEP 제목(짧게)
 * @property {string} instruction           - 큰 글씨 핵심 안내 문구
 * @property {string} [subInstruction]      - 보조 설명(작은 글씨)
 * @property {string[]} recognitionKeywords - 이 스텝에 해당하는 화면인지 재확인할 때 쓰는 키워드
 *   (MEGA_STATE_KEYWORDS의 해당 state 키워드를 그대로 참조 - 아래 buildRecognitionKeywords 참고)
 * @property {GuideTarget[]} targets        - 촬영 이미지 위에 표시할 AR 강조 영역들(백분율 좌표)
 * @property {string} [captureButtonLabel]  - "다음 화면 촬영" 버튼에 표시할 문구(기본값 아래 DEFAULT_CAPTURE_LABEL)
 * @property {string} [sameCaptureNextId]   - 값이 있으면, 재촬영 없이 같은 사진을 유지한 채
 *   이 id의 스텝으로 넘어가는 보조 버튼을 하나 더 보여준다(예: "원하는 상품이 이미 보여요",
 *   "옵션 선택 완료"). 실제 키오스크 화면은 아직 안 바뀌었지만 안내 문구만 다음 단계로 넘기는 경우다.
 * @property {string} [sameCaptureButtonLabel] - sameCaptureNextId가 있을 때 그 보조 버튼 문구
 */

const DEFAULT_CAPTURE_LABEL = '다음 화면 촬영'

/** MEGA_STATE_KEYWORDS에서 텍스트만 뽑아 recognitionKeywords 배열로 변환한다(중복 정의 방지). */
function keywordTexts(state) {
  return MEGA_STATE_KEYWORDS[state].map((k) => k.text)
}

// ─────────────────────────────────────────────────────────────────────────
// 10단계 안내 플로우 (요구사항 4장)
// ─────────────────────────────────────────────────────────────────────────

/** @type {MegaFlowStep[]} */
export const MEGA_FLOW_STEPS = [
  // STEP 1. 주문 시작
  {
    id: 'step-1-start',
    state: MEGA_STATE.START,
    title: 'STEP 1. 주문 시작',
    instruction: '키오스크 화면을 한 번 눌러 주문을 시작해주세요.',
    recognitionKeywords: keywordTexts(MEGA_STATE.START),
    targets: [
      // 화면 중앙 전체를 강조 - 어디를 눌러도 시작되는 대기 화면이라 특정 버튼이 없다.
      { x: 10, y: 15, width: 80, height: 70, label: '① 화면을 눌러주세요', emphasis: 'primary' },
    ],
  },

  // STEP 2. 카테고리 선택 (state: MEGA_MENU)
  {
    id: 'step-2-category',
    state: MEGA_STATE.MENU,
    title: 'STEP 2. 카테고리 선택',
    instruction: '화면 위쪽에서 원하는 메뉴의 종류를 선택해주세요.',
    subInstruction: '신메뉴, 추천메뉴, 커피, 디카페인, 음료, 티, 푸드, 상품 중에서 선택할 수 있어요.',
    recognitionKeywords: keywordTexts(MEGA_STATE.MENU),
    targets: [
      // 실제 사진 기준 카테고리 탭은 화면 최상단 가로 전체 폭에 얇게 위치한다.
      { x: 4, y: 6, width: 92, height: 8, label: '① 원하는 종류를 눌러주세요', emphasis: 'primary' },
    ],
    // 카테고리를 눌러도 같은 MEGA_MENU 상태이므로, 화면이 바뀐 걸 다시 찍거나(재촬영)
    // 이미 원하는 상품이 보이면 재촬영 없이 바로 상품 선택 안내로 넘어갈 수 있다.
    captureButtonLabel: '화면이 바뀌었어요',
    sameCaptureNextId: 'step-3-product',
    sameCaptureButtonLabel: '원하는 상품이 이미 보여요',
  },

  // STEP 3. 상품 선택 (state: MEGA_MENU)
  {
    id: 'step-3-product',
    state: MEGA_STATE.MENU,
    title: 'STEP 3. 상품 선택',
    instruction: '주문하고 싶은 상품의 사진을 눌러주세요.',
    subInstruction: "'일시품절'이라고 표시된 상품은 선택할 수 없어요.",
    recognitionKeywords: keywordTexts(MEGA_STATE.MENU),
    targets: [
      // 상품 카드 영역(카테고리 탭 아래 ~ 하단 장바구니 패널 위) 전체를 강조.
      // 특정 상품 하나를 임의로 짚지 않는다(요구사항).
      { x: 4, y: 16, width: 68, height: 70, label: '① 원하는 상품을 눌러주세요', emphasis: 'primary' },
    ],
  },

  // STEP 4a. 상품 옵션 선택 - 수량/필수옵션
  {
    id: 'step-4a-option-select',
    state: MEGA_STATE.OPTION,
    title: 'STEP 4. 상품 옵션 선택',
    instruction: '원하는 수량과 필수 옵션을 선택해주세요.',
    recognitionKeywords: keywordTexts(MEGA_STATE.OPTION),
    targets: [
      { x: 6, y: 30, width: 40, height: 10, label: '① 수량을 선택해주세요', emphasis: 'primary' },
      { x: 6, y: 55, width: 88, height: 12, label: '② 텀블러 사용 여부를 선택해주세요', emphasis: 'secondary' },
      { x: 6, y: 70, width: 88, height: 12, label: '③ 옵션을 추가해주세요', emphasis: 'secondary' },
    ],
    // 수량/옵션을 고른다고 실제 키오스크 화면이 넘어가지는 않으므로, 재촬영 없이
    // "주문담기" 안내로만 넘어가는 보조 버튼을 둔다.
    sameCaptureNextId: 'step-4b-option-confirm',
    sameCaptureButtonLabel: '옵션 선택 완료',
  },

  // STEP 4b. 상품 옵션 선택 - 주문담기
  {
    id: 'step-4b-option-confirm',
    state: MEGA_STATE.OPTION,
    title: 'STEP 4. 상품 옵션 선택',
    instruction: "선택을 마쳤다면 아래의 '주문담기'를 눌러주세요.",
    recognitionKeywords: keywordTexts(MEGA_STATE.OPTION),
    targets: [{ x: 55, y: 85, width: 40, height: 10, label: '① 주문담기를 눌러주세요', emphasis: 'primary' }],
  },

  // STEP 5. 장바구니 확인
  {
    id: 'step-5-cart',
    state: MEGA_STATE.CART,
    title: 'STEP 5. 장바구니 확인',
    instruction: "메뉴와 수량이 맞다면 오른쪽 아래의 '결제하기'를 눌러주세요.",
    subInstruction: '메뉴를 더 주문하려면 다른 상품을 추가로 선택할 수 있어요.',
    recognitionKeywords: keywordTexts(MEGA_STATE.CART),
    targets: [
      { x: 4, y: 20, width: 92, height: 50, label: '① 담긴 메뉴와 수량을 확인해주세요', emphasis: 'secondary' },
      { x: 55, y: 85, width: 40, height: 10, label: '② 결제하기를 눌러주세요', emphasis: 'primary' },
    ],
  },

  // STEP 6. 먹고가기 또는 포장하기
  {
    id: 'step-6-order-type',
    state: MEGA_STATE.ORDER_TYPE,
    title: 'STEP 6. 이용 방법 선택',
    instruction: "매장에서 드시려면 '먹고가기'를, 가져가시려면 '포장하기'를 눌러주세요.",
    subInstruction: '매장에서 드시는 경우 일회용 컵을 사용할 수 없어요.',
    recognitionKeywords: keywordTexts(MEGA_STATE.ORDER_TYPE),
    targets: [
      { x: 6, y: 78, width: 40, height: 14, label: '① 먹고가기', emphasis: 'primary' },
      { x: 54, y: 78, width: 40, height: 14, label: '① 포장하기', emphasis: 'primary' },
    ],
  },

  // STEP 7. 할인 및 결제수단 선택
  {
    id: 'step-7-payment',
    state: MEGA_STATE.PAYMENT,
    title: 'STEP 7. 결제수단 선택',
    instruction: '할인이나 쿠폰이 있다면 위쪽에서 먼저 선택해주세요. 없다면 아래에서 결제수단을 선택해주세요.',
    subInstruction: "일반 신용카드나 체크카드는 '카드결제'를 누르면 돼요.",
    recognitionKeywords: keywordTexts(MEGA_STATE.PAYMENT),
    targets: [
      { x: 4, y: 12, width: 92, height: 20, label: '① 할인수단 (선택하지 않아도 돼요)', emphasis: 'secondary' },
      { x: 4, y: 36, width: 92, height: 45, label: '② 결제수단을 선택해주세요', emphasis: 'secondary' },
      { x: 4, y: 60, width: 30, height: 12, label: '③ 카드결제', emphasis: 'primary' },
    ],
  },

  // STEP 8. 스탬프 적립
  {
    id: 'step-8-stamp',
    state: MEGA_STATE.STAMP,
    title: 'STEP 8. 스탬프 적립',
    instruction: "스탬프를 적립하려면 휴대전화 번호를 입력한 뒤 '적립'을 눌러주세요.",
    subInstruction: '적립하지 않으려면 오른쪽 위의 X 버튼을 눌러주세요.',
    recognitionKeywords: keywordTexts(MEGA_STATE.STAMP),
    targets: [
      { x: 10, y: 40, width: 80, height: 35, label: '① 전화번호를 입력해주세요', emphasis: 'secondary' },
      { x: 10, y: 78, width: 80, height: 10, label: '② 적립을 눌러주세요', emphasis: 'primary' },
      { x: 82, y: 4, width: 14, height: 8, label: '건너뛰려면 X', emphasis: 'secondary' },
    ],
  },

  // STEP 9. CJ ONE 포인트 적립
  {
    id: 'step-9-cj-point',
    state: MEGA_STATE.CJ_POINT,
    title: 'STEP 9. CJ ONE 포인트 적립',
    instruction: "포인트를 적립하려면 '예'를, 적립하지 않으려면 '아니요'를 눌러주세요.",
    recognitionKeywords: keywordTexts(MEGA_STATE.CJ_POINT),
    targets: [
      { x: 55, y: 55, width: 35, height: 12, label: '① 예', emphasis: 'primary' },
      { x: 10, y: 55, width: 35, height: 12, label: '① 아니요', emphasis: 'secondary' },
    ],
  },

  // STEP 10. 일회용품 선택
  {
    id: 'step-10-disposable',
    state: MEGA_STATE.DISPOSABLE,
    title: 'STEP 10. 일회용품 선택',
    instruction: "필요한 일회용품을 선택한 뒤 '선택완료'를 눌러주세요.",
    subInstruction: "필요하지 않으면 '선택안함'을 선택해주세요.",
    recognitionKeywords: keywordTexts(MEGA_STATE.DISPOSABLE),
    targets: [
      { x: 10, y: 35, width: 80, height: 45, label: '① 필요한 항목을 선택해주세요', emphasis: 'secondary' },
      { x: 55, y: 84, width: 40, height: 10, label: '② 선택완료를 눌러주세요', emphasis: 'primary' },
    ],
  },
]

/** flow에서 id로 스텝을 찾는다. */
export function getMegaFlowStep(stepId) {
  return MEGA_FLOW_STEPS.find((step) => step.id === stepId) ?? null
}

/** flow의 첫 스텝 id. */
export const MEGA_FLOW_FIRST_STEP_ID = MEGA_FLOW_STEPS[0].id

/**
 * "화면 직접 선택" 목록에 보여줄 사람이 읽기 쉬운 상태 이름.
 * StateSelector 컴포넌트에서 사용한다.
 */
export const MEGA_STATE_LABELS = {
  [MEGA_STATE.START]: '시작 화면 (화면을 눌러 시작)',
  [MEGA_STATE.MENU]: '메뉴 화면 (카테고리/상품 목록)',
  [MEGA_STATE.OPTION]: '옵션 선택 화면',
  [MEGA_STATE.CART]: '장바구니 화면',
  [MEGA_STATE.ORDER_TYPE]: '먹고가기/포장하기 선택 화면',
  [MEGA_STATE.PAYMENT]: '결제수단 선택 화면',
  [MEGA_STATE.STAMP]: '스탬프 적립 화면',
  [MEGA_STATE.CJ_POINT]: 'CJ ONE 포인트 적립 화면',
  [MEGA_STATE.DISPOSABLE]: '일회용품 선택 화면',
}

/**
 * state 값 하나로 그 상태의 "대표 스텝"(가장 먼저 등장하는 스텝)을 찾는다.
 * "화면 직접 선택"에서 사용자가 상태를 고르면 이 스텝으로 이동한다.
 */
export function getFirstStepForState(state) {
  return MEGA_FLOW_STEPS.find((step) => step.state === state) ?? null
}

export { DEFAULT_CAPTURE_LABEL }

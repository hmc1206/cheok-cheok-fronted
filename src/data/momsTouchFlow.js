/**
 * 맘스터치 키오스크 "촬영 기반" 안내 플로우 데이터.
 *
 * data/megaFlow.js와 완전히 같은 구조(KioskFlowStep[])를 쓰지만 브랜드별로 파일을
 * 분리해 서로 독립적으로 관리한다(megaFlow.js는 이 작업에서 brand 필드/브랜드
 * 키워드 추가 외에는 건드리지 않았다).
 *
 * 목표 주문(사용자 제공 사진 기준):
 *   이용 방법: 매장 / 상품: 떡강정세트 / 필수 치킨: 케이준떡강정S 1개 /
 *   필수 버거: 아라비아따치즈버거(+2,500원) / 버거 요청사항: 요청-없음 /
 *   음료: 펩시콜라 -> 펩시콜라제로 / 추가 소스: 선택없음 /
 *   최종 수량: 떡강정세트 1개 / 총 결제금액: 12,600원 / 결제수단: 신용카드
 *
 * 참고: 사진 속 "싸이버거 -> 요청-없음" 팝업은 옵션 팝업의 "형태"를 보여주는
 * 참고 화면일 뿐이고, 실제 목표 플로우는 "아라비아따치즈버거 -> 요청-없음"이다
 * (STEP 6에서 다른 버거가 감지되면 경고를 표시하도록 별도 검증 함수를 둔다).
 */

import { KIOSK_BRAND, MOMS_OPTION_GUIDE_STEP } from '../types/kiosk'
import { normalizeText } from '../services/textMatch'

// ─────────────────────────────────────────────────────────────────────────
// 브랜드 판별용 키워드 (recognition/detectKioskBrand.js에서 사용)
// ─────────────────────────────────────────────────────────────────────────

/**
 * 맘스터치 "브랜드"를 판별하는 키워드. megaFlow.js의 MEGA_BRAND_KEYWORDS와 대응된다.
 * "MOM'S TOUCH"/"MOMS TOUCH"/"MOMSTOUCH"는 normalizeText가 공백·대소문자·작은따옴표를
 * 모두 제거해 동일한 문자열로 만들어주므로(services/textMatch.js, 기존 로직 재사용)
 * 키워드 목록에는 한 번만 넣으면 된다.
 */
export const MOMS_TOUCH_BRAND_KEYWORDS = [
  { text: "MOM'S TOUCH", weight: 0.4 },
  { text: '맘스터치', weight: 0.4 },
  { text: '인기메뉴', weight: 0.06 },
  { text: '버거', weight: 0.06 },
  { text: '순살치킨', weight: 0.08 },
  { text: '뼈치킨', weight: 0.08 },
  { text: '세트', weight: 0.04 },
  { text: '사이드', weight: 0.06 },
  { text: '떡강정세트', weight: 0.12 },
  { text: '주문담기', weight: 0.05 },
  { text: '직원호출', weight: 0.08 },
]

// ─────────────────────────────────────────────────────────────────────────
// 화면 상태(state) 정의
// ─────────────────────────────────────────────────────────────────────────

export const MOMS_TOUCH_STATE = {
  START: 'MOMS_START',
  MENU: 'MOMS_MENU',
  SET_MENU: 'MOMS_SET_MENU',
  SET_OPTION_TOP: 'MOMS_SET_OPTION_TOP',
  BURGER_REQUEST: 'MOMS_BURGER_REQUEST',
  SET_OPTION_BOTTOM: 'MOMS_SET_OPTION_BOTTOM',
  CART: 'MOMS_CART',
  ORDER_CONFIRM: 'MOMS_ORDER_CONFIRM',
  CARD_PAYMENT: 'MOMS_CARD_PAYMENT',
  UNKNOWN: 'MOMS_UNKNOWN',
}

/**
 * 화면 상태 판별용 키워드 점수표(services/screenStateClassifier.js에서 사용).
 * 실제 촬영 사진(사용자 제공)에서 확인한 문구를 그대로 반영했다.
 */
export const MOMS_TOUCH_STATE_KEYWORDS = {
  [MOMS_TOUCH_STATE.START]: [
    { text: '카드전용 주문기기 입니다', weight: 0.4 },
    { text: '매장', weight: 0.15 },
    { text: '포장', weight: 0.15 },
    { text: '한국어', weight: 0.1 },
    { text: 'English', weight: 0.1 },
  ],
  [MOMS_TOUCH_STATE.MENU]: [
    { text: "MOM'S TOUCH", weight: 0.1 },
    { text: '인기메뉴', weight: 0.15 },
    { text: '버거', weight: 0.1 },
    { text: '순살치킨', weight: 0.12 },
    { text: '뼈치킨', weight: 0.12 },
    { text: '음료', weight: 0.08 },
    { text: '세트', weight: 0.08 },
    { text: '사이드', weight: 0.1 },
    { text: '결제하기', weight: 0.1 },
  ],
  [MOMS_TOUCH_STATE.SET_MENU]: [
    { text: '세트', weight: 0.15 },
    { text: '떡강정세트', weight: 0.35 },
    { text: '치버세트', weight: 0.25 },
    { text: '후떡징싱글세트', weight: 0.25 },
    { text: '후떡죽커플세트', weight: 0.25 },
  ],
  [MOMS_TOUCH_STATE.SET_OPTION_TOP]: [
    { text: '떡강정세트', weight: 0.25 },
    { text: '필수', weight: 0.2 },
    { text: '치킨', weight: 0.15 },
    { text: '버거', weight: 0.1 },
    { text: '선택 가능 수량', weight: 0.2 },
    { text: '주문담기', weight: 0.1 },
  ],
  [MOMS_TOUCH_STATE.BURGER_REQUEST]: [
    { text: '옵션추가', weight: 0.35 },
    { text: '요청-없음', weight: 0.2 },
    { text: '요청-양파제외', weight: 0.15 },
    { text: '요청-피클제외', weight: 0.15 },
    { text: '요청-피클,양파제외', weight: 0.15 },
  ],
  [MOMS_TOUCH_STATE.SET_OPTION_BOTTOM]: [
    { text: '펩시콜라', weight: 0.2 },
    { text: '펩시콜라제로', weight: 0.2 },
    { text: '사이다', weight: 0.15 },
    { text: '추가', weight: 0.1 },
    { text: '선택없음', weight: 0.15 },
    { text: '주문상품', weight: 0.15 },
    { text: '주문담기', weight: 0.1 },
  ],
  [MOMS_TOUCH_STATE.CART]: [
    { text: '주문상품', weight: 0.15 },
    { text: '총 수량', weight: 0.25 },
    { text: '총 금액', weight: 0.25 },
    { text: '떡강정세트', weight: 0.15 },
    { text: '결제하기', weight: 0.2 },
  ],
  [MOMS_TOUCH_STATE.ORDER_CONFIRM]: [
    { text: '주문하실 내용이 맞나요', weight: 0.35 },
    { text: '결제 후 취소나 변경이 어렵습니다', weight: 0.3 },
    { text: '주문 금액', weight: 0.1 },
    { text: '할인 금액', weight: 0.1 },
    { text: '총 결제 금액', weight: 0.15 },
    { text: '신용카드', weight: 0.05 },
    { text: 'E쿠폰/선불카드', weight: 0.05 },
    { text: '상품권', weight: 0.05 },
    { text: '카카오페이', weight: 0.05 },
    { text: '네이버페이', weight: 0.05 },
  ],
  [MOMS_TOUCH_STATE.CARD_PAYMENT]: [
    { text: '신용카드 결제', weight: 0.4 },
    { text: '신용카드를 투입구에 끝까지 넣으시고', weight: 0.3 },
    { text: '결제가 완료될 때까지 빼지마세요', weight: 0.3 },
    { text: '신용카드를 삽입해주세요', weight: 0.35 },
  ],
}

// 상태 판별 confidence 임계값(요구사항: 신뢰도 낮으면 실패 대신 재촬영/직접선택 제공).
export const MOMS_TOUCH_STATE_CONFIDENCE_THRESHOLD = 0.5

// ─────────────────────────────────────────────────────────────────────────
// 14단계 안내 플로우 (요구사항 7장)
//
// 화면 상태(state)와 안내 단계(optionStep)를 분리했다 - 예를 들어
// MOMS_SET_OPTION_TOP 상태 하나에 CHICKEN/BURGER/SCROLL 세 안내 단계가 속한다.
// 실제 키오스크 화면이 바뀌지 않는 전환(사용자가 이미 선택한 걸 확인만 하는 경우)은
// sameCaptureNextId로 "같은 사진 유지"하고, 실제로 화면이 바뀌는 전환은 표준
// "다음 화면 촬영" 버튼(captureButtonLabel로 문구만 상황에 맞게 바꿈)을 쓴다.
// ─────────────────────────────────────────────────────────────────────────

/** @type {import('../types/kiosk').KioskFlowStep[]} */
const MOMS_TOUCH_FLOW_STEPS_RAW = [
  // STEP 1. 매장 선택
  {
    id: 'moms-1-start',
    state: MOMS_TOUCH_STATE.START,
    title: '이용 방법을 선택해주세요',
    instruction: "매장에서 드실 예정이므로 '매장'을 눌러주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.START].map((k) => k.text),
    targets: [{ x: 6, y: 78, width: 40, height: 14, label: '① 매장 선택', emphasis: 'primary' }],
  },

  // STEP 2. 세트 카테고리 선택
  {
    id: 'moms-2-menu',
    state: MOMS_TOUCH_STATE.MENU,
    title: '세트 메뉴를 찾아볼게요',
    instruction: "화면 위쪽에서 '세트'를 눌러주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.MENU].map((k) => k.text),
    targets: [{ x: 4, y: 6, width: 92, height: 8, label: '① 세트 선택', emphasis: 'primary' }],
  },

  // STEP 3. 떡강정세트 선택
  {
    id: 'moms-3-set-menu',
    state: MOMS_TOUCH_STATE.SET_MENU,
    title: '떡강정세트를 선택해주세요',
    instruction: "상품 목록에서 '떡강정세트'를 눌러주세요.",
    subInstruction: '기본 가격은 10,100원이에요.',
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.SET_MENU].map((k) => k.text),
    targets: [{ x: 6, y: 16, width: 40, height: 30, label: '② 떡강정세트 선택', emphasis: 'primary' }],
  },

  // STEP 4. 필수 치킨 확인 (state: SET_OPTION_TOP, optionStep: CHICKEN)
  {
    id: 'moms-4-option-chicken',
    state: MOMS_TOUCH_STATE.SET_OPTION_TOP,
    optionStep: MOMS_OPTION_GUIDE_STEP.CHICKEN,
    title: '치킨 옵션을 확인해주세요',
    instruction: "'필수 치킨'에서 '케이준떡강정S 1개'를 선택해주세요.",
    subInstruction: '주황색 테두리가 표시되어 있다면 이미 선택된 상태예요.',
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.SET_OPTION_TOP].map((k) => k.text),
    targets: [
      { x: 4, y: 28, width: 92, height: 8, label: '필수 치킨 영역', emphasis: 'secondary' },
      { x: 6, y: 37, width: 40, height: 14, label: '① 케이준떡강정S 1개', emphasis: 'primary' },
    ],
    // 실제 키오스크 화면은 바뀌지 않고(선택 표시만 갱신) 안내 문구만 다음으로 넘어간다.
    sameCaptureNextId: 'moms-5-option-burger',
    sameCaptureButtonLabel: '선택했어요',
  },

  // STEP 5. 필수 버거 선택 (state: SET_OPTION_TOP, optionStep: BURGER)
  {
    id: 'moms-5-option-burger',
    state: MOMS_TOUCH_STATE.SET_OPTION_TOP,
    optionStep: MOMS_OPTION_GUIDE_STEP.BURGER,
    title: '버거를 변경해주세요',
    instruction: "'필수 버거'에서 '아라비아따치즈버거'를 눌러주세요.",
    subInstruction: '아라비아따치즈버거를 선택하면 2,500원이 추가돼요.',
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.SET_OPTION_TOP].map((k) => k.text),
    targets: [
      { x: 4, y: 52, width: 92, height: 8, label: '필수 버거 영역', emphasis: 'secondary' },
      { x: 6, y: 61, width: 40, height: 14, label: '① 아라비아따치즈버거 +2,500원', emphasis: 'primary' },
    ],
    // 버거를 실제로 누르면 요청사항 팝업이 열려 화면이 바뀌므로 재촬영이 필요하다.
  },

  // STEP 6. 버거 요청사항 선택 (state: BURGER_REQUEST)
  {
    id: 'moms-6-burger-request',
    state: MOMS_TOUCH_STATE.BURGER_REQUEST,
    title: '버거 요청사항을 선택해주세요',
    instruction: "재료를 빼지 않을 예정이므로 '요청-없음'을 눌러주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.BURGER_REQUEST].map((k) => k.text),
    targets: [{ x: 8, y: 30, width: 38, height: 14, label: '요청-없음 선택', emphasis: 'primary' }],
    // 요청-없음을 누르면 팝업이 닫히므로 표준 "다음 화면 촬영"으로 재촬영을 유도한다.
  },

  // STEP 7. 음료 옵션까지 스크롤 (state: SET_OPTION_TOP, optionStep: SCROLL)
  {
    id: 'moms-7-option-scroll',
    state: MOMS_TOUCH_STATE.SET_OPTION_TOP,
    optionStep: MOMS_OPTION_GUIDE_STEP.SCROLL,
    title: '아래쪽 음료 옵션으로 이동해주세요',
    instruction: '키오스크 옵션 화면을 위로 밀어 아래쪽으로 내려주세요.',
    subInstruction: '펩시콜라, 펩시콜라제로, 사이다가 보일 때까지 내려주세요.',
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.SET_OPTION_TOP].map((k) => k.text),
    // 이 단계는 버튼 터치가 아니라 스크롤 동작이라, 특정 좌표를 짚어줄 수 없다.
    // AR 박스 대신 방향 안내(위로 스와이프)만 표시한다.
    targets: [],
    noTargetSearch: true,
    directionHint: 'up',
    // 스크롤은 실제 화면 내용이 바뀌므로("실제 키오스크 화면이 변경된 경우 반드시 재촬영") 표준
    // "다음 화면 촬영" 버튼을 상황에 맞는 문구로만 바꿔서 사용한다(재촬영 자체는 그대로 발생).
    captureButtonLabel: '음료가 보여요',
  },

  // STEP 8. 펩시콜라제로 선택 (state: SET_OPTION_BOTTOM, optionStep: DRINK)
  {
    id: 'moms-8-option-drink',
    state: MOMS_TOUCH_STATE.SET_OPTION_BOTTOM,
    optionStep: MOMS_OPTION_GUIDE_STEP.DRINK,
    title: '음료를 변경해주세요',
    instruction: "기본 펩시콜라 대신 '펩시콜라제로'를 눌러주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.SET_OPTION_BOTTOM].map((k) => k.text),
    targets: [{ x: 34, y: 14, width: 32, height: 16, label: '펩시콜라제로 선택', emphasis: 'primary' }],
    // 음료를 고르는 것도 선택 표시만 바뀌고 화면 자체는 유지되므로 같은 사진으로 다음 단계로.
    sameCaptureNextId: 'moms-9-option-extra',
    sameCaptureButtonLabel: '선택했어요',
  },

  // STEP 9. 추가 옵션 확인 (state: SET_OPTION_BOTTOM, optionStep: EXTRA)
  {
    id: 'moms-9-option-extra',
    state: MOMS_TOUCH_STATE.SET_OPTION_BOTTOM,
    optionStep: MOMS_OPTION_GUIDE_STEP.EXTRA,
    title: '추가 소스를 확인해주세요',
    instruction: "추가 소스가 필요하지 않다면 '선택없음'을 유지해주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.SET_OPTION_BOTTOM].map((k) => k.text),
    targets: [
      { x: 8, y: 36, width: 30, height: 14, label: '① 선택없음 유지', emphasis: 'primary' },
      // 지금까지 담긴 옵션(케이준떡강정S/아라비아따치즈버거/펩시콜라제로/+2,500원)을 확인할 수
      // 있도록 하단 주문상품 영역도 함께 강조한다(요구사항).
      { x: 4, y: 60, width: 92, height: 25, label: '담긴 옵션을 확인해주세요', emphasis: 'secondary' },
    ],
    sameCaptureNextId: 'moms-10-option-add-to-cart',
    sameCaptureButtonLabel: '확인했어요',
  },

  // STEP 10. 주문담기 (state: SET_OPTION_BOTTOM, optionStep: ADD_TO_CART)
  {
    id: 'moms-10-option-add-to-cart',
    state: MOMS_TOUCH_STATE.SET_OPTION_BOTTOM,
    optionStep: MOMS_OPTION_GUIDE_STEP.ADD_TO_CART,
    title: '선택한 구성을 담아주세요',
    instruction: "옵션을 확인한 뒤 오른쪽 아래의 '주문담기'를 눌러주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.SET_OPTION_BOTTOM].map((k) => k.text),
    targets: [{ x: 55, y: 85, width: 40, height: 10, label: '주문담기', emphasis: 'primary' }],
    // 주문담기를 실제로 누르면 장바구니 화면으로 넘어가므로 재촬영이 필요하다.
  },

  // STEP 11. 장바구니 확인 (state: CART)
  {
    id: 'moms-11-cart',
    state: MOMS_TOUCH_STATE.CART,
    title: '주문 내용을 확인해주세요',
    instruction: "떡강정세트 1개와 총금액 12,600원이 맞다면 '결제하기'를 눌러주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.CART].map((k) => k.text),
    targets: [
      { x: 4, y: 20, width: 45, height: 55, label: '① 주문상품 확인', emphasis: 'secondary' },
      { x: 55, y: 85, width: 40, height: 10, label: '② 결제하기', emphasis: 'primary' },
    ],
  },

  // STEP 12. 주문 내용 최종 확인 (state: ORDER_CONFIRM, optionStep: CONFIRM_ORDER)
  {
    id: 'moms-12-confirm-order',
    state: MOMS_TOUCH_STATE.ORDER_CONFIRM,
    optionStep: MOMS_OPTION_GUIDE_STEP.CONFIRM_ORDER,
    title: '주문 내용을 마지막으로 확인해주세요',
    instruction: '떡강정세트, 선택한 옵션, 매장 이용, 총 결제금액 12,600원이 맞는지 확인해주세요.',
    subInstruction: "잘못 담았다면 화면의 '옵션수정'을 누르거나, 이 화면 하단의 '다시 촬영'으로 이전 단계를 다시 진행할 수 있어요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.ORDER_CONFIRM].map((k) => k.text),
    targets: [{ x: 4, y: 15, width: 92, height: 55, label: '① 주문 내역 확인', emphasis: 'secondary' }],
    // "주문이 맞아요"를 누르면 실제 키오스크는 그대로 두고(아직 결제수단을 안 눌렀으므로)
    // 우리 안내만 다음 단계로 넘어간다. "옵션을 수정할게요"는 화면 하단에 항상 있는
    // "다시 촬영" 버튼으로 대체했다(요구사항에 정확한 버튼 동작 정의가 없어 기존
    // 공통 기능을 재사용하는 쪽으로 단순화했다 - 자세한 내용은 작업 보고 참고).
    sameCaptureNextId: 'moms-13-select-payment',
    sameCaptureButtonLabel: '주문이 맞아요',
  },

  // STEP 13. 신용카드 선택 (state: ORDER_CONFIRM, optionStep: SELECT_PAYMENT)
  {
    id: 'moms-13-select-payment',
    state: MOMS_TOUCH_STATE.ORDER_CONFIRM,
    optionStep: MOMS_OPTION_GUIDE_STEP.SELECT_PAYMENT,
    title: '결제수단을 선택해주세요',
    instruction: "신용카드나 체크카드로 결제하려면 '신용카드'를 눌러주세요.",
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.ORDER_CONFIRM].map((k) => k.text),
    targets: [{ x: 6, y: 62, width: 42, height: 12, label: '신용카드 선택', emphasis: 'primary' }],
    // 결제수단을 실제로 누르면 카드 결제 안내 화면으로 넘어가므로 재촬영이 필요하다.
  },

  // STEP 14. 카드 삽입 (state: CARD_PAYMENT)
  {
    id: 'moms-14-card-payment',
    state: MOMS_TOUCH_STATE.CARD_PAYMENT,
    title: '카드를 넣어주세요',
    instruction: '키오스크 아래쪽 카드 투입구에 카드를 끝까지 넣어주세요.',
    subInstruction: '결제가 완료될 때까지 카드를 빼지 마세요.',
    recognitionKeywords: MOMS_TOUCH_STATE_KEYWORDS[MOMS_TOUCH_STATE.CARD_PAYMENT].map((k) => k.text),
    // 카드 투입구는 화면 밖 물리적 위치라 존재하지 않는 곳에 AR 박스를 표시하지 않는다.
    targets: [],
    noTargetSearch: true,
    directionHint: 'down',
  },
]

/** @type {import('../types/kiosk').KioskFlowStep[]} */
export const MOMS_TOUCH_FLOW_STEPS = MOMS_TOUCH_FLOW_STEPS_RAW.map((step) => ({ ...step, brand: KIOSK_BRAND.MOMS_TOUCH }))

export const MOMS_TOUCH_FLOW_FIRST_STEP_ID = MOMS_TOUCH_FLOW_STEPS[0].id

/** "화면 직접 선택" 목록에 보여줄 사람이 읽기 쉬운 상태 이름. */
export const MOMS_TOUCH_STATE_LABELS = {
  [MOMS_TOUCH_STATE.START]: '이용 방법(매장/포장) 선택 화면',
  [MOMS_TOUCH_STATE.MENU]: '메뉴 화면 (카테고리/상품 목록)',
  [MOMS_TOUCH_STATE.SET_MENU]: '세트 상품 목록 화면',
  [MOMS_TOUCH_STATE.SET_OPTION_TOP]: '세트 구성(치킨/버거) 선택 화면',
  [MOMS_TOUCH_STATE.BURGER_REQUEST]: '버거 요청사항 팝업',
  [MOMS_TOUCH_STATE.SET_OPTION_BOTTOM]: '음료/추가 옵션 선택 화면',
  [MOMS_TOUCH_STATE.CART]: '장바구니 화면',
  [MOMS_TOUCH_STATE.ORDER_CONFIRM]: '주문 확인/결제수단 선택 화면',
  [MOMS_TOUCH_STATE.CARD_PAYMENT]: '카드 결제 안내 화면',
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 6 전용: "다른 버거가 잘못 선택됐는지" 검증
// ─────────────────────────────────────────────────────────────────────────

// 실제로 존재하는 다른 맘스터치 버거 이름 중, 목표 버거(아라비아따치즈버거)와 헷갈릴 수 있는
// 것들. 사용자 제공 사진에 등장한 "싸이버거"를 포함해 대표적인 몇 가지만 둔다 - 전체
// 메뉴판을 다 아우르는 사전은 아니며, 매장/시기별로 메뉴가 바뀌면 이 배열만 수정하면 된다.
const OTHER_BURGER_NAMES = ['싸이버거', '통새우쉬림프버거', '리아불고기버거', '창녀버거', '핫크리스피버거']
const TARGET_BURGER_NAME = '아라비아따치즈버거'

/**
 * STEP 6(버거 요청사항 팝업)에서 팝업 상단 상품명이 목표 버거(아라비아따치즈버거)가 맞는지
 * 확인한다. 목표 버거가 아닌 다른 버거 이름이 OCR로 확인되면 경고 문구를 반환한다.
 * @param {Array<{text: string}>} words - 촬영 이미지에서 인식된 OCR 단어 목록
 * @returns {string|null} 경고 문구(문제 없으면 null)
 */
export function checkBurgerRequestMismatch(words) {
  if (!words?.length) return null

  const normalizedTexts = words.map((w) => normalizeText(w.text))
  const hasTargetBurger = normalizedTexts.some((t) => t.includes(normalizeText(TARGET_BURGER_NAME)))
  if (hasTargetBurger) return null // 목표 버거가 보이면 문제 없음

  const detectedOther = OTHER_BURGER_NAMES.find((name) => normalizedTexts.some((t) => t.includes(normalizeText(name))))
  if (!detectedOther) return null // 다른 버거 이름도 안 보이면(=애매하면) 경고하지 않는다

  return `다른 버거가 선택된 것 같아요. 이전 화면으로 돌아가 '${TARGET_BURGER_NAME}'를 선택해주세요.`
}

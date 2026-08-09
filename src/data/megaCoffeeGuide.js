/**
 * 메가커피 키오스크 인식/안내에 사용하는 데이터 정의.
 * 안내 문구나 인식 키워드를 바꿀 때는 이 파일만 수정하면 된다.
 */

// 키오스크 주문 진행 단계
export const ORDER_STATE = {
  START: 'START',
  CATEGORY: 'CATEGORY',
  MENU: 'MENU',
  OPTION: 'OPTION',
  CART: 'CART',
  ORDER_CONFIRM: 'ORDER_CONFIRM',
  TAKEOUT: 'TAKEOUT',
  DISPOSABLE: 'DISPOSABLE',
  DISCOUNT: 'DISCOUNT',
  PAYMENT: 'PAYMENT',
  STAMP: 'STAMP',
  CJONE: 'CJONE',
  CARD_PAYMENT: 'CARD_PAYMENT',
  COMPLETE: 'COMPLETE',
}

// 메가커피 브랜드 판별용 키워드 및 가중치.
// 여러 키워드가 함께 발견될수록 confidence가 올라가는 방식(단일 단어 판단 금지 요건).
export const MEGA_COFFEE_BRAND_KEYWORDS = [
  { text: 'MEGA', weight: 0.3 },
  { text: '메가엠지씨커피', weight: 0.45 },
  { text: '메가MGC커피', weight: 0.45 },
  { text: '메가커피', weight: 0.4 },
  { text: '커피', weight: 0.08 },
  { text: '음료', weight: 0.08 },
  { text: '티', weight: 0.04 },
  { text: '디저트', weight: 0.06 },
  { text: '주문하기', weight: 0.15 },
  { text: '결제하기', weight: 0.12 },
  { text: '먹고가기', weight: 0.12 },
  { text: '포장하기', weight: 0.12 },
]

// 이 값 이상일 때만 "메가커피 키오스크"로 확정한다.
export const BRAND_CONFIDENCE_THRESHOLD = 0.5

// targetTexts와 OCR 단어의 유사도가 이 값 이상일 때만 실제로 찾았다고 판단한다.
export const TARGET_MATCH_THRESHOLD = 0.6

// 상태 자동 판별 시, 화면 특징 단어가 이 비율 이상 일치해야 상태를 전환한다.
export const STATE_DETECT_THRESHOLD = 0.5

/**
 * 주문 단계별 안내 데이터.
 * - state: 현재 화면이 속한 단계 (ORDER_STATE)
 * - targetTexts: 사용자가 실제로 눌러야 하는 버튼의 후보 텍스트들. 비어 있으면 특정 버튼을
 *   강조하지 않고 안내 문구만 보여준다(예: 메뉴 화면처럼 대상이 사용자마다 다른 경우).
 * - stateSignals: 카메라에 이 텍스트들이 보이면 해당 단계에 도달했다고 자동 판단하는 데 쓰는 단서.
 */
export const KIOSK_GUIDE_STEPS = [
  {
    id: 'start-order',
    state: ORDER_STATE.START,
    targetTexts: ['주문하기', 'ORDER', '시작하기'],
    title: '주문 시작 버튼을 눌러주세요',
    description: '화면에 보이는 주문하기 버튼을 눌러주세요.',
    stateSignals: ['주문하기', '시작하기'],
  },
  {
    id: 'category-coffee',
    state: ORDER_STATE.CATEGORY,
    targetTexts: ['커피', 'COFFEE'],
    title: '커피를 선택해주세요',
    description: '화면 위쪽 노란색 부분에 있는 커피를 눌러주세요.',
    stateSignals: ['커피', '음료', '티', '디저트'],
  },
  {
    id: 'menu-select',
    state: ORDER_STATE.MENU,
    targetTexts: [],
    title: '원하는 메뉴를 선택해주세요',
    description: '주문하려는 메뉴의 사진을 눌러주세요.',
    stateSignals: ['담기', '장바구니', '수량'],
  },
  {
    id: 'option-select',
    state: ORDER_STATE.OPTION,
    targetTexts: ['담기', '선택완료'],
    title: '옵션을 선택한 뒤 담기를 눌러주세요',
    description: '온도, 사이즈 등을 고른 뒤 담기 버튼을 눌러주세요.',
    stateSignals: ['ICE', 'HOT', '온도', '사이즈'],
  },
  {
    id: 'cart-payment',
    state: ORDER_STATE.CART,
    targetTexts: ['결제하기', '결제'],
    title: '결제하기를 눌러주세요',
    description: '화면 아래쪽의 결제하기 버튼을 눌러주세요.',
    stateSignals: ['장바구니', '결제하기', '총'],
  },
  {
    id: 'order-confirm',
    state: ORDER_STATE.ORDER_CONFIRM,
    targetTexts: ['확인', '주문확인'],
    title: '주문 내역을 확인해주세요',
    description: '주문 내역이 맞으면 확인 버튼을 눌러주세요.',
    stateSignals: ['주문내역', '확인'],
  },
  {
    id: 'takeout',
    state: ORDER_STATE.TAKEOUT,
    targetTexts: ['먹고가기', '포장하기'],
    title: '먹고가기 또는 포장하기를 선택해주세요',
    description: '매장에서 드실 건지, 포장하실 건지 눌러주세요.',
    stateSignals: ['먹고가기', '포장하기'],
  },
  {
    id: 'disposable',
    state: ORDER_STATE.DISPOSABLE,
    targetTexts: ['일회용', '사용'],
    title: '일회용품 사용 여부를 선택해주세요',
    description: '일회용 컵 사용 여부를 눌러주세요.',
    stateSignals: ['일회용', '다회용'],
  },
  {
    id: 'discount',
    state: ORDER_STATE.DISCOUNT,
    targetTexts: ['할인', '쿠폰', '다음'],
    title: '할인/쿠폰을 적용해주세요',
    description: '적용할 할인이 없으면 다음을 눌러주세요.',
    stateSignals: ['할인', '쿠폰'],
  },
  {
    id: 'payment-method',
    state: ORDER_STATE.PAYMENT,
    targetTexts: ['카드결제', '카드'],
    title: '카드로 결제해주세요',
    description: '화면에서 카드결제 버튼을 눌러주세요.',
    stateSignals: ['카드결제', '결제수단', '간편결제'],
  },
  {
    id: 'stamp',
    state: ORDER_STATE.STAMP,
    targetTexts: ['적립', '스탬프'],
    title: '적립 여부를 선택해주세요',
    description: '적립하지 않으시면 건너뛰기를 눌러주세요.',
    stateSignals: ['적립', '스탬프'],
  },
  {
    id: 'cj-one',
    state: ORDER_STATE.CJONE,
    targetTexts: ['CJ ONE', '적립안함'],
    title: 'CJ ONE 적립을 선택해주세요',
    description: '회원 적립이 없으면 적립 안함을 눌러주세요.',
    stateSignals: ['CJONE', 'CJ ONE'],
  },
  {
    id: 'card-payment',
    state: ORDER_STATE.CARD_PAYMENT,
    targetTexts: ['카드를 넣어주세요', '카드투입'],
    title: '카드를 넣어주세요',
    description: '카드 투입구에 카드를 넣어주세요.',
    stateSignals: ['카드를 넣어주세요', '카드투입'],
  },
  {
    id: 'complete',
    state: ORDER_STATE.COMPLETE,
    targetTexts: [],
    title: '주문이 완료되었어요',
    description: '영수증을 확인하고 잠시만 기다려주세요.',
    stateSignals: ['주문번호', '결제완료'],
  },
]

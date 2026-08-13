/**
 * 맘스터치 키오스크 인식/안내에 사용하는 데이터 정의.
 * megaCoffeeGuide.js와 동일한 구조를 사용하되 브랜드별로 파일을 분리해
 * 서로 다른 키오스크 UI 문구가 바뀌어도 독립적으로 관리할 수 있게 한다.
 * (megaCoffeeGuide.js는 건드리지 않는다.)
 */

// 맘스터치 주문 진행 단계. 메가커피의 ORDER_STATE 값과 절대 겹치지 않도록 접두어를 붙인다.
export const MOMS_ORDER_STATE = {
  START: 'MOMS_START',
  DINE_TYPE: 'MOMS_DINE_TYPE',
  CATEGORY: 'MOMS_CATEGORY',
  PRODUCT: 'MOMS_PRODUCT',
  SIMPLE_OPTION: 'MOMS_SIMPLE_OPTION',
  SET_CONFIGURATION: 'MOMS_SET_CONFIGURATION',
  SET_OPTION: 'MOMS_SET_OPTION',
  CART: 'MOMS_CART',
  ORDER_CONFIRM: 'MOMS_ORDER_CONFIRM',
  PAYMENT_METHOD: 'MOMS_PAYMENT_METHOD',
  CARD_PAYMENT: 'MOMS_CARD_PAYMENT',
  COMPLETE: 'MOMS_COMPLETE',
}

// 맘스터치 브랜드 판별용 키워드 및 가중치. "MOM'S TOUCH"/"맘스터치"에 특히 높은 가중치를 준다.
// 메가커피와 겹치는 일반 단어("음료", "결제하기" 등)는 낮은 가중치만 부여해
// 단어 하나만으로 브랜드가 뒤바뀌지 않도록 한다.
export const MOMS_TOUCH_BRAND_KEYWORDS = [
  { text: "MOM'S TOUCH", weight: 0.5 },
  { text: 'MOMSTOUCH', weight: 0.5 },
  { text: '맘스터치', weight: 0.45 },
  { text: '인기메뉴', weight: 0.08 },
  { text: '순살치킨', weight: 0.1 },
  { text: '뼈치킨', weight: 0.1 },
  { text: '버거', weight: 0.05 },
  { text: '음료', weight: 0.03 },
  { text: '세트', weight: 0.03 },
  { text: '사이드', weight: 0.06 },
  { text: '주문담기', weight: 0.14 },
  { text: '결제하기', weight: 0.03 },
  { text: '신용카드', weight: 0.03 },
  { text: 'E쿠폰', weight: 0.08 },
  { text: '선불카드', weight: 0.06 },
  { text: '카카오페이', weight: 0.02 },
  { text: '네이버페이', weight: 0.02 },
]

export const MOMS_TOUCH_BRAND_CONFIDENCE_THRESHOLD = 0.5

// 상태/하위 단계(phase) 자동판별 시, 특징 단어가 이 비율 이상 일치해야 확정한다.
export const MOMS_STATE_DETECT_THRESHOLD = 0.5

// "빼고 싶은 재료" 옵션 선택지. 단일 상품(MOMS_SIMPLE_OPTION)과 세트 버거 옵션
// (MOMS_SET_OPTION의 BURGER phase)이 동일한 UI를 사용하므로 한 곳에서만 정의해 재사용한다.
const MOMS_BURGER_OPTION_CHOICES = [
  {
    value: 'none',
    label: '그대로 주문할게요',
    targetTexts: ['요청-없음', '요청 없음'],
    title: '요청-없음을 눌러주세요',
    description: '빼고 싶은 재료가 없으시면 요청-없음 버튼을 눌러주세요.',
  },
  {
    value: 'no-onion',
    label: '양파 빼주세요',
    targetTexts: ['요청-양파제외', '양파제외'],
    title: '양파제외를 눌러주세요',
    description: '양파를 빼시려면 양파제외 버튼을 눌러주세요.',
  },
  {
    value: 'no-pickle',
    label: '피클 빼주세요',
    targetTexts: ['요청-피클제외', '피클제외'],
    title: '피클제외를 눌러주세요',
    description: '피클을 빼시려면 피클제외 버튼을 눌러주세요.',
  },
  {
    value: 'no-both',
    label: '피클, 양파 다 빼주세요',
    targetTexts: ['요청-피클,양파제외', '피클양파제외'],
    title: '피클,양파제외를 눌러주세요',
    description: '피클과 양파를 모두 빼시려면 피클,양파제외 버튼을 눌러주세요.',
  },
]

/**
 * 맘스터치 주문 단계별 안내 데이터.
 *
 * - targetTexts: 사용자 선택 없이 바로 찾아야 하는 고정 대상(없으면 안내만 하고 AR 박스는 띄우지 않음)
 * - selection: 사용자가 여러 후보 중 하나를 직접 골라야 하는 경우(매장/포장, 메뉴 종류, 옵션,
 *   결제수단 등). type이 'fixed'면 미리 정의한 options 중에서, 'dynamic'이면 화면에서 실시간으로
 *   인식된 텍스트 중에서 고르게 한다(상품명/음료명처럼 매장/시기에 따라 바뀌는 항목).
 * - MOMS_SET_CONFIGURATION, MOMS_SET_OPTION은 하나의 상태 안에 여러 하위 단계(phase)를 가지므로
 *   이 배열의 항목은 "이 상태에 진입했는지" 판별에만 쓰이고, 실제 안내 문구/타깃은
 *   MOMS_SET_CONFIG_PHASES / MOMS_SET_OPTION_PHASES에서 가져온다.
 */
export const MOMS_TOUCH_GUIDE_STEPS = [
  {
    id: 'moms-start',
    state: MOMS_ORDER_STATE.START,
    stateSignals: ["MOM'S TOUCH", '맘스터치'],
    title: '맘스터치 키오스크를 비춰주세요',
    description: '키오스크 화면 전체가 잘 보이도록 카메라를 움직여주세요.',
    targetTexts: [],
  },
  {
    id: 'moms-dine-type',
    state: MOMS_ORDER_STATE.DINE_TYPE,
    stateSignals: ['매장', '포장', '카드전용', '주문기'],
    title: '이용 방법을 선택해주세요',
    description: '매장에서 드실지, 포장하실지 알려주세요.',
    selection: {
      type: 'fixed',
      options: [
        {
          value: 'dine-in',
          label: '매장에서 먹을게요',
          targetTexts: ['매장'],
          title: '매장 버튼을 눌러주세요',
          description: '매장에서 드시려면 화면 아래쪽 왼쪽에 있는 매장 버튼을 눌러주세요.',
        },
        {
          value: 'takeout',
          label: '포장할게요',
          targetTexts: ['포장'],
          title: '포장 버튼을 눌러주세요',
          description: '가지고 가시려면 화면 아래쪽 오른쪽에 있는 포장 버튼을 눌러주세요.',
        },
      ],
    },
  },
  {
    id: 'moms-category',
    state: MOMS_ORDER_STATE.CATEGORY,
    stateSignals: ['인기메뉴', '버거', '순살치킨', '뼈치킨', '음료', '세트', '사이드', '결제하기'],
    title: '메뉴 종류를 선택해주세요',
    description: '원하시는 메뉴 종류를 골라주세요.',
    selection: {
      type: 'fixed',
      options: [
        {
          value: 'burger',
          label: '버거',
          targetTexts: ['버거'],
          title: '버거를 선택해주세요',
          description: '화면 위쪽 주황색 부분에 있는 버거를 눌러주세요.',
        },
        {
          value: 'boneless-chicken',
          label: '순살치킨',
          targetTexts: ['순살치킨'],
          title: '순살치킨을 선택해주세요',
          description: '화면 위쪽 주황색 부분에 있는 순살치킨을 눌러주세요.',
        },
        {
          value: 'bone-chicken',
          label: '뼈치킨',
          targetTexts: ['뼈치킨'],
          title: '뼈치킨을 선택해주세요',
          description: '화면 위쪽 주황색 부분에 있는 뼈치킨을 눌러주세요.',
        },
        {
          value: 'set',
          label: '세트',
          targetTexts: ['세트'],
          title: '세트 메뉴를 선택해주세요',
          description: '화면 위쪽 주황색 부분에 있는 세트를 눌러주세요.',
        },
        {
          value: 'drink',
          label: '음료',
          targetTexts: ['음료'],
          title: '음료를 선택해주세요',
          description: '화면 위쪽 주황색 부분에 있는 음료를 눌러주세요.',
        },
        {
          value: 'side',
          label: '사이드',
          targetTexts: ['사이드'],
          title: '사이드를 선택해주세요',
          description: '화면 위쪽 주황색 부분에 있는 사이드를 눌러주세요.',
        },
      ],
    },
  },
  {
    id: 'moms-product',
    state: MOMS_ORDER_STATE.PRODUCT,
    stateSignals: ['원'],
    title: '원하시는 메뉴를 선택해주세요',
    description: '키오스크 화면에서 주문하실 메뉴의 사진이나 이름을 눌러주세요.',
    selection: {
      type: 'dynamic',
      dynamicHint: '화면에서 인식된 메뉴 이름 중 원하시는 것을 골라주세요.',
    },
  },
  {
    id: 'moms-simple-option',
    state: MOMS_ORDER_STATE.SIMPLE_OPTION,
    stateSignals: ['옵션추가', '요청-없음', '요청없음'],
    title: '원하시는 옵션을 선택해주세요',
    description: '빼고 싶은 재료가 있으신지 알려주세요.',
    selection: { type: 'fixed', options: MOMS_BURGER_OPTION_CHOICES },
  },
  {
    id: 'moms-set-configuration',
    state: MOMS_ORDER_STATE.SET_CONFIGURATION,
    stateSignals: ['필수', '치킨', '버거'],
    title: '세트 구성을 선택해주세요',
    description: '필수 항목부터 순서대로 골라주세요.',
    // 실제 안내 문구/타깃은 진행 정도(phase)에 따라 MOMS_SET_CONFIG_PHASES에서 가져온다.
  },
  {
    id: 'moms-set-option',
    state: MOMS_ORDER_STATE.SET_OPTION,
    stateSignals: ['옵션추가'],
    title: '옵션을 선택해주세요',
    description: '화면에 나오는 옵션을 순서대로 선택해주세요.',
    // 실제 안내 문구/타깃은 진행 정도(phase)에 따라 MOMS_SET_OPTION_PHASES에서 가져온다.
  },
  {
    id: 'moms-cart',
    state: MOMS_ORDER_STATE.CART,
    stateSignals: ['총수량', '총금액', '결제하기'],
    title: '메뉴를 더 주문하시겠어요?',
    description: '더 담으실 메뉴가 있는지 알려주세요.',
    selection: {
      type: 'fixed',
      options: [
        {
          value: 'more',
          label: '네, 더 담을게요',
          gotoState: MOMS_ORDER_STATE.CATEGORY,
          title: '메뉴 종류를 다시 선택해주세요',
          description: '화면 위쪽 주황색 부분에서 추가할 메뉴 종류를 눌러주세요.',
        },
        {
          value: 'done',
          label: '아니요, 결제할게요',
          targetTexts: ['결제하기', '결제 하기'],
          title: '결제하기를 눌러주세요',
          description: '주문을 모두 고르셨다면 화면 오른쪽 아래의 노란색 결제하기 버튼을 눌러주세요.',
        },
      ],
    },
  },
  {
    id: 'moms-order-confirm',
    state: MOMS_ORDER_STATE.ORDER_CONFIRM,
    stateSignals: ['주문하실내용이맞나요', '총결제금액'],
    title: '주문 내용을 확인해주세요',
    description: '주문하신 메뉴와 수량, 금액이 맞는지 확인해주세요. 매장에서 드시는지 포장하시는지도 다시 확인해주세요.',
    targetTexts: [],
  },
  {
    id: 'moms-payment-method',
    state: MOMS_ORDER_STATE.PAYMENT_METHOD,
    stateSignals: ['신용카드', '카카오페이', '네이버페이', '상품권', 'PAYCO'],
    title: '결제 방법을 선택해주세요',
    description: '어떤 방법으로 결제하실지 알려주세요.',
    selection: {
      type: 'fixed',
      options: [
        {
          value: 'card',
          label: '신용카드',
          targetTexts: ['신용카드'],
          title: '신용카드를 눌러주세요',
          description: '카드로 결제하시려면 화면 아래쪽 왼쪽에 있는 신용카드를 눌러주세요.',
        },
        {
          value: 'kakaopay',
          label: '카카오페이',
          targetTexts: ['카카오페이'],
          title: '카카오페이를 눌러주세요',
          description: '카카오페이로 결제하시려면 카카오페이 버튼을 눌러주세요.',
        },
        {
          value: 'naverpay',
          label: '네이버페이',
          targetTexts: ['네이버페이'],
          title: '네이버페이를 눌러주세요',
          description: '네이버페이로 결제하시려면 네이버페이 버튼을 눌러주세요.',
        },
        {
          value: 'ecoupon',
          label: 'E쿠폰/선불카드',
          targetTexts: ['E쿠폰/선불카드', 'E쿠폰', '선불카드'],
          title: 'E쿠폰/선불카드를 눌러주세요',
          description: 'E쿠폰이나 선불카드를 사용하시려면 E쿠폰/선불카드 버튼을 눌러주세요.',
        },
      ],
    },
  },
  {
    id: 'moms-card-payment',
    state: MOMS_ORDER_STATE.CARD_PAYMENT,
    stateSignals: ['신용카드결제', '신용카드를삽입해주세요', '카드를삽입'],
    title: '카드를 넣어주세요',
    description: '키오스크 아래쪽 카드 투입구에 신용카드나 체크카드를 끝까지 꽂아주세요. 결제가 끝날 때까지 카드를 빼지 마세요.',
    targetTexts: [],
    // 카드 투입구는 화면 밖 물리적 위치라 OCR로 특정 버튼을 찾지 않는다(아래쪽을 가리키는 안내만 표시).
    noTargetSearch: true,
    directionHint: 'down',
  },
  {
    id: 'moms-complete',
    state: MOMS_ORDER_STATE.COMPLETE,
    // 참고 사진에 결제 완료 화면이 없어 임의로 추측하지 않는다. 추후 실제 화면을 확인하면
    // stateSignals/문구만 다듬으면 되도록 구조만 먼저 만들어둔다.
    stateSignals: ['결제가완료되었습니다', '주문번호', '영수증'],
    title: '주문이 완료되었어요',
    description: '영수증을 확인하고 잠시만 기다려주세요.',
    targetTexts: [],
  },
]

// 세트 구성(필수 치킨 -> 필수 버거) 순서 안내. 상품명이 매장마다 바뀔 수 있어
// 특정 상품명이 아니라 "치킨"/"버거"라는 영역 이름 자체를 타깃으로 삼는다.
export const MOMS_SET_CONFIG_PHASE = {
  CHICKEN: 'SET_CONFIG_CHICKEN',
  BURGER: 'SET_CONFIG_BURGER',
}

export const MOMS_SET_CONFIG_PHASES = [
  {
    phase: MOMS_SET_CONFIG_PHASE.CHICKEN,
    signals: ['필수', '치킨'],
    targetTexts: ['치킨'],
    title: '치킨을 선택해주세요',
    description: '필수라고 표시된 치킨 중에서 원하시는 치킨을 눌러주세요.',
  },
  {
    phase: MOMS_SET_CONFIG_PHASE.BURGER,
    signals: ['필수', '버거'],
    targetTexts: ['버거'],
    title: '버거를 선택해주세요',
    description: '아래쪽의 버거 중에서 원하시는 버거를 눌러주세요.',
  },
]

/**
 * 세트 옵션 화면(버거 옵션 -> 스크롤 안내 -> 음료 -> 추가 -> 주문담기)은
 * 실제로는 하나의 긴 스크롤 화면이므로 상태(state)는 MOMS_SET_OPTION 하나로 유지하고
 * 내부 진행 단계(phase)만 아래 순서대로 전환한다.
 *
 * SCROLL 단계는 OCR로 감지하는 것이 아니라, 사용자가 버거 옵션을 고른 직후
 * 우리 서비스가 스스로 보여주는 안내라서 signals가 비어 있다(자동 상태판별 대상이 아님).
 */
export const MOMS_SET_OPTION_PHASE = {
  BURGER: 'SET_OPTION_BURGER',
  SCROLL: 'SET_OPTION_SCROLL',
  DRINK: 'SET_OPTION_DRINK',
  EXTRA: 'SET_OPTION_EXTRA',
  COMPLETE: 'SET_OPTION_COMPLETE',
}

export const MOMS_SET_OPTION_PHASES = [
  {
    phase: MOMS_SET_OPTION_PHASE.BURGER,
    signals: ['옵션추가', '요청-없음', '요청없음'],
    title: '버거 옵션을 선택해주세요',
    description: '빼고 싶은 재료가 없으시면 요청-없음 버튼을 눌러주세요.',
    selection: { type: 'fixed', options: MOMS_BURGER_OPTION_CHOICES },
  },
  {
    phase: MOMS_SET_OPTION_PHASE.SCROLL,
    // OCR로 자동 판별하지 않음(버거 옵션 선택 직후 우리 서비스가 자체적으로 보여주는 안내).
    signals: [],
    title: '아래에 선택할 항목이 더 있어요',
    description: '화면을 손가락으로 위로 천천히 밀어주세요. 아래쪽에서 음료와 추가 메뉴를 선택할 수 있습니다.',
    speech: '아래에 선택할 수 있는 항목이 더 있습니다. 화면을 손가락으로 위로 천천히 밀어주세요.',
    isScrollHint: true,
    targetTexts: [],
  },
  {
    phase: MOMS_SET_OPTION_PHASE.DRINK,
    signals: ['펩시콜라', '펩시콜라제로', '사이다'],
    title: '음료를 선택해주세요',
    description: '원하시는 음료의 사진이나 이름을 눌러주세요.',
    selection: { type: 'dynamic' },
  },
  {
    phase: MOMS_SET_OPTION_PHASE.EXTRA,
    signals: ['추가', '선택없음', '맘스양념소스', '랜치소스', '매콤치즈마요소스'],
    title: '추가할 메뉴가 있는지 선택해주세요',
    description: '소스 등을 추가하시려면 원하는 항목을 눌러주세요. 추가하지 않으시려면 선택없음을 눌러주세요.',
    selection: {
      type: 'fixed',
      allowDynamic: true,
      options: [
        {
          value: 'none',
          label: '추가 안 할게요',
          targetTexts: ['선택없음', '선택 없음'],
          title: '선택없음을 눌러주세요',
          description: '추가하실 것이 없으시면 선택없음을 눌러주세요.',
        },
      ],
    },
  },
  {
    phase: MOMS_SET_OPTION_PHASE.COMPLETE,
    signals: ['주문담기'],
    title: '주문담기를 눌러주세요',
    description: '선택을 모두 마치셨으면 화면 오른쪽 아래의 노란색 주문담기 버튼을 눌러주세요.',
    targetTexts: ['주문담기', '주문 담기'],
  },
]

// 스크롤 후 아래쪽 내용이 실제로 나타났는지 판단할 때 참고하는 특징 단어 모음(문서/디버그용).
export const MOMS_SET_OPTION_SCROLL_REVEAL_SIGNALS = [
  '펩시콜라',
  '펩시콜라제로',
  '사이다',
  '추가',
  '선택없음',
  '맘스양념소스',
  '랜치소스',
  '매콤치즈마요소스',
  '주문담기',
]

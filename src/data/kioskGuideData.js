import { calculateTotalPrice } from '../store/kioskOrderStore.js'

export const GUIDE_TOTAL_STEPS = 14

const GUIDES = {
  start: {
    screen: 14,
    targetId: 'simulation-start',
    label: '시작 준비',
    title: '키오스크 주문 연습',
    message: '떡강정세트 주문 연습을 시작하려면 ‘시뮬레이션 시작’을 눌러주세요.',
  },
  step1: {
    screen: 1,
    targetId: 'start-dine-in',
    step: 1,
    title: '주문 방법 선택',
    message: '매장에서 드실 예정이므로 ‘매장’을 눌러주세요.',
  },
  step2: {
    screen: 2,
    targetId: 'category-set',
    step: 2,
    title: '세트 메뉴 찾기',
    message: '화면 위쪽에서 ‘세트’를 눌러주세요.',
  },
  step3: {
    screen: 3,
    targetId: 'product-tteokgangjeong-set',
    step: 3,
    title: '떡강정세트 선택',
    message: '세트 메뉴 중에서 ‘떡강정세트’를 눌러주세요.',
    detail: '기본 가격은 10,100원이에요.',
  },
  defaultRequest: {
    screen: 4,
    targetId: 'request-none',
    step: 3,
    title: '버거 요청사항 선택',
    message: (order) => `${order.selectedBurger || '버거'}의 재료를 빼지 않으려면 ‘요청-없음’을 눌러주세요.`,
  },
  step4: {
    screen: 5,
    targetId: 'option-cajun-tteokgangjeong',
    step: 4,
    title: '필수 치킨 확인',
    message: '‘필수 치킨’에서 ‘케이준떡강정S 1개’를 선택해주세요.',
    detail: '기본으로 보이더라도 카드를 한 번 눌러주세요.',
  },
  step5: {
    screen: 5,
    targetId: 'option-arrabbiata-burger',
    step: 5,
    title: '필수 버거 변경',
    message: '아래의 ‘필수 버거’에서 ‘아라비아따치즈버거’를 눌러주세요.',
    detail: '화면에 상품이 전부 보이지 않으면 옵션 영역을 조금 내려주세요.',
  },
  step6: {
    screen: 6,
    targetId: 'request-none',
    step: 6,
    title: '버거 요청사항 확인',
    message: '재료를 빼지 않을 예정이므로 ‘요청-없음’을 눌러주세요.',
  },
  step7: {
    screen: 5,
    targetId: 'option-scroll-area',
    step: 7,
    title: '음료 옵션으로 이동',
    message: '음료를 변경하려면 화면을 위로 밀어 아래쪽으로 내려주세요.',
    detail: '음료 선택 항목이 보일 때까지 스크롤해주세요.',
  },
  step8: {
    screen: 7,
    targetId: 'option-pepsi-zero',
    step: 8,
    title: '음료 변경',
    message: '기본 펩시콜라 대신 ‘펩시콜라제로’를 눌러주세요.',
  },
  step9: {
    screen: 7,
    targetId: 'option-extra-none',
    step: 9,
    title: '추가 소스 확인',
    message: '추가 소스가 필요하지 않다면 ‘선택없음’을 유지해주세요.',
    detail: '치킨, 버거, 음료와 옵션 추가금액 2,500원을 함께 확인해주세요.',
    confirmLabel: '선택 확인',
  },
  step10: {
    screen: 7,
    targetId: 'add-to-cart',
    step: 10,
    title: '주문상품 담기',
    message: '선택한 옵션을 확인한 뒤 ‘주문담기’를 눌러주세요.',
  },
  step11: {
    screen: 8,
    targetId: 'checkout',
    step: 11,
    title: '장바구니 확인',
    message: '떡강정세트 1개와 총금액 12,600원이 맞는지 확인해주세요. 맞다면 ‘결제하기’를 눌러주세요.',
  },
  step12: {
    screen: 9,
    targetId: 'order-summary',
    step: 12,
    title: '주문 내용 확인',
    message: '주문 내용과 이용 방법이 맞는지 확인해주세요.',
    detail: '떡강정세트, 선택 옵션, 매장 이용, 총 결제금액 12,600원을 확인해주세요.',
    confirmLabel: '확인했어요',
  },
  step13: {
    screen: 9,
    targetId: 'payment-credit-card',
    step: 13,
    title: '결제수단 선택',
    message: '신용카드나 체크카드로 결제하려면 ‘신용카드’를 눌러주세요.',
  },
  step14: {
    screen: 10,
    targetId: 'card-insert-guide',
    placement: 'top',
    step: 14,
    title: '신용카드 결제',
    message: '키오스크 아래쪽 카드 투입구에 카드를 끝까지 넣어주세요.',
    detail: '결제가 완료될 때까지 카드를 빼지 마세요.',
  },
  receipt: {
    screen: 11,
    targetId: 'receipt-choice',
    label: '결제 완료',
    title: '영수증 확인',
    message: '결제가 완료되었습니다. 카드를 빼고 영수증을 확인해주세요.',
    detail: '영수증 출력 여부를 선택해주세요.',
  },
  complete: {
    screen: 15,
    targetId: null,
    label: '연습 완료',
    title: '시뮬레이션 완료',
    message: '떡강정세트 주문 연습을 성공적으로 완료했습니다.',
  },
}

export function getGuide(guideId, order) {
  const guide = GUIDES[guideId] ?? GUIDES.start
  return {
    ...guide,
    id: guideId,
    message: typeof guide.message === 'function' ? guide.message(order) : guide.message,
  }
}

export function recoverGuideId(order, currentGuideId) {
  if (GUIDES[currentGuideId]?.screen === order.screen) return currentGuideId

  switch (order.screen) {
    case 1: return 'step1'
    case 2: return 'step2'
    case 3: return 'step3'
    case 4: return 'defaultRequest'
    case 5: return order.selectedBurger === '아라비아따치즈버거' && order.burgerRequest
      ? 'step7'
      : 'step4'
    case 6: return order.selectedBurger === '아라비아따치즈버거' && order.burgerRequest
      ? 'step7'
      : 'step6'
    case 7: return order.selectedDrink === '펩시콜라제로' ? 'step9' : 'step8'
    case 8: return 'step11'
    case 9: return 'step12'
    case 10: return 'step14'
    case 11: return 'receipt'
    case 15: return 'complete'
    default: return 'start'
  }
}

export function hasTargetOrder(order) {
  return order.orderType === 'dineIn' &&
    order.product === '떡강정세트' &&
    order.quantity === 1 &&
    order.selectedChicken === '케이준떡강정S' &&
    order.selectedBurger === '아라비아따치즈버거' &&
    order.burgerRequest === '요청-없음' &&
    order.selectedDrink === '펩시콜라제로' &&
    order.selectedSauce === '선택없음' &&
    calculateTotalPrice(order) === 12600
}

export function canConfirmGuide(guideId, order) {
  if (guideId === 'step9') return hasTargetOrder(order)
  if (guideId === 'step12') return order.isInCart && hasTargetOrder(order)
  return false
}

export function nextGuideAfterAction(guideId, action, value, order) {
  if (action === 'BACK') {
    return {
      step3: 'step2',
      defaultRequest: 'step3',
      step4: 'defaultRequest',
      step5: 'defaultRequest',
      step6: 'step5',
      step12: 'step11',
      step13: 'step11',
    }[guideId] ?? guideId
  }
  if (action === 'CANCEL_PAYMENT' && guideId === 'step14') return 'step13'
  if (action === 'SCROLL_TO_BURGER_OPTIONS' && ['step8', 'step9', 'step10'].includes(guideId)) return 'step5'
  if (action === 'START_SIMULATION') return 'step1'
  if (guideId === 'step1' && action === 'SELECT_DINE_IN') return 'step2'
  if (guideId === 'step2' && action === 'OPEN_SET_CATEGORY') return 'step3'
  if (guideId === 'step3' && action === 'SELECT_TTEOKGANGJEONG_SET') return 'defaultRequest'
  if (guideId === 'defaultRequest' && action === 'SELECT_DEFAULT_BURGER_REQUEST' && value === '요청-없음') return 'step4'
  if (guideId === 'step4' && action === 'SELECT_CHICKEN' && value === '케이준떡강정S') return 'step5'
  if (guideId === 'step5' && action === 'SELECT_ARABIATTA_BURGER') return 'step6'
  if (guideId === 'step6' && action === 'SELECT_ARABIATTA_REQUEST' && value === '요청-없음') return 'step7'
  if (guideId === 'step7' && action === 'SCROLL_TO_DRINK_OPTIONS') return 'step8'
  if (guideId === 'step8' && action === 'SELECT_DRINK' && value === '펩시콜라제로') return 'step9'
  if (guideId === 'step9' && action === 'SELECT_SAUCE' && value === '선택없음' && hasTargetOrder(order)) return 'step10'
  if (guideId === 'step10' && action === 'ADD_TO_CART' && hasTargetOrder(order)) return 'step11'
  if (guideId === 'step11' && action === 'OPEN_CHECKOUT' && order.isInCart && hasTargetOrder(order)) return 'step12'
  if (guideId === 'step13' && action === 'SELECT_CREDIT_CARD') return 'step14'
  if (guideId === 'step14' && action === 'COMPLETE_CARD_PAYMENT' && order.isInCart) return 'receipt'
  if (guideId === 'receipt' && action === 'SELECT_RECEIPT_OPTION') return 'complete'
  return guideId
}

export function nextGuideAfterConfirm(guideId, order) {
  if (!canConfirmGuide(guideId, order)) return guideId
  if (guideId === 'step9') return 'step10'
  if (guideId === 'step12') return 'step13'
  return guideId
}

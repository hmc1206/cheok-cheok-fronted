import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyKioskEvent,
  calculateTotalPrice,
  initialKioskOrder,
} from './kioskOrderStore.js'
import {
  hasTargetOrder,
  nextGuideAfterAction,
  nextGuideAfterConfirm,
  recoverGuideId,
} from '../data/kioskGuideData.js'

const targetEvents = [
  { type: 'START_SIMULATION' },
  { type: 'SELECT_DINE_IN' },
  { type: 'OPEN_SET_CATEGORY' },
  { type: 'SELECT_TTEOKGANGJEONG_SET' },
  { type: 'SELECT_DEFAULT_BURGER_REQUEST', value: '요청-없음' },
  { type: 'SELECT_CHICKEN', value: '케이준떡강정S' },
  { type: 'SELECT_ARABIATTA_BURGER' },
  { type: 'SELECT_ARABIATTA_REQUEST', value: '요청-없음' },
  { type: 'SCROLL_TO_DRINK_OPTIONS' },
  { type: 'SELECT_DRINK', value: '펩시콜라제로' },
  { type: 'SELECT_SAUCE', value: '선택없음' },
  { type: 'ADD_TO_CART' },
  { type: 'OPEN_CHECKOUT' },
  { type: 'SELECT_CREDIT_CARD' },
]

test('14번 시작 화면에서 주문·결제 후 두 영수증 분기가 15번 화면에 도달한다', () => {
  const cardScreen = targetEvents.reduce(applyKioskEvent, initialKioskOrder)
  const paymentComplete = applyKioskEvent(cardScreen, { type: 'COMPLETE_CARD_PAYMENT' })

  assert.equal(initialKioskOrder.screen, 14)
  assert.equal(cardScreen.screen, 10)
  assert.equal(paymentComplete.screen, 11)
  assert.equal(paymentComplete.paymentStatus, 'completed')
  assert.equal(paymentComplete.paymentMethod, 'creditCard')

  for (const receiptOption of ['printed', 'notPrinted']) {
    const result = applyKioskEvent(paymentComplete, {
      type: 'SELECT_RECEIPT_OPTION',
      value: receiptOption,
    })

    assert.deepEqual(
      {
        screen: result.screen,
        simulationStatus: result.simulationStatus,
        paymentStatus: result.paymentStatus,
        paymentMethod: result.paymentMethod,
        receiptOption: result.receiptOption,
        orderType: result.orderType,
        product: result.product,
        selectedChicken: result.selectedChicken,
        selectedBurger: result.selectedBurger,
        burgerRequest: result.burgerRequest,
        selectedDrink: result.selectedDrink,
        selectedSauce: result.selectedSauce,
        totalPrice: calculateTotalPrice(result),
        calories: result.calories,
        isInCart: result.isInCart,
      },
      {
        screen: 15,
        simulationStatus: 'completed',
        paymentStatus: 'completed',
        paymentMethod: 'creditCard',
        receiptOption,
        orderType: 'dineIn',
        product: '떡강정세트',
        selectedChicken: '케이준떡강정S',
        selectedBurger: '아라비아따치즈버거',
        burgerRequest: '요청-없음',
        selectedDrink: '펩시콜라제로',
        selectedSauce: '선택없음',
        totalPrice: 12600,
        calories: 1372,
        isInCart: true,
      },
    )
    assert.deepEqual(
      applyKioskEvent(result, { type: 'RESTART_SIMULATION' }),
      initialKioskOrder,
    )
  }
})

test('필수 선택 전에는 장바구니에 담지 않고 처음으로에서 초기화한다', () => {
  const screenSevenWithoutZero = targetEvents
    .slice(0, 9)
    .reduce(applyKioskEvent, initialKioskOrder)
  const rejected = applyKioskEvent(screenSevenWithoutZero, { type: 'ADD_TO_CART' })
  const reset = applyKioskEvent(rejected, { type: 'HOME' })

  assert.equal(rejected.screen, 7)
  assert.deepEqual(reset, initialKioskOrder)
})

test('아라비아따치즈버거 요청 없음 선택은 팝업을 닫고 기존 버거를 교체한다', () => {
  const popupOrder = targetEvents
    .slice(0, 7)
    .reduce(applyKioskEvent, initialKioskOrder)
  const selectedOrder = applyKioskEvent(popupOrder, {
    type: 'SELECT_ARABIATTA_REQUEST',
    value: '요청-없음',
  })

  assert.equal(popupOrder.screen, 6)
  assert.equal(popupOrder.pendingBurger, '아라비아따치즈버거')
  assert.equal(selectedOrder.screen, 5)
  assert.equal(selectedOrder.selectedBurger, '아라비아따치즈버거')
  assert.equal(selectedOrder.pendingBurger, null)
  assert.equal(selectedOrder.burgerRequest, '요청-없음')
  assert.equal(selectedOrder.burgerUpgradePrice, 2500)
  assert.equal(calculateTotalPrice(selectedOrder), 12600)
  assert.equal(recoverGuideId(selectedOrder, 'step6'), 'step7')

  const drinkOrder = applyKioskEvent(selectedOrder, { type: 'SCROLL_TO_DRINK_OPTIONS' })
  assert.equal(drinkOrder.screen, 7)
  assert.equal(drinkOrder.selectedBurger, '아라비아따치즈버거')
})

test('가이드가 올바른 주문 행동과 확인을 거쳐 완료 단계에 도달한다', () => {
  let order = initialKioskOrder
  let guideId = 'start'

  const act = (event) => {
    guideId = nextGuideAfterAction(guideId, event.type, event.value, order)
    order = applyKioskEvent(order, event)
  }

  act({ type: 'START_SIMULATION' })
  act({ type: 'SELECT_DINE_IN' })
  act({ type: 'OPEN_SET_CATEGORY' })
  act({ type: 'SELECT_TTEOKGANGJEONG_SET' })
  act({ type: 'SELECT_DEFAULT_BURGER_REQUEST', value: '요청-없음' })
  assert.equal(guideId, 'step4')

  act({ type: 'SELECT_CHICKEN', value: '케이준떡강정S' })
  assert.equal(guideId, 'step5')
  act({ type: 'SELECT_ARABIATTA_BURGER' })
  act({ type: 'SELECT_ARABIATTA_REQUEST', value: '요청-없음' })
  act({ type: 'SCROLL_TO_DRINK_OPTIONS' })
  act({ type: 'SELECT_DRINK', value: '펩시콜라제로' })
  assert.equal(guideId, 'step9')
  assert.equal(hasTargetOrder(order), true)

  guideId = nextGuideAfterConfirm(guideId, order)
  act({ type: 'ADD_TO_CART' })
  act({ type: 'OPEN_CHECKOUT' })
  guideId = nextGuideAfterConfirm(guideId, order)
  act({ type: 'SELECT_CREDIT_CARD' })
  act({ type: 'COMPLETE_CARD_PAYMENT' })
  act({ type: 'SELECT_RECEIPT_OPTION', value: 'printed' })

  assert.equal(guideId, 'complete')
  assert.equal(order.screen, 15)
})

test('화면과 가이드가 어긋나면 현재 주문 화면에 맞게 복구한다', () => {
  const order = targetEvents.reduce(applyKioskEvent, initialKioskOrder)

  assert.equal(order.screen, 10)
  assert.equal(recoverGuideId(order, 'step3'), 'step14')
  assert.equal(nextGuideAfterAction('step6', 'BACK', undefined, order), 'step5')
  assert.equal(nextGuideAfterAction('step14', 'CANCEL_PAYMENT', undefined, order), 'step13')
  assert.equal(nextGuideAfterAction('step9', 'SCROLL_TO_BURGER_OPTIONS', undefined, order), 'step5')
})

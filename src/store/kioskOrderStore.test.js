import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyKioskEvent,
  calculateTotalPrice,
  initialKioskOrder,
} from './kioskOrderStore.js'

const targetEvents = [
  { type: 'START_SIMULATION' },
  { type: 'SELECT_DINE_IN' },
  { type: 'OPEN_SET_CATEGORY' },
  { type: 'SELECT_TTEOKGANGJEONG_SET' },
  { type: 'SELECT_DEFAULT_BURGER_REQUEST', value: '요청-없음' },
  { type: 'SELECT_ARABIATTA_BURGER' },
  { type: 'SELECT_ARABIATTA_REQUEST', value: '요청-없음' },
  { type: 'SCROLL_TO_DRINK_OPTIONS' },
  { type: 'SELECT_DRINK', value: '펩시콜라제로' },
  { type: 'SELECT_SAUCE', value: '선택없음' },
  { type: 'ADD_TO_CART' },
  { type: 'OPEN_CHECKOUT' },
  { type: 'SELECT_CREDIT_CARD' },
]

test('12번 시작 화면에서 주문·결제 후 두 영수증 분기가 13번 화면에 도달한다', () => {
  const cardScreen = targetEvents.reduce(applyKioskEvent, initialKioskOrder)
  const paymentComplete = applyKioskEvent(cardScreen, { type: 'COMPLETE_CARD_PAYMENT' })

  assert.equal(initialKioskOrder.screen, 12)
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
        screen: 13,
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
    .slice(0, 8)
    .reduce(applyKioskEvent, initialKioskOrder)
  const rejected = applyKioskEvent(screenSevenWithoutZero, { type: 'ADD_TO_CART' })
  const reset = applyKioskEvent(rejected, { type: 'HOME' })

  assert.equal(rejected.screen, 7)
  assert.deepEqual(reset, initialKioskOrder)
})

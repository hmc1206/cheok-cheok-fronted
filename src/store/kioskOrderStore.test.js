import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyKioskEvent,
  calculateTotalPrice,
  initialKioskOrder,
} from './kioskOrderStore.js'

const targetEvents = [
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

test('목표 주문 흐름이 10번 화면과 최종 상태에 도달한다', () => {
  const result = targetEvents.reduce(applyKioskEvent, initialKioskOrder)

  assert.deepEqual(
    {
      screen: result.screen,
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
      screen: 10,
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
})

test('필수 선택 전에는 장바구니에 담지 않고 처음으로에서 초기화한다', () => {
  const screenSevenWithoutZero = targetEvents
    .slice(0, 7)
    .reduce(applyKioskEvent, initialKioskOrder)
  const rejected = applyKioskEvent(screenSevenWithoutZero, { type: 'ADD_TO_CART' })
  const reset = applyKioskEvent(rejected, { type: 'HOME' })

  assert.equal(rejected.screen, 7)
  assert.deepEqual(reset, initialKioskOrder)
})

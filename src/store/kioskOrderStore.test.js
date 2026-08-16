import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BASE_PRICE,
  calculateCalories,
  calculateOptionPrice,
  calculateTotalPrice,
} from './kioskOrderStore.js'

const targetOrder = {
  basePrice: BASE_PRICE,
  quantity: 1,
  chicken: '케이준떡강정S',
  burger: '아라비아따치즈버거',
  drink: '펩시콜라제로',
  sauce: '선택없음',
}

test('목표 세트의 옵션·총액·열량을 계산한다', () => {
  assert.equal(calculateOptionPrice(targetOrder), 2500)
  assert.equal(calculateTotalPrice(targetOrder), 12600)
  assert.equal(calculateCalories(targetOrder), 1372)
})

test('장바구니 수량을 총액에 반영한다', () => {
  assert.equal(calculateTotalPrice(targetOrder, 3), 37800)
})

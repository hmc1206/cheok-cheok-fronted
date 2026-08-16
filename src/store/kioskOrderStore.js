import { create } from 'zustand'

export const BASE_PRICE = 10100

const SAUCE_PRICES = {
  선택없음: 0,
  맘스양념소스: 1000,
  랜치소스: 1000,
  매콤치즈마요소스: 1000,
}

const DRINK_CALORIES = {
  펩시콜라: 135,
  펩시콜라제로: 0,
  사이다: 135,
}

const SAUCE_CALORIES = {
  선택없음: 0,
  맘스양념소스: 101,
  랜치소스: 127,
  매콤치즈마요소스: 130,
}

export const initialKioskOrder = {
  screen: 1,
  orderType: null,
  product: null,
  quantity: 1,
  selectedChicken: null,
  selectedBurger: null,
  burgerRequest: null,
  selectedDrink: '펩시콜라',
  selectedSauce: '선택없음',
  basePrice: BASE_PRICE,
  burgerUpgradePrice: 0,
  calories: 1310,
  isInCart: false,
}

export function calculateTotalPrice(order) {
  return (
    order.basePrice +
    order.burgerUpgradePrice +
    (SAUCE_PRICES[order.selectedSauce] ?? 0)
  ) * order.quantity
}

export function calculateCalories(order) {
  if (!order.selectedChicken || !order.selectedBurger) return 1310
  const burgerCalories = order.selectedBurger === '아라비아따치즈버거' ? 791 : 594
  return 581 + burgerCalories + (DRINK_CALORIES[order.selectedDrink] ?? 0) +
    (SAUCE_CALORIES[order.selectedSauce] ?? 0)
}

export function canAddToCart(order) {
  return order.selectedChicken === '케이준떡강정S' &&
    order.selectedBurger === '아라비아따치즈버거' &&
    order.burgerRequest === '요청-없음' &&
    order.selectedDrink === '펩시콜라제로' &&
    order.selectedSauce === '선택없음'
}

export function applyKioskEvent(state, event) {
  switch (event.type) {
    case 'HOME':
      return { ...initialKioskOrder }
    case 'SELECT_DINE_IN':
      return { ...initialKioskOrder, screen: 2, orderType: 'dineIn' }
    case 'SELECT_TAKE_OUT':
      return { ...initialKioskOrder, screen: 2, orderType: 'takeOut' }
    case 'OPEN_SET_CATEGORY':
      return state.screen === 2 ? { ...state, screen: 3 } : state
    case 'SELECT_TTEOKGANGJEONG_SET':
      return state.screen === 3 ? {
        ...state,
        screen: 4,
        product: '떡강정세트',
        quantity: 1,
        selectedChicken: '케이준떡강정S',
        selectedBurger: '싸이버거',
        burgerRequest: null,
        selectedDrink: '펩시콜라',
        selectedSauce: '선택없음',
        burgerUpgradePrice: 0,
        calories: 1310,
        isInCart: false,
      } : state
    case 'SELECT_DEFAULT_BURGER_REQUEST':
      return state.screen === 4 ? { ...state, screen: 5, burgerRequest: event.value } : state
    case 'SELECT_ARABIATTA_BURGER':
      return state.screen === 5 ? { ...state, screen: 6 } : state
    case 'SELECT_ARABIATTA_REQUEST': {
      if (state.screen !== 6) return state
      const next = {
        ...state,
        selectedBurger: '아라비아따치즈버거',
        burgerRequest: event.value,
        burgerUpgradePrice: 2500,
      }
      return { ...next, calories: calculateCalories(next) }
    }
    case 'SCROLL_TO_DRINK_OPTIONS':
      return state.screen === 6 && state.selectedBurger === '아라비아따치즈버거' && state.burgerRequest
        ? { ...state, screen: 7 }
        : state
    case 'SCROLL_TO_BURGER_OPTIONS':
      return state.screen === 7 ? { ...state, screen: 5 } : state
    case 'SELECT_DRINK': {
      if (state.screen !== 7) return state
      const next = { ...state, selectedDrink: event.value }
      return { ...next, calories: calculateCalories(next) }
    }
    case 'SELECT_SAUCE': {
      if (state.screen !== 7) return state
      const next = { ...state, selectedSauce: event.value }
      return { ...next, calories: calculateCalories(next) }
    }
    case 'ADD_TO_CART':
      return state.screen === 7 && canAddToCart(state)
        ? { ...state, screen: 8, isInCart: true }
        : state
    case 'CHANGE_QUANTITY':
      return state.screen === 8
        ? { ...state, quantity: Math.max(1, state.quantity + event.value) }
        : state
    case 'DELETE_ITEM':
      return state.screen === 8 ? {
        ...initialKioskOrder,
        screen: 3,
        orderType: state.orderType,
      } : state
    case 'OPEN_CHECKOUT':
      return state.screen === 8 && state.isInCart ? { ...state, screen: 9 } : state
    case 'EDIT_OPTIONS':
      return state.screen === 9 ? { ...state, screen: 5 } : state
    case 'SELECT_CREDIT_CARD':
      return state.screen === 9 && state.isInCart ? { ...state, screen: 10 } : state
    case 'CANCEL_PAYMENT':
      return state.screen === 10 ? { ...state, screen: 9 } : state
    case 'BACK': {
      const previousScreen = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 5, 8: 3, 9: 8, 10: 9 }[state.screen]
      return previousScreen === 1
        ? { ...initialKioskOrder }
        : { ...state, screen: previousScreen ?? 1 }
    }
    default:
      return state
  }
}

export const useKioskOrderStore = create((set) => ({
  ...initialKioskOrder,
  dispatch: (event) => set((state) => applyKioskEvent(state, event)),
}))

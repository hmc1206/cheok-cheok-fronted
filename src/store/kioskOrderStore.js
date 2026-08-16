import { create } from 'zustand'
import {
  BURGER_OPTIONS,
  CHICKEN_OPTIONS,
  DRINK_OPTIONS,
  SAUCE_OPTIONS,
} from '../data/kioskData.js'

export const BASE_PRICE = 10100

const findOption = (options, id) => options.find((option) => option.id === id)

export function calculateOptionPrice(order) {
  return [
    findOption(CHICKEN_OPTIONS, order.chicken)?.price,
    findOption(BURGER_OPTIONS, order.burger)?.price,
    findOption(DRINK_OPTIONS, order.drink)?.price,
    findOption(SAUCE_OPTIONS, order.sauce)?.price,
  ].reduce((total, price) => total + (price ?? 0), 0)
}

export function calculateCalories(order) {
  return [
    findOption(CHICKEN_OPTIONS, order.chicken)?.calories,
    findOption(BURGER_OPTIONS, order.burger)?.calories,
    findOption(DRINK_OPTIONS, order.drink)?.calories,
    findOption(SAUCE_OPTIONS, order.sauce)?.calories,
  ].reduce((total, calories) => total + (calories ?? 0), 0)
}

export function calculateTotalPrice(order, quantity = order.quantity) {
  return (order.basePrice + calculateOptionPrice(order)) * quantity
}

const initialOrder = {
  screen: 'start',
  orderType: null,
  category: 'popular',
  product: null,
  quantity: 1,
  cartQuantity: 0,
  chicken: null,
  burger: null,
  burgerRequest: null,
  drink: null,
  sauce: '선택없음',
  basePrice: BASE_PRICE,
  zoomed: false,
  highContrast: false,
  lowScreen: false,
}

export const useKioskOrderStore = create((set) => ({
  ...initialOrder,

  startOrder: (orderType) =>
    set({
      screen: 'menu',
      orderType,
      category: 'popular',
      product: null,
      quantity: 1,
      cartQuantity: 0,
      chicken: null,
      burger: null,
      burgerRequest: null,
      drink: null,
      sauce: '선택없음',
    }),
  setScreen: (screen) => set({ screen }),
  setCategory: (category) => set({ category, screen: 'menu' }),
  setOrderType: (orderType) => set({ orderType }),
  beginSetOrder: () =>
    set({
      screen: 'customizer',
      category: 'set',
      product: '떡강정세트',
      quantity: 1,
      chicken: '케이준떡강정S',
      burger: '싸이버거',
      burgerRequest: '요청-없음',
      drink: '펩시콜라',
      sauce: '선택없음',
    }),
  setChicken: (chicken) => set({ chicken }),
  setBurger: (burger, burgerRequest) => set({ burger, burgerRequest }),
  setDrink: (drink) => set({ drink }),
  setSauce: (sauce) => set({ sauce }),
  changeProductQuantity: (delta) =>
    set((state) => ({ quantity: Math.max(1, state.quantity + delta) })),
  addToCart: () =>
    set((state) => ({ screen: 'menu', category: 'set', cartQuantity: state.quantity })),
  changeCartQuantity: (delta) =>
    set((state) => ({ cartQuantity: Math.max(1, state.cartQuantity + delta) })),
  clearCart: () => set({ cartQuantity: 0, product: null }),
  editOptions: () =>
    set((state) => ({ screen: 'customizer', quantity: state.cartQuantity || state.quantity })),
  toggleZoom: () => set((state) => ({ zoomed: !state.zoomed })),
  toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
  toggleLowScreen: () => set((state) => ({ lowScreen: !state.lowScreen })),
  resetOrder: () =>
    set((state) => ({
      ...initialOrder,
      zoomed: state.zoomed,
      highContrast: state.highContrast,
      lowScreen: state.lowScreen,
    })),
}))

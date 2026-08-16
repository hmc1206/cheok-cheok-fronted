export const CATEGORIES = [
  { id: 'popular', label: '인기메뉴' },
  { id: 'burger', label: '버거' },
  { id: 'boneless', label: '순살치킨' },
  { id: 'boneChicken', label: '뼈치킨' },
  { id: 'drink', label: '음료' },
  { id: 'set', label: '세트' },
  { id: 'side', label: '사이드' },
]

export const SET_PRODUCTS = [
  { name: '모코코 썸머 바캉스세트', price: 22500, tone: 'green' },
  { name: '스트레스 빠삭세트(순살)', price: 18300, tone: 'gold', badge: 'NEW' },
  { name: '치버세트', price: 17500, tone: 'orange' },
  { name: '떡강정세트', price: 10100, tone: 'red', target: true },
  { name: '매직쫑 싸이버거 싱글세트', price: 22600, tone: 'yellow' },
  { name: '매직쫑 싸이버거 커플세트', price: 29900, tone: 'amber' },
  { name: '후덕쪽싱글세트', price: 22100, tone: 'brown' },
  { name: '후덕쪽커플세트', price: 29700, tone: 'deep-red' },
]

export const POPULAR_PRODUCTS = [
  SET_PRODUCTS[0],
  { name: '내슈빌핫치킨버거', price: 6100, tone: 'red', kind: 'burger', badge: 'NEW' },
  { name: '(행사)가득싸치킨(순살)', price: 13100, tone: 'orange', kind: 'chicken' },
  { name: '(행사)핫치즈빅치킨(순살)', price: 15700, tone: 'deep-red', kind: 'chicken' },
  SET_PRODUCTS[1],
  { name: '밀크스파클', price: 2800, tone: 'gray', kind: 'drink', soldOut: true },
  SET_PRODUCTS[2],
  SET_PRODUCTS[4],
  { name: '당근빵(2조각)', price: 2600, tone: 'orange', kind: 'side', badge: 'NEW' },
]

export const CHICKEN_OPTIONS = [
  { id: '케이준떡강정S', label: '케이준떡강정S 1개', price: 0, calories: 581, tone: 'red' },
  { id: '간장마늘떡강정S', label: '간장마늘떡강정S 1개', price: 200, calories: 594, tone: 'brown' },
]

export const BURGER_OPTIONS = [
  { id: '싸이버거', label: '싸이버거', price: 0, calories: 594, tone: 'gold' },
  { id: '불고기버거', label: '불고기버거', price: 0, calories: 601, tone: 'brown' },
  { id: '인크레더블버거', label: '인크레더블버거', price: 1200, calories: 791, tone: 'yellow' },
  { id: '싸이콰트로치즈버거', label: '싸이콰트로치즈버거', price: 1800, calories: 991, tone: 'orange' },
  { id: '아라비아따치즈버거', label: '아라비아따치즈버거', price: 2500, calories: 791, tone: 'red' },
]

export const DRINK_OPTIONS = [
  { id: '펩시콜라', label: '펩시콜라', price: 0, calories: 135, tone: 'cola' },
  { id: '펩시콜라제로', label: '펩시콜라제로', price: 0, calories: 0, tone: 'zero' },
  { id: '사이다', label: '사이다', price: 0, calories: 135, tone: 'clear' },
]

export const SAUCE_OPTIONS = [
  { id: '선택없음', label: '선택없음', price: 0, calories: 0, tone: 'none' },
  { id: '맘스양념소스', label: '맘스양념소스(소포장)', price: 1000, calories: 101, tone: 'red' },
  { id: '랜치소스', label: '랜치소스(소포장)', price: 1000, calories: 127, tone: 'cream' },
  { id: '매콤치즈마요소스', label: '매콤치즈마요소스(소포장)', price: 1000, calories: 130, tone: 'orange' },
]

export const PAYMENT_METHODS = [
  { id: 'card', label: '신용카드', icon: '▰' },
  { id: 'coupon', label: 'E쿠폰/선불카드', icon: '◫' },
  { id: 'gift', label: '상품권', icon: '%' },
  { id: 'payco', label: '페이코', icon: 'PAYCO' },
  { id: 'kakao', label: '카카오페이', icon: 'pay' },
  { id: 'naver', label: '네이버페이', icon: 'N pay' },
  { id: 'shinhan', label: '신한 SOL페이', icon: 'SOL' },
]

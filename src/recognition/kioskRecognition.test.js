import { describe, expect, it } from 'vitest'
import { detectKioskBrand } from './detectKioskBrand'
import { detectMegaState } from './detectMegaState'
import { detectMomsTouchState } from './detectMomsTouchState'
import { checkBurgerRequestMismatch } from '../data/momsTouchFlow'
import { MEGA_STATE } from '../data/megaFlow'
import { MOMS_TOUCH_STATE } from '../data/momsTouchFlow'
import { KIOSK_BRAND } from '../types/kiosk'

// 테스트 편의를 위해 문자열 배열을 detectKioskBrand/detectMegaState 등이 기대하는
// {text: string}[] 형태로 바꿔주는 헬퍼. 실제 OCR 결과와 형태만 맞으면 충분하다
// (이 순수 함수들은 bounding box 등 다른 필드를 보지 않는다).
function words(...texts) {
  return texts.map((text) => ({ text }))
}

describe('detectKioskBrand (요구사항 12장 필수 테스트)', () => {
  it('메가커피 고유 키워드가 보이면 MEGA로 판별한다', () => {
    const result = detectKioskBrand(words('메가엠지씨커피', 'LANGUAGE', '커피', '디카페인', '장바구니 조회'))
    expect(result.brand).toBe(KIOSK_BRAND.MEGA)
    expect(result.scores.mega).toBeGreaterThan(result.scores.momsTouch)
  })

  it("맘스터치 고유 키워드가 보이면 MOMS_TOUCH로 판별한다", () => {
    const result = detectKioskBrand(words("MOM'S TOUCH", '인기메뉴', '버거', '순살치킨', '세트', '사이드'))
    expect(result.brand).toBe(KIOSK_BRAND.MOMS_TOUCH)
    expect(result.scores.momsTouch).toBeGreaterThan(result.scores.mega)
  })

  it('두 브랜드 공통 단어만 있으면 UNKNOWN으로 판별한다(단어 하나로 확정 금지)', () => {
    const result = detectKioskBrand(words('주문담기', '결제하기', '매장', '카드'))
    expect(result.brand).toBe(KIOSK_BRAND.UNKNOWN)
  })

  it("MOM'S TOUCH / MOMS TOUCH / MOMSTOUCH 표기를 동일하게 처리한다(정규화)", () => {
    const withApostrophe = detectKioskBrand(words("MOM'S TOUCH", '버거', '세트'))
    const withSpace = detectKioskBrand(words('MOMS TOUCH', '버거', '세트'))
    const withoutSpace = detectKioskBrand(words('MOMSTOUCH', '버거', '세트'))

    expect(withApostrophe.brand).toBe(KIOSK_BRAND.MOMS_TOUCH)
    expect(withSpace.brand).toBe(KIOSK_BRAND.MOMS_TOUCH)
    expect(withoutSpace.brand).toBe(KIOSK_BRAND.MOMS_TOUCH)
    expect(withApostrophe.scores.momsTouch).toBeCloseTo(withSpace.scores.momsTouch, 2)
  })

  it('메가커피 사진에 세트/결제하기가 보여도 맘스터치로 오판하지 않는다(요구사항 11장)', () => {
    const result = detectKioskBrand(words('메가엠지씨커피', '결제하기', '주문담기'))
    expect(result.brand).toBe(KIOSK_BRAND.MEGA)
  })

  it('빈 OCR 결과는 UNKNOWN을 반환한다', () => {
    const result = detectKioskBrand([])
    expect(result.brand).toBe(KIOSK_BRAND.UNKNOWN)
    expect(result.confidence).toBe(0)
  })
})

describe('detectMegaState (기존 메가커피 플로우가 계속 정상 작동하는지)', () => {
  it('시작 화면 키워드로 MEGA_START를 판별한다', () => {
    const result = detectMegaState(words('화면터치', '상품선택', '결제/주문확인', '쉬운모드'))
    expect(result.state).toBe(MEGA_STATE.START)
  })

  it('메뉴 화면 키워드로 MEGA_MENU를 판별한다', () => {
    const result = detectMegaState(words('메가엠지씨커피', '신메뉴', '추천메뉴', '커피', '디카페인', '장바구니 조회'))
    expect(result.state).toBe(MEGA_STATE.MENU)
  })

  it('옵션 화면 키워드로 MEGA_OPTION을 판별한다', () => {
    const result = detectMegaState(words('선택하신 상품의 옵션상품', '옵션 추가', '텀블러선택', '주문담기'))
    expect(result.state).toBe(MEGA_STATE.OPTION)
  })

  it('결제수단 화면 키워드로 MEGA_PAYMENT를 판별한다', () => {
    const result = detectMegaState(words('할인수단', '결제수단을 선택해주세요', '카드결제', '카카오페이'))
    expect(result.state).toBe(MEGA_STATE.PAYMENT)
  })

  it('신뢰도가 낮은 애매한 단어만 있으면 state가 null이다(인식 실패 처리 대상)', () => {
    const result = detectMegaState(words('안녕하세요'))
    expect(result.state).toBeNull()
  })
})

describe('detectMomsTouchState (맘스터치 신규 상태 판별)', () => {
  it('시작 화면 키워드로 MOMS_START를 판별한다', () => {
    const result = detectMomsTouchState(words('카드전용 주문기기 입니다', '매장', '포장', '한국어'))
    expect(result.state).toBe(MOMS_TOUCH_STATE.START)
  })

  it('메뉴 화면 키워드로 MOMS_MENU를 판별한다', () => {
    const result = detectMomsTouchState(words("MOM'S TOUCH", '인기메뉴', '버거', '순살치킨', '뼈치킨', '결제하기'))
    expect(result.state).toBe(MOMS_TOUCH_STATE.MENU)
  })

  it('세트 목록 화면 키워드로 MOMS_SET_MENU를 판별한다', () => {
    const result = detectMomsTouchState(words('세트', '떡강정세트', '치버세트'))
    expect(result.state).toBe(MOMS_TOUCH_STATE.SET_MENU)
  })

  it('세트 구성(옵션 상단) 화면 키워드로 MOMS_SET_OPTION_TOP을 판별한다', () => {
    const result = detectMomsTouchState(words('떡강정세트', '필수', '치킨', '버거', '선택 가능 수량', '주문담기'))
    expect(result.state).toBe(MOMS_TOUCH_STATE.SET_OPTION_TOP)
  })

  it('버거 요청사항 팝업 키워드로 MOMS_BURGER_REQUEST를 판별한다', () => {
    const result = detectMomsTouchState(words('옵션추가', '요청-없음', '요청-양파제외'))
    expect(result.state).toBe(MOMS_TOUCH_STATE.BURGER_REQUEST)
  })

  it('음료/추가 옵션(옵션 하단) 화면 키워드로 MOMS_SET_OPTION_BOTTOM을 판별한다', () => {
    const result = detectMomsTouchState(words('펩시콜라', '펩시콜라제로', '사이다', '추가', '선택없음', '주문상품'))
    expect(result.state).toBe(MOMS_TOUCH_STATE.SET_OPTION_BOTTOM)
  })

  it('장바구니 화면 키워드로 MOMS_CART를 판별한다', () => {
    const result = detectMomsTouchState(words('주문상품', '총 수량', '총 금액', '떡강정세트', '결제하기'))
    expect(result.state).toBe(MOMS_TOUCH_STATE.CART)
  })

  it('주문 확인 화면 키워드로 MOMS_ORDER_CONFIRM을 판별한다', () => {
    const result = detectMomsTouchState(
      words('주문하실 내용이 맞나요', '결제 후 취소나 변경이 어렵습니다', '총 결제 금액', '신용카드', '카카오페이'),
    )
    expect(result.state).toBe(MOMS_TOUCH_STATE.ORDER_CONFIRM)
  })

  it('카드 결제 화면 키워드로 MOMS_CARD_PAYMENT를 판별한다', () => {
    const result = detectMomsTouchState(
      words('신용카드 결제', '신용카드를 투입구에 끝까지 넣으시고', '결제가 완료될 때까지 빼지마세요'),
    )
    expect(result.state).toBe(MOMS_TOUCH_STATE.CARD_PAYMENT)
  })
})

describe('checkBurgerRequestMismatch (다른 버거가 선택됐을 때 경고 - 요구사항 6/8장)', () => {
  it('목표 버거(아라비아따치즈버거)가 보이면 경고하지 않는다', () => {
    expect(checkBurgerRequestMismatch(words('아라비아따치즈버거', '요청-없음'))).toBeNull()
  })

  it("사진 속 참고 화면처럼 '싸이버거'가 감지되면 경고 문구를 반환한다", () => {
    const warning = checkBurgerRequestMismatch(words('싸이버거', '요청-없음'))
    expect(warning).toContain('아라비아따치즈버거')
  })

  it('어느 쪽도 확인되지 않으면(애매하면) 경고하지 않는다', () => {
    expect(checkBurgerRequestMismatch(words('옵션추가', '요청-없음'))).toBeNull()
  })
})

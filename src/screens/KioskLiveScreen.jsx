import { useEffect, useRef, useState } from 'react'
import {
  BURGER_OPTIONS,
  CATEGORIES,
  CHICKEN_OPTIONS,
  DRINK_OPTIONS,
  PAYMENT_METHODS,
  POPULAR_PRODUCTS,
  SAUCE_OPTIONS,
  SET_PRODUCTS,
} from '../data/kioskData'
import {
  calculateCalories,
  calculateOptionPrice,
  calculateTotalPrice,
  useKioskOrderStore,
} from '../store/kioskOrderStore'
import '../styles/kiosk.css'

const formatPrice = (price) => price.toLocaleString('ko-KR')

const SCREEN_GUIDES = {
  start: '주문을 시작하려면 매장 또는 포장 버튼을 눌러주세요.',
  menu: '상단에서 세트 메뉴를 선택하고 떡강정세트를 눌러주세요.',
  customizer: '치킨, 버거, 음료를 선택한 뒤 주문담기 버튼을 눌러주세요.',
  checkout: '주문 내용을 확인하고 결제수단을 선택해주세요.',
  payment: '신용카드를 투입구에 넣고 결제가 끝날 때까지 빼지 마세요.',
  complete: '결제가 완료되었습니다.',
}

export function KioskLiveScreen() {
  const order = useKioskOrderStore()
  const [language, setLanguage] = useState('한국어')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const showToast = (message) => setToast(message)
  const goHome = () => {
    order.resetOrder()
    setLanguage('한국어')
  }
  const goBack = () => {
    if (order.screen === 'payment') order.setScreen('checkout')
    else if (order.screen === 'checkout' || order.screen === 'customizer') order.setScreen('menu')
    else goHome()
  }
  const speakGuide = () => {
    if (!('speechSynthesis' in window)) {
      showToast('이 브라우저는 음성안내를 지원하지 않습니다.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(SCREEN_GUIDES[order.screen])
    utterance.lang = 'ko-KR'
    window.speechSynthesis.speak(utterance)
    showToast('현재 화면을 음성으로 안내합니다.')
  }

  const deviceClass = [
    'kiosk-device',
    order.zoomed && 'is-zoomed',
    order.highContrast && 'is-high-contrast',
    order.lowScreen && 'is-low-screen',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="kiosk-page">
      <section className={deviceClass} aria-label="맘스터치 키오스크 주문 시뮬레이션">
        {order.screen !== 'start' && order.screen !== 'complete' && (
          <KioskHeader
            orderType={order.orderType}
            onOrderType={order.setOrderType}
            onBack={goBack}
            showBack={order.screen !== 'menu'}
            onHome={goHome}
          />
        )}

        <div className="kiosk-content">
          {order.screen === 'start' && (
            <StartScreen
              language={language}
              onLanguage={setLanguage}
              onStart={order.startOrder}
            />
          )}
          {order.screen === 'menu' && <MenuScreen order={order} showToast={showToast} />}
          {order.screen === 'customizer' && <CustomizerScreen order={order} />}
          {order.screen === 'checkout' && <CheckoutScreen order={order} showToast={showToast} />}
          {order.screen === 'payment' && <CardPaymentScreen order={order} />}
          {order.screen === 'complete' && <CompleteScreen onHome={goHome} />}
        </div>

        <AccessibilityBar
          zoomed={order.zoomed}
          highContrast={order.highContrast}
          lowScreen={order.lowScreen}
          onHome={goHome}
          onZoom={order.toggleZoom}
          onHighContrast={order.toggleHighContrast}
          onLowScreen={order.toggleLowScreen}
          onVoice={speakGuide}
          onStaff={() => showToast('직원을 호출했습니다.')}
        />

        {toast && (
          <div className="kiosk-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </section>
    </div>
  )
}

function KioskHeader({ orderType, onOrderType, onBack, showBack, onHome }) {
  return (
    <header className="kiosk-header">
      <button
        type="button"
        className="kiosk-header-nav"
        onClick={showBack ? onBack : onHome}
        aria-label={showBack ? '이전 화면' : '처음 화면'}
      >
        {showBack ? '‹ 이전' : '⌂'}
      </button>
      <strong className="kiosk-logo">MOM’S TOUCH</strong>
      <div className="order-type-toggle" aria-label="주문 유형">
        <button
          type="button"
          className={orderType === 'dineIn' ? 'active' : ''}
          onClick={() => onOrderType('dineIn')}
        >
          매장
        </button>
        <button
          type="button"
          className={orderType === 'takeOut' ? 'active' : ''}
          onClick={() => onOrderType('takeOut')}
        >
          포장
        </button>
      </div>
    </header>
  )
}

function StartScreen({ language, onLanguage, onStart }) {
  const languages = ['한국어', 'English', '中國語', '日本語']
  return (
    <main className="start-screen">
      <section className="start-ad">
        <div className="start-ad-copy">
          <small>치즈폭탄으로 더 찐-하게!</small>
          <h1>핫치즈<br />빅치킨</h1>
        </div>
        <FoodArt kind="hero" tone="red" />
        <b>MOM’S TOUCH</b>
      </section>

      <div className="language-row" aria-label="언어 선택">
        {languages.map((item) => (
          <button
            type="button"
            key={item}
            className={language === item ? 'active' : ''}
            onClick={() => onLanguage(item)}
          >
            {item === '한국어' ? '🇰🇷 ' : item === 'English' ? '🇺🇸 ' : item === '中國語' ? '🇨🇳 ' : '🇯🇵 '}
            {item}
          </button>
        ))}
      </div>

      <section className="start-order-panel">
        <h2>카드전용 주문기기 입니다</h2>
        <p>현금 및 기타 결제는 카운터에서 진행 해주세요.</p>
        <div className="start-order-buttons">
          <button type="button" onClick={() => onStart('dineIn')}>매장</button>
          <button type="button" onClick={() => onStart('takeOut')}>포장</button>
        </div>
      </section>
    </main>
  )
}

function MenuScreen({ order, showToast }) {
  const products = order.category === 'set' ? SET_PRODUCTS : POPULAR_PRODUCTS
  const title = CATEGORIES.find((category) => category.id === order.category)?.label
  const cartTotal = calculateTotalPrice(order, order.cartQuantity)

  const chooseProduct = (product) => {
    if (product.target) order.beginSetOrder()
    else showToast('이 시뮬레이션에서는 떡강정세트를 선택해주세요.')
  }

  return (
    <main className="menu-screen">
      <CategoryTabs selected={order.category} onSelect={order.setCategory} />
      <div className="menu-scroll">
        {order.category !== 'popular' && order.category !== 'set' && (
          <div className="category-notice">{title} 메뉴의 대표 상품입니다.</div>
        )}
        <div className="product-grid" aria-label={`${title} 상품 목록`}>
          {products.map((product) => (
            <ProductCard key={product.name} product={product} onSelect={() => chooseProduct(product)} />
          ))}
        </div>
      </div>
      <CartPanel order={order} total={cartTotal} />
    </main>
  )
}

function CategoryTabs({ selected, onSelect }) {
  return (
    <nav className="category-tabs" aria-label="메뉴 카테고리">
      {CATEGORIES.map((category) => (
        <button
          type="button"
          key={category.id}
          className={selected === category.id ? 'active' : ''}
          onClick={() => onSelect(category.id)}
        >
          {category.label}
        </button>
      ))}
    </nav>
  )
}

function ProductCard({ product, onSelect }) {
  return (
    <button
      type="button"
      className={`product-card ${product.target ? 'target' : ''}`}
      onClick={onSelect}
      disabled={product.soldOut}
      aria-label={`${product.name} ${formatPrice(product.price)}원${product.soldOut ? ' 품절' : ''}`}
    >
      <div className="product-art-wrap">
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <FoodArt kind={product.kind ?? 'set'} tone={product.tone} />
        {product.soldOut && <span className="sold-out">SOLD OUT</span>}
      </div>
      <span className="product-name">{product.name}</span>
      <strong>₩ {formatPrice(product.price)}</strong>
    </button>
  )
}

function CartPanel({ order, total }) {
  return (
    <section className={`cart-panel ${order.cartQuantity ? 'has-item' : ''}`} aria-label="장바구니">
      {order.cartQuantity ? (
        <div className="cart-item">
          <div className="cart-thumb"><FoodArt kind="set" tone="red" /></div>
          <div><small>주문상품 1</small><b>떡강정세트</b></div>
          <QuantityControl
            value={order.cartQuantity}
            onMinus={() => order.changeCartQuantity(-1)}
            onPlus={() => order.changeCartQuantity(1)}
            compact
          />
        </div>
      ) : (
        <div className="empty-cart">🛒 <span>메뉴를 선택해 주세요.</span></div>
      )}
      <div className="cart-totals">
        <span>총 수량 (개)<b>{order.cartQuantity}</b></span>
        <span>총 금액 (₩)<b>{formatPrice(total)}</b></span>
        <button type="button" className="trash-button" onClick={order.clearCart} aria-label="장바구니 비우기">⌫</button>
        <button
          type="button"
          className="checkout-button"
          disabled={!order.cartQuantity}
          onClick={() => order.setScreen('checkout')}
        >
          결제하기
        </button>
      </div>
    </section>
  )
}

function CustomizerScreen({ order }) {
  const [pendingBurger, setPendingBurger] = useState(null)
  const drinkSectionRef = useRef(null)
  const optionPrice = calculateOptionPrice(order)
  const calories = calculateCalories(order)
  const total = calculateTotalPrice(order)
  const canAdd = Boolean(order.chicken && order.burger && order.drink)

  return (
    <main className="customizer-screen">
      <div className="customizer-scroll">
        <section className="customizer-product-summary">
          <FoodArt kind="set" tone="red" />
          <div>
            <h1>떡강정세트</h1>
            <QuantityControl
              value={order.quantity}
              onMinus={() => order.changeProductQuantity(-1)}
              onPlus={() => order.changeProductQuantity(1)}
            />
            <strong>₩ {formatPrice(order.basePrice)}</strong>
            <p>Total {formatPrice(calories)} kcal</p>
          </div>
        </section>

        <OptionGroup title="치킨" required>
          {CHICKEN_OPTIONS.map((option) => (
            <OptionCard key={option.id} option={option} kind="chicken" selected={order.chicken === option.id} onClick={() => order.setChicken(option.id)} />
          ))}
        </OptionGroup>

        <OptionGroup title="버거" required wide>
          {BURGER_OPTIONS.map((option) => (
            <OptionCard key={option.id} option={option} kind="burger" selected={order.burger === option.id} onClick={() => setPendingBurger(option)} />
          ))}
        </OptionGroup>

        <button type="button" className="scroll-next-button" onClick={() => drinkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          음료와 소스 선택 보기 ↓
        </button>

        <div ref={drinkSectionRef}>
          <OptionGroup title="음료" required>
            {DRINK_OPTIONS.map((option) => (
              <OptionCard key={option.id} option={option} kind="drink" selected={order.drink === option.id} onClick={() => order.setDrink(option.id)} />
            ))}
          </OptionGroup>
        </div>

        <OptionGroup title="추가" subtitle="선택 가능 수량: 1" wide>
          {SAUCE_OPTIONS.map((option) => (
            <OptionCard key={option.id} option={option} kind="sauce" selected={order.sauce === option.id} onClick={() => order.setSauce(option.id)} />
          ))}
        </OptionGroup>
      </div>

      <SelectedSummary order={order} optionPrice={optionPrice} total={total}>
        <button type="button" className="add-order-button" disabled={!canAdd} onClick={order.addToCart}>
          주문담기<small>{formatPrice(total)}원</small>
        </button>
      </SelectedSummary>

      {pendingBurger && (
        <RequestModal
          burger={pendingBurger}
          onClose={() => setPendingBurger(null)}
          onChoose={(request) => {
            order.setBurger(pendingBurger.id, request)
            setPendingBurger(null)
          }}
        />
      )}
    </main>
  )
}

function OptionGroup({ title, subtitle, required = false, wide = false, children }) {
  return (
    <section className="option-group">
      <h2>{required && <span>필수</span>}{title}{subtitle && <small>({subtitle})</small>}</h2>
      <div className={`option-grid ${wide ? 'wide' : ''}`}>{children}</div>
    </section>
  )
}

function OptionCard({ option, kind, selected, onClick }) {
  return (
    <button type="button" className={`option-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      <FoodArt kind={kind} tone={option.tone} />
      {option.calories !== undefined && <small>{formatPrice(option.calories)} kcal</small>}
      <strong>+{formatPrice(option.price)}</strong>
      <span>{option.label}</span>
    </button>
  )
}

function RequestModal({ burger, onChoose, onClose }) {
  const requests = burger.id === '싸이버거'
    ? ['요청-없음', '요청-양파제외', '요청-피클제외', '요청-피클,양파제외']
    : ['요청-없음', '요청-양파제외']

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return (
    <div className="request-modal-backdrop" role="presentation">
      <section className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-title">
        <header>
          <h2 id="request-title">옵션추가</h2>
          <button type="button" onClick={onClose} aria-label="요청사항 닫기">×</button>
        </header>
        <h3>-{burger.label}</h3>
        <div className="request-options">
          {requests.map((request, index) => (
            <button type="button" key={request} className={index === 0 ? 'selected' : ''} onClick={() => onChoose(request)} autoFocus={index === 0}>
              {request}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function SelectedSummary({ order, optionPrice, total, children }) {
  const selected = [
    { label: order.chicken, kind: 'chicken', tone: 'red' },
    { label: order.burger, kind: 'burger', tone: order.burger === '아라비아따치즈버거' ? 'red' : 'gold' },
    { label: order.drink, kind: 'drink', tone: order.drink === '펩시콜라제로' ? 'zero' : 'cola' },
  ]
  return (
    <section className="selected-summary">
      <div className="selected-items">
        <b>주문상품 3</b>
        <div>
          {selected.map((item) => (
            <article key={item.kind}>
              <FoodArt kind={item.kind} tone={item.tone} />
              <span>{item.label}</span>
              <strong>1</strong>
            </article>
          ))}
        </div>
      </div>
      <div className="selected-totals">
        <span>옵션 총 수량 (개)<b>+3</b></span>
        <span>옵션 총 금액 (원)<b>+{formatPrice(optionPrice)}</b></span>
        <span className="selected-grand-total">총 {formatPrice(total)}원</span>
        {children}
      </div>
    </section>
  )
}

function CheckoutScreen({ order, showToast }) {
  const quantity = order.cartQuantity || order.quantity
  const unitPrice = calculateTotalPrice(order, 1)
  const total = calculateTotalPrice(order, quantity)

  return (
    <main className="checkout-screen">
      <div className="checkout-scroll">
        <header className="checkout-title"><h1>주문하실 내용이 맞나요?</h1><p>결제 후 취소나 변경이 어렵습니다.</p></header>
        <section className="checkout-item">
          <div className="checkout-product-art"><FoodArt kind="set" tone="red" /></div>
          <div className="checkout-product-copy">
            <div><h2>떡강정세트</h2><strong>₩ {formatPrice(unitPrice)}</strong></div>
            <QuantityControl value={quantity} onMinus={() => order.changeCartQuantity(-1)} onPlus={() => order.changeCartQuantity(1)} compact />
            <p>케이준떡강정S 1개</p>
            <p>{order.burger} +{formatPrice(calculateOptionPrice(order))}</p>
            <p>{order.drink}</p>
            <small>{formatPrice(calculateCalories(order))} kcal</small>
          </div>
          <button type="button" className="edit-options" onClick={order.editOptions}>옵션수정</button>
        </section>

        <section className="price-breakdown">
          <span>주문 금액<b>{formatPrice(total)}</b></span><span>할인 금액<b>0</b></span><span>결제 한 금액<b>0</b></span><span className="grand">총 결제 금액<b>{formatPrice(total)}</b></span>
        </section>

        <section className="checkout-order-type">
          <p>선택하신 사항이 맞습니까?</p>
          <button type="button" className={order.orderType === 'dineIn' ? 'active' : ''} onClick={() => order.setOrderType('dineIn')}>✓ 매장</button>
          <button type="button" className={order.orderType === 'takeOut' ? 'active' : ''} onClick={() => order.setOrderType('takeOut')}>✓ 포장</button>
        </section>

        <section className="payment-methods" aria-label="결제수단 선택">
          {PAYMENT_METHODS.map((method) => (
            <button
              type="button"
              key={method.id}
              onClick={() => method.id === 'card' ? order.setScreen('payment') : showToast('시뮬레이션에서는 신용카드를 선택해주세요.')}
            >
              <b>{method.icon}</b><span>{method.label}</span>
            </button>
          ))}
        </section>
      </div>
    </main>
  )
}

function CardPaymentScreen({ order }) {
  const [remaining, setRemaining] = useState(28)

  useEffect(() => {
    if (remaining <= 0) return undefined
    const timeout = window.setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [remaining])

  const timedOut = remaining === 0
  return (
    <main className="card-payment-screen">
      <div className="payment-scroll">
        <h1>주문하실 내용이 맞나요?</h1>
        <section className="card-payment-panel">
          <header>신용카드 결제</header>
          <h2>신용카드를 투입구에 끝까지 넣으시고,<br />결제가 완료될 때 까지 빼지마세요.</h2>
          <p>삼성페이의 경우 신용카드 투입구에 스마트폰의 뒷면을 대주세요.</p>
          <div className="card-reader-area">
            <CardReaderArt />
            <div className="insert-card-modal">
              <h3>{timedOut ? '결제 시간이 초과되었습니다.' : '신용 카드를 삽입해주세요'}</h3>
              <div className="mini-card">CARD <span>➜</span></div>
              <p>◷ 남은시간 {remaining}초</p>
              <button type="button" onClick={() => order.setScreen('checkout')}>취소</button>
            </div>
          </div>
          {timedOut && <button type="button" className="timeout-return" onClick={() => order.setScreen('checkout')}>결제수단 다시 선택</button>}
          <div className="payment-actions">
            <button type="button" className="cancel" onClick={() => order.setScreen('checkout')}>취소</button>
            <button type="button" disabled={timedOut} onClick={() => order.setScreen('complete')}>결제하기</button>
          </div>
        </section>
      </div>
    </main>
  )
}

function CompleteScreen({ onHome }) {
  return (
    <main className="complete-screen">
      <div className="complete-check">✓</div>
      <h1>결제가 완료되었습니다.</h1>
      <p>실제 결제가 아닌 시연용 주문입니다.</p>
      <button type="button" onClick={onHome}>처음 화면으로</button>
    </main>
  )
}

function QuantityControl({ value, onMinus, onPlus, compact = false }) {
  return (
    <div className={`quantity-control ${compact ? 'compact' : ''}`} aria-label="수량 변경">
      <button type="button" onClick={onMinus} aria-label="수량 줄이기">−</button><b>{value}</b><button type="button" onClick={onPlus} aria-label="수량 늘리기">+</button>
    </div>
  )
}

function AccessibilityBar({ zoomed, highContrast, lowScreen, onHome, onZoom, onHighContrast, onLowScreen, onVoice, onStaff }) {
  const items = [
    { label: '처음으로', icon: '⌂', action: onHome },
    { label: '화면확대', icon: '⊕', action: onZoom, active: zoomed },
    { label: '고대비', icon: '◐', action: onHighContrast, active: highContrast },
    { label: '낮은화면', icon: '⇩', action: onLowScreen, active: lowScreen },
    { label: '음성안내', icon: '◖))', action: onVoice },
    { label: '직원호출', icon: '●', action: onStaff },
  ]
  return (
    <nav className="accessibility-bar" aria-label="접근성 메뉴">
      {items.map((item) => (
        <button type="button" key={item.label} onClick={item.action} className={item.active ? 'active' : ''} aria-pressed={item.active === undefined ? undefined : item.active}>
          <b>{item.icon}</b><span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

function FoodArt({ kind = 'set', tone = 'gold' }) {
  const colors = {
    red: '#e94118', 'deep-red': '#ae2717', orange: '#f5831f', gold: '#f5ad16', yellow: '#f2c94c', green: '#75a843', brown: '#8c4a2f', amber: '#ca7a22', gray: '#969696', cola: '#6a271b', zero: '#1b1b1b', clear: '#d8eff1', cream: '#f2ead5', none: '#f5f5f5',
  }
  const accent = colors[tone] ?? colors.gold

  if (kind === 'drink') {
    return <svg className="food-art" viewBox="0 0 120 90" aria-hidden="true"><path d="M39 14h42l-6 65H45z" fill={accent} stroke="#303030" strokeWidth="2" /><path d="M36 12h48" stroke="#303030" strokeWidth="4" strokeLinecap="round" /><circle cx="60" cy="44" r="16" fill="#f8f8f8" /><path d="M48 45c8-9 16 8 25-2" fill="none" stroke="#1853a3" strokeWidth="6" /></svg>
  }
  if (kind === 'sauce') {
    return <svg className="food-art" viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="30" rx="28" ry="12" fill="#ececec" /><path d="M32 30h56l-7 35c-2 10-40 10-42 0z" fill="#f7f7f7" stroke="#d0d0d0" />{tone !== 'none' && <ellipse cx="60" cy="31" rx="23" ry="8" fill={accent} />}{tone === 'none' && <path d="M47 45h26" stroke="#777" strokeWidth="4" />}</svg>
  }
  if (kind === 'chicken' || kind === 'side') {
    return <svg className="food-art" viewBox="0 0 120 90" aria-hidden="true">{[34, 52, 70, 87].map((x, index) => <g key={x} transform={`translate(${x} ${52 - (index % 2) * 12}) rotate(${index * 11})`}><ellipse rx="17" ry="12" fill={accent} stroke="#8c3e1e" strokeWidth="2" /><path d="M-9-2 7 5M-4-7 11 1" stroke="#ffd477" strokeWidth="2" opacity=".65" /></g>)}<ellipse cx="60" cy="72" rx="46" ry="6" fill="#d8d8d8" opacity=".6" /></svg>
  }
  if (kind === 'burger') {
    return <svg className="food-art" viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="70" rx="43" ry="6" fill="#d8d8d8" opacity=".6" /><path d="M27 39c3-23 63-27 68 0z" fill="#e5a23b" stroke="#9b5a22" strokeWidth="2" /><path d="M28 44c8 8 16-5 25 1s18-8 39 0" fill="none" stroke="#55a83f" strokeWidth="6" /><rect x="27" y="49" width="68" height="13" rx="6" fill={accent} /><path d="M31 61h58c5 0 7 3 5 7H27c-2-4 0-7 4-7z" fill="#e5a23b" stroke="#9b5a22" strokeWidth="2" /></svg>
  }
  return (
    <svg className={`food-art food-art-${kind}`} viewBox="0 0 180 120" aria-hidden="true">
      <g transform="translate(3 11) scale(.82)"><path d="M20 44c3-23 63-27 68 0z" fill="#e5a23b" stroke="#9b5a22" strokeWidth="2" /><path d="M21 49c8 8 16-5 25 1s18-8 39 0" fill="none" stroke="#55a83f" strokeWidth="6" /><rect x="21" y="55" width="67" height="13" rx="6" fill={accent} /><path d="M25 67h58c5 0 7 3 5 7H21c-2-4 0-7 4-7z" fill="#e5a23b" stroke="#9b5a22" strokeWidth="2" /></g>
      <g transform="translate(70 40)">{[20, 42, 62, 84].map((x, index) => <ellipse key={x} cx={x} cy={50 - (index % 2) * 13} rx="19" ry="13" fill={accent} stroke="#8c3e1e" strokeWidth="2" />)}</g>
      <g transform="translate(128 5) scale(.65)"><path d="M20 10h42l-6 65H26z" fill="#48251f" stroke="#303030" strokeWidth="2" /><circle cx="41" cy="42" r="15" fill="#f8f8f8" /><path d="M29 43c8-9 16 8 25-2" fill="none" stroke="#1853a3" strokeWidth="6" /></g><ellipse cx="91" cy="106" rx="75" ry="8" fill="#c9c9c9" opacity=".45" />
    </svg>
  )
}

function CardReaderArt() {
  return (
    <svg className="card-reader-art" viewBox="0 0 340 260" aria-hidden="true">
      <rect x="20" y="70" width="105" height="145" rx="16" fill="#f4f4f4" stroke="#c8c8c8" strokeWidth="4" /><rect x="49" y="100" width="42" height="28" rx="5" fill="#f0a500" /><path d="M49 114h42M63 100v28M78 100v28" stroke="#fff" strokeWidth="2" />
      <path d="M210 75h105v115H210z" fill="#3b3b3b" stroke="#202020" strokeWidth="5" /><rect x="225" y="105" width="70" height="13" rx="5" fill="#151515" /><circle cx="286" cy="91" r="8" fill="#41b76d" /><circle cx="266" cy="91" r="8" fill="#ee4b58" /><rect x="191" y="160" width="92" height="56" rx="7" fill="#1454d6" /><path d="M150 35v195M150 54h85" stroke="#111" strokeWidth="5" />
    </svg>
  )
}

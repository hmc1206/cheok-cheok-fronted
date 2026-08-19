import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DRINK_HIGHLIGHTS, KIOSK_SCREENS, SAUCE_HIGHLIGHTS } from '../data/kioskData'
import { canAddToCart, calculateTotalPrice, useKioskOrderStore } from '../store/kioskOrderStore'
import '../styles/kiosk.css'

const rectStyle = ({ x, y, width, height }) => ({
  left: `${x}%`,
  top: `${y}%`,
  width: `${width}%`,
  height: `${height}%`,
})

export function KioskLiveScreen() {
  const navigate = useNavigate()
  const order = useKioskOrderStore()
  const [toast, setToast] = useState('')
  const [accessibility, setAccessibility] = useState({ zoom: false, contrast: false, low: false })
  const swipeStartY = useRef(null)
  const screen = KIOSK_SCREENS[order.screen]
  const debugHotspots = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('debugHotspots') === '1'

  useEffect(() => {
    Array.from({ length: 13 }, (_, index) => `/assets/momstouch/${index + 1}.png`)
      .forEach((src) => {
        const image = new Image()
        image.src = src
      })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (order.screen === 6 && (event.key === 'ArrowDown' || event.key === 'PageDown')) {
        event.preventDefault()
        order.dispatch({ type: 'SCROLL_TO_DRINK_OPTIONS' })
      }
      if (order.screen === 7 && (event.key === 'ArrowUp' || event.key === 'PageUp')) {
        event.preventDefault()
        order.dispatch({ type: 'SCROLL_TO_BURGER_OPTIONS' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [order])

  const resetHome = () => {
    order.dispatch({ type: 'HOME' })
    setAccessibility({ zoom: false, contrast: false, low: false })
  }

  const speakGuide = () => {
    if (!('speechSynthesis' in window)) {
      setToast('이 브라우저는 음성안내를 지원하지 않습니다.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(screen.guide)
    utterance.lang = 'ko-KR'
    window.speechSynthesis.speak(utterance)
    setToast('현재 화면을 음성으로 안내합니다.')
  }

  const moveOptionScreen = (direction) => {
    if (direction > 0 && order.screen === 6) {
      if (order.selectedBurger !== '아라비아따치즈버거' || !order.burgerRequest) {
        setToast('먼저 버거 요청사항을 선택해주세요.')
        return
      }
      order.dispatch({ type: 'SCROLL_TO_DRINK_OPTIONS' })
    }
    if (direction < 0 && order.screen === 7) {
      order.dispatch({ type: 'SCROLL_TO_BURGER_OPTIONS' })
    }
  }

  const handleAction = (hotspot) => {
    switch (hotspot.action) {
      case 'HOME':
        resetHome()
        return
      case 'EXIT_SIMULATION':
        resetHome()
        navigate('/home')
        return
      case 'ACCESS_ZOOM':
        setAccessibility((state) => ({ ...state, zoom: !state.zoom }))
        return
      case 'ACCESS_CONTRAST':
        setAccessibility((state) => ({ ...state, contrast: !state.contrast }))
        return
      case 'ACCESS_LOW':
        setAccessibility((state) => ({ ...state, low: !state.low }))
        return
      case 'ACCESS_VOICE':
        speakGuide()
        return
      case 'ACCESS_STAFF':
        setToast('직원을 호출했습니다.')
        return
      case 'SET_LANGUAGE':
        setToast(`${hotspot.label}이 선택되었습니다.`)
        return
      case 'PAYMENT_UNAVAILABLE':
        setToast('이 결제수단은 시뮬레이션에서 지원하지 않습니다.')
        return
      case 'ADD_TO_CART':
        if (!canAddToCart(useKioskOrderStore.getState())) {
          setToast('아라비아따치즈버거, 요청-없음, 펩시콜라제로를 선택해주세요.')
          return
        }
        break
      case 'SELECT_ARABIATTA_REQUEST':
        order.dispatch({ type: hotspot.action, value: hotspot.value })
        setToast('아래로 스크롤해 음료를 선택해주세요.')
        return
      case 'SCROLL_TO_DRINK_OPTIONS':
        moveOptionScreen(1)
        return
      default:
        break
    }
    order.dispatch({ type: hotspot.action, value: hotspot.value })
  }

  const stageClasses = [
    'kiosk-stage-content',
    accessibility.zoom && 'is-zoomed',
    accessibility.contrast && 'is-high-contrast',
    accessibility.low && 'is-low-screen',
  ].filter(Boolean).join(' ')

  return (
    <main
      className="kiosk-image-page"
      aria-label="맘스터치 키오스크 주문 시뮬레이션"
      onWheel={(event) => {
        if (Math.abs(event.deltaY) > 12) moveOptionScreen(event.deltaY)
      }}
      onPointerDown={(event) => {
        swipeStartY.current = event.clientY
      }}
      onPointerUp={(event) => {
        if (swipeStartY.current === null) return
        const distance = swipeStartY.current - event.clientY
        swipeStartY.current = null
        if (Math.abs(distance) > 45) moveOptionScreen(distance)
      }}
    >
      <section
        className={stageClasses}
        data-debug-hotspots={debugHotspots || undefined}
        style={{ '--screen-ratio': screen.width / screen.height }}
      >
        <img
          className="kiosk-screen-image"
          src={`/assets/momstouch/${order.screen}.png`}
          width={screen.width}
          height={screen.height}
          alt={screen.alt}
          draggable="false"
        />

        {order.screen === 7 && order.selectedDrink !== '펩시콜라제로' && (
          <>
            <SelectionOverlay rect={DRINK_HIGHLIGHTS.펩시콜라제로} neutral />
            <SelectionOverlay rect={DRINK_HIGHLIGHTS[order.selectedDrink]} />
          </>
        )}
        {order.screen === 7 && order.selectedSauce !== '선택없음' && (
          <SelectionOverlay rect={SAUCE_HIGHLIGHTS[order.selectedSauce]} />
        )}

        <div className="kiosk-hotspot-layer">
          {screen.hotspots.map((hotspot) => (
            <button
              type="button"
              className="kiosk-hotspot"
              key={hotspot.id}
              style={rectStyle(hotspot)}
              aria-label={hotspot.label}
              data-testid={hotspot.id}
              onClick={() => handleAction(hotspot)}
            >
              <span>{hotspot.label}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="sr-only" aria-live="polite">
        화면 {order.screen}. {screen.guide} 현재 총액 {calculateTotalPrice(order).toLocaleString('ko-KR')}원.
      </p>
      {toast && <div className="kiosk-image-toast" role="status">{toast}</div>}
    </main>
  )
}

function SelectionOverlay({ rect, neutral = false }) {
  if (!rect) return null
  return (
    <div
      className={`kiosk-selection-overlay ${neutral ? 'is-neutral' : 'is-selected'}`}
      style={rectStyle(rect)}
      aria-hidden="true"
    />
  )
}

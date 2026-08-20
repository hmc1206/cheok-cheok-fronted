import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BURGER_HIGHLIGHTS,
  DRINK_HIGHLIGHTS,
  KIOSK_SCREENS,
  SAUCE_HIGHLIGHTS,
} from '../data/kioskData'
import {
  canConfirmGuide,
  getGuide,
  GUIDE_TOTAL_STEPS,
  nextGuideAfterAction,
  nextGuideAfterConfirm,
  recoverGuideId,
} from '../data/kioskGuideData'
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
  const [guideId, setGuideId] = useState('start')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [targetRect, setTargetRect] = useState(null)
  const stageRef = useRef(null)
  const swipeStartY = useRef(null)
  const lastSpokenGuideRef = useRef(null)
  const chickenSelectionLockedRef = useRef(false)
  const missingTargetRef = useRef(null)
  const screen = KIOSK_SCREENS[order.screen]
  const guide = getGuide(guideId, order)
  const footerTop = screen.hotspots.find((hotspot) => hotspot.id === 'home')?.y ?? 92
  const debugHotspots = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('debugHotspots') === '1'

  useEffect(() => {
    [...Array.from({ length: 11 }, (_, index) => index + 1), 14, 15]
      .map((screenNumber) => `/assets/momstouch/${screenNumber}.png`)
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
    setGuideId((current) => recoverGuideId(order, current))
  }, [order])

  useEffect(() => {
    if (guide.id !== 'step4') chickenSelectionLockedRef.current = false
  }, [guide.id])

  const speakText = useCallback((text, showUnsupportedToast = true) => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      if (showUnsupportedToast) setToast('이 브라우저는 음성안내를 지원하지 않습니다.')
      return false
    }

    window.speechSynthesis.cancel()
    const utterance = new window.SpeechSynthesisUtterance(text)
    const koreanVoice = window.speechSynthesis.getVoices()
      .find((voice) => voice.lang?.toLowerCase().startsWith('ko'))
    utterance.lang = 'ko-KR'
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.volume = 1
    if (koreanVoice) utterance.voice = koreanVoice
    window.speechSynthesis.speak(utterance)
    return true
  }, [])

  useEffect(() => {
    if (!ttsEnabled || order.simulationStatus === 'notStarted') return
    if (lastSpokenGuideRef.current === guide.id) return
    if (speakText(guide.message, false)) lastSpokenGuideRef.current = guide.id
  }, [guide.id, guide.message, order.simulationStatus, speakText, ttsEnabled])

  useEffect(() => {
    if (order.screen !== 10) return undefined

    const timeout = window.setTimeout(() => {
      const currentOrder = useKioskOrderStore.getState()
      if (currentOrder.screen !== 10) return
      setGuideId((current) => nextGuideAfterAction(
        current,
        'COMPLETE_CARD_PAYMENT',
        undefined,
        currentOrder,
      ))
      currentOrder.dispatch({ type: 'COMPLETE_CARD_PAYMENT' })
    }, 3000)

    return () => window.clearTimeout(timeout)
  }, [order.screen])

  useEffect(() => () => {
    window.speechSynthesis?.cancel()
  }, [])

  const moveOptionScreen = useCallback((direction) => {
    const currentOrder = useKioskOrderStore.getState()
    if (direction > 0 && currentOrder.screen === 5) {
      if (currentOrder.selectedBurger !== '아라비아따치즈버거' || !currentOrder.burgerRequest) {
        setToast('먼저 버거 요청사항을 선택해주세요.')
        return
      }
      currentOrder.dispatch({ type: 'SCROLL_TO_DRINK_OPTIONS' })
      setGuideId((current) => nextGuideAfterAction(current, 'SCROLL_TO_DRINK_OPTIONS', undefined, currentOrder))
    }
    if (direction < 0 && currentOrder.screen === 7) {
      currentOrder.dispatch({ type: 'SCROLL_TO_BURGER_OPTIONS' })
      setGuideId((current) => nextGuideAfterAction(current, 'SCROLL_TO_BURGER_OPTIONS', undefined, currentOrder))
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (order.screen === 5 && (event.key === 'ArrowDown' || event.key === 'PageDown')) {
        event.preventDefault()
        moveOptionScreen(1)
      }
      if (order.screen === 7 && (event.key === 'ArrowUp' || event.key === 'PageUp')) {
        event.preventDefault()
        moveOptionScreen(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveOptionScreen, order.screen])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !guide.targetId) {
      setTargetRect(null)
      return undefined
    }

    const updateTargetRect = () => {
      const target = stage.querySelector(`[data-guide-id="${guide.targetId}"]`)
      if (!target) {
        setTargetRect(null)
        if (missingTargetRef.current !== guide.targetId) {
          console.warn(`[kiosk-guide] 대상 요소를 찾지 못했습니다: ${guide.targetId}`)
          missingTargetRef.current = guide.targetId
        }
        return
      }

      setTargetRect({
        left: target.offsetLeft,
        top: target.offsetTop,
        bottom: target.offsetTop + target.offsetHeight,
        width: target.offsetWidth,
        height: target.offsetHeight,
        stageWidth: stage.clientWidth,
        stageHeight: stage.clientHeight,
      })
      missingTargetRef.current = null
    }

    updateTargetRect()
    const animationFrame = window.requestAnimationFrame(updateTargetRect)
    const transitionTimeout = window.setTimeout(updateTargetRect, 200)
    const resizeObserver = 'ResizeObserver' in window ? new window.ResizeObserver(updateTargetRect) : null
    resizeObserver?.observe(stage)
    window.addEventListener('resize', updateTargetRect)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(transitionTimeout)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateTargetRect)
    }
  }, [accessibility, guide.id, guide.targetId, order.screen])

  const resetGuide = (eventType) => {
    window.speechSynthesis?.cancel()
    lastSpokenGuideRef.current = null
    chickenSelectionLockedRef.current = false
    setGuideId('start')
    setTtsEnabled(false)
    setAccessibility({ zoom: false, contrast: false, low: false })
    order.dispatch({ type: eventType })
  }

  const handleAction = (hotspot) => {
    const currentOrder = useKioskOrderStore.getState()

    switch (hotspot.action) {
      case 'HOME':
        resetGuide('HOME')
        return
      case 'RESTART_SIMULATION':
        resetGuide('RESTART_SIMULATION')
        return
      case 'EXIT_SIMULATION':
        resetGuide('EXIT_SIMULATION')
        navigate('/home', { replace: true })
        return
      case 'START_SIMULATION':
        lastSpokenGuideRef.current = null
        setTtsEnabled(true)
        break
      case 'SELECT_CHICKEN':
        if (guideId !== 'step4' || chickenSelectionLockedRef.current) return
        chickenSelectionLockedRef.current = true
        window.speechSynthesis?.cancel()
        break
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
        if (currentOrder.simulationStatus === 'notStarted') {
          setToast('시뮬레이션을 시작한 뒤 음성 안내를 사용할 수 있습니다.')
          return
        }
        speakText(guide.message)
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
        if (!canAddToCart(currentOrder)) {
          setToast('아라비아따치즈버거, 요청-없음, 펩시콜라제로를 선택해주세요.')
          return
        }
        break
      case 'SELECT_ARABIATTA_REQUEST':
        if (hotspot.value === '요청-없음') setToast('아래로 스크롤해 음료를 선택해주세요.')
        break
      case 'SCROLL_TO_DRINK_OPTIONS':
        moveOptionScreen(1)
        return
      default:
        break
    }

    const nextGuideId = nextGuideAfterAction(
      guideId,
      hotspot.action,
      hotspot.value,
      currentOrder,
    )
    currentOrder.dispatch({ type: hotspot.action, value: hotspot.value })
    if (nextGuideId !== guideId) setGuideId(nextGuideId)
  }

  const handleGuideConfirm = () => {
    const currentOrder = useKioskOrderStore.getState()
    const nextGuideId = nextGuideAfterConfirm(guideId, currentOrder)
    if (nextGuideId === guideId) {
      setToast('주문 내용을 다시 확인해주세요.')
      return
    }
    setGuideId(nextGuideId)
  }

  const toggleTts = () => {
    if (ttsEnabled) {
      window.speechSynthesis?.cancel()
      setTtsEnabled(false)
      setToast('음성 안내를 껐습니다.')
      return
    }
    lastSpokenGuideRef.current = null
    setTtsEnabled(true)
    setToast('음성 안내를 켰습니다.')
  }

  const stageClasses = [
    'kiosk-stage-content',
    accessibility.zoom && 'is-zoomed',
    accessibility.contrast && 'is-high-contrast',
    accessibility.low && 'is-low-screen',
  ].filter(Boolean).join(' ')

  const targetMissing = Boolean(guide.targetId && !targetRect)
  const confirmDisabled = Boolean(guide.confirmLabel && !canConfirmGuide(guideId, order))

  return (
    <main
      className="kiosk-image-page"
      aria-label="맘스터치 키오스크 주문 시뮬레이션"
    >
      <section
        ref={stageRef}
        className={`${stageClasses} ${[5, 7].includes(order.screen) ? 'is-option-scrollable' : ''}`}
        data-debug-hotspots={debugHotspots || undefined}
        style={{ '--screen-ratio': screen.width / screen.height }}
        aria-label="키오스크 연습 화면"
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > 12) moveOptionScreen(event.deltaY)
        }}
        onPointerDown={(event) => {
          swipeStartY.current = event.clientY
        }}
        onPointerMove={(event) => {
          if (swipeStartY.current === null) return
          const distance = swipeStartY.current - event.clientY
          if (Math.abs(distance) <= 45) return
          swipeStartY.current = null
          moveOptionScreen(distance)
        }}
        onPointerUp={(event) => {
          if (swipeStartY.current === null) return
          const distance = swipeStartY.current - event.clientY
          swipeStartY.current = null
          if (Math.abs(distance) > 45) moveOptionScreen(distance)
        }}
        onPointerCancel={() => {
          swipeStartY.current = null
        }}
        onTouchStart={(event) => {
          swipeStartY.current = event.touches[0]?.clientY ?? null
        }}
        onTouchMove={(event) => {
          if (swipeStartY.current === null) return
          const currentY = event.touches[0]?.clientY
          if (currentY === undefined) return
          const distance = swipeStartY.current - currentY
          if (Math.abs(distance) <= 45) return
          swipeStartY.current = null
          moveOptionScreen(distance)
        }}
      >
        <img
          className="kiosk-screen-image"
          src={`/assets/momstouch/${order.screen}.png`}
          width={screen.width}
          height={screen.height}
          alt={screen.alt}
          draggable="false"
        />

        {[4, 6].includes(order.screen) && (
          <BurgerRequestTitle
            burger={order.pendingBurger || order.selectedBurger}
            screen={order.screen}
          />
        )}

        {order.screen === 5 && order.selectedBurger === '아라비아따치즈버거' && (
          <>
            <SelectionOverlay rect={BURGER_HIGHLIGHTS.싸이버거} neutral />
            <SelectionOverlay rect={BURGER_HIGHLIGHTS.아라비아따치즈버거} />
            <ScreenPatch
              source={{ x: 24.8, y: 73.6, width: 21.5, height: 11.8 }}
              target={{ x: 23.5, y: 75.8, width: 18.2, height: 10.8 }}
            />
            <ScreenPatch
              source={{ x: 28.6, y: 86.2, width: 28.6, height: 6.8 }}
              target={{ x: 29.7, y: 87.1, width: 29.7, height: 5.8 }}
            />
          </>
        )}

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
          {screen.hotspots.map((hotspot) => hotspot.guideOnly ? (
            <div
              className="kiosk-guide-anchor"
              key={hotspot.id}
              style={rectStyle(hotspot)}
              data-guide-id={hotspot.guideId}
              aria-hidden="true"
            />
          ) : (
            <button
              type="button"
              className="kiosk-hotspot"
              key={hotspot.id}
              style={rectStyle(hotspot)}
              aria-label={hotspot.label}
              data-guide-id={hotspot.guideId}
              data-testid={hotspot.id}
              onClick={() => handleAction(hotspot)}
            >
              <span>{hotspot.label}</span>
            </button>
          ))}
        </div>

        <TargetHighlight guide={guide} targetRect={targetRect} />
        <GuideDock
          guide={guide}
          targetMissing={targetMissing}
          ttsAvailable={order.simulationStatus !== 'notStarted'}
          ttsEnabled={ttsEnabled}
          zoomActive={accessibility.zoom}
          confirmDisabled={confirmDisabled}
          footerTop={footerTop}
          onConfirm={handleGuideConfirm}
          onHome={() => resetGuide('HOME')}
          onReplay={() => speakText(guide.message)}
          onToggleTts={toggleTts}
          onZoom={() => setAccessibility((state) => ({ ...state, zoom: !state.zoom }))}
        />
      </section>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {guide.message} 현재 총액 {calculateTotalPrice(order).toLocaleString('ko-KR')}원.
      </p>
      {toast && <div className="kiosk-image-toast" role="status">{toast}</div>}
    </main>
  )
}

function TargetHighlight({ guide, targetRect }) {
  if (!targetRect) return null
  const targetIsLow = targetRect.top + targetRect.height / 2 > targetRect.stageHeight / 2
  const arrowStyle = {
    left: `${Math.min(targetRect.stageWidth - 42, Math.max(42, targetRect.left + targetRect.width / 2))}px`,
    top: `${targetIsLow ? Math.max(8, targetRect.top - 58) : Math.min(targetRect.stageHeight - 62, targetRect.bottom + 8)}px`,
  }

  return (
    <div className="kiosk-target-guide-layer" aria-hidden="true">
      <div
        className="kiosk-guide-highlight"
        style={{
          left: `${targetRect.left - 6}px`,
          top: `${targetRect.top - 6}px`,
          width: `${targetRect.width + 12}px`,
          height: `${targetRect.height + 12}px`,
        }}
      />
      <div
        className={`kiosk-guide-arrow ${targetIsLow ? 'points-down' : 'points-up'}`}
        style={arrowStyle}
      >
        {guide.id === 'step7' ? '☝' : targetIsLow ? '↓' : '↑'}
      </div>
    </div>
  )
}

function GuideDock({
  guide,
  targetMissing,
  ttsAvailable,
  ttsEnabled,
  zoomActive,
  confirmDisabled,
  footerTop,
  onConfirm,
  onHome,
  onReplay,
  onToggleTts,
  onZoom,
}) {
  return (
    <aside
      className="kiosk-guide-dock"
      style={{ top: `${footerTop}%`, height: `${100 - footerTop}%` }}
      aria-label="고령자용 단계별 안내"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="kiosk-guide-copy">
        <strong className="kiosk-guide-step">
          {guide.step ? `STEP ${guide.step} / ${GUIDE_TOTAL_STEPS}` : guide.label}
        </strong>
        <p className="kiosk-guide-message">
          {targetMissing ? '안내 위치를 확인하고 있습니다.' : guide.message}
        </p>
      </div>
      <div className="kiosk-guide-actions">
        <button type="button" onClick={onHome} aria-label="처음 화면으로 돌아가기">
          <span aria-hidden="true">⌂</span> 처음
        </button>
        <button
          type="button"
          onClick={onZoom}
          aria-label={`화면 확대 ${zoomActive ? '끄기' : '켜기'}`}
          aria-pressed={zoomActive}
        >
          <span aria-hidden="true">＋</span> 확대
        </button>
        <button type="button" onClick={onReplay} disabled={!ttsAvailable} aria-label="현재 단계 음성 다시 듣기">
          <span aria-hidden="true">↻</span> 다시
        </button>
        <button
          type="button"
          onClick={onToggleTts}
          aria-label={`자동 음성 안내 ${ttsEnabled ? '끄기' : '켜기'}`}
          aria-pressed={ttsEnabled}
          disabled={!ttsAvailable}
        >
          <span aria-hidden="true">♪</span> 음성
        </button>
        {guide.confirmLabel && (
          <button
            type="button"
            className="kiosk-guide-confirm"
            onClick={onConfirm}
            disabled={confirmDisabled}
            aria-label={guide.confirmLabel}
          >
            {guide.confirmLabel}
          </button>
        )}
      </div>
    </aside>
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

function BurgerRequestTitle({ burger, screen }) {
  return (
    <div className={`kiosk-request-title is-screen-${screen}`}>
      -{burger}
    </div>
  )
}

function ScreenPatch({ source, target }) {
  return (
    <div className="kiosk-screen-patch" style={rectStyle(target)} aria-hidden="true">
      <img
        src="/assets/momstouch/7.png"
        alt=""
        style={{
          width: `${10000 / source.width}%`,
          height: `${10000 / source.height}%`,
          left: `${-100 * source.x / source.width}%`,
          top: `${-100 * source.y / source.height}%`,
        }}
      />
    </div>
  )
}

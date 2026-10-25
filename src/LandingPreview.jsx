import { useState, useEffect, useRef, useCallback } from 'react'
import './LandingPreview.css'

const SCENES = {
  normal: {
    key: 'normal',
    label: 'Typical Day',
    title: 'TYPICAL DAY',
    portions: '230 forecast portions',
    explanation: 'A steady lunch service. Demand follows the historical Saturday pattern.',
    videoSrc: '/videos/typical-day.mp4',
    posterSrc: '/videos/typical-day-poster.png',
    nextKey: 'rain',
    clipStart: 1.2,
    clipEnd: 8.8,
  },
  rain: {
    key: 'rain',
    label: 'Heavy Rain',
    title: 'HEAVY RAIN',
    portions: '184 forecast portions',
    explanation: 'Simulated demand falls by 20%. Reduced walk-ins expected across lunch service.',
    videoSrc: '/videos/heavy-rain.mp4',
    posterSrc: '/videos/heavy-rain-poster.png',
    nextKey: 'event',
    clipStart: 1.2,
    clipEnd: 8.8,
  },
  event: {
    key: 'event',
    label: 'Campus Festival',
    title: 'CAMPUS FESTIVAL',
    portions: '300 forecast portions',
    explanation: 'Simulated demand rises by 30%, with each dish rounded individually before summation.',
    videoSrc: '/videos/campus-festival.mp4',
    posterSrc: '/videos/campus-festival-poster.png',
    nextKey: 'normal',
    clipStart: 5.0,
    clipEnd: 8.0,
  },
}

export default function LandingPreview({ initialScenario = 'normal', onOpenDashboard }) {
  const [activeKey, setActiveKey] = useState(() => (SCENES[initialScenario] ? initialScenario : 'normal'))
  const [bgSlot, setBgSlot] = useState(0) // 0 or 1 indicates which persistent video slot is currently background
  const [slot0, setSlot0] = useState(() => ({
    scenarioKey: SCENES[initialScenario] ? initialScenario : 'normal',
    role: 'background', // 'background' | 'portal' | 'expanding' | 'standby'
  }))
  const [slot1, setSlot1] = useState(() => {
    const init = SCENES[initialScenario] ? initialScenario : 'normal'
    return {
      scenarioKey: SCENES[init].nextKey,
      role: 'portal',
    }
  })

  const [portalUIVisible, setPortalUIVisible] = useState(true)
  const [textAnimState, setTextAnimState] = useState('visible') // 'visible' | 'exiting' | 'entering'
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [videoError, setVideoError] = useState(false)

  // Reduced motion query
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  // DOM element references
  const heroRef = useRef(null)
  const portalAnchorRef = useRef(null)
  const slot0Ref = useRef(null)
  const slot1Ref = useRef(null)
  const isTransitioningRef = useRef(false)
  const transitionTargetKeyRef = useRef(null)
  const timersRef = useRef([])

  // Current active scene and single-source next scenario
  const currentScene = SCENES[activeKey] || SCENES.normal
  const portalSlotIndex = bgSlot === 0 ? 1 : 0
  const portalSlotState = portalSlotIndex === 0 ? slot0 : slot1
  const nextScenario = SCENES[portalSlotState.scenarioKey] || SCENES[currentScene.nextKey]

  // Clear timers helper
  const addTimer = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
    return id
  }

  // Measure actual hero and resting portal rectangles to calculate exact scale and translation
  const applyGeometryVars = useCallback(() => {
    if (!heroRef.current || !portalAnchorRef.current) return
    const heroRect = heroRef.current.getBoundingClientRect()
    const portalRect = portalAnchorRef.current.getBoundingClientRect()

    const heroW = heroRect.width
    const heroH = heroRect.height
    const pWidth = portalRect.width
    const pHeight = portalRect.height
    const pLeft = portalRect.left - heroRect.left
    const pTop = portalRect.top - heroRect.top
    const pRight = heroW - pLeft - pWidth
    const pBottom = heroH - pTop - pHeight

    // Uniform scale needed to place incoming video inside the portal
    const scale = Math.max(pWidth / heroW, pHeight / heroH)

    // Center translation from hero center to portal center
    const heroCenterX = heroW / 2
    const heroCenterY = heroH / 2
    const portalCenterX = pLeft + pWidth / 2
    const portalCenterY = pTop + pHeight / 2
    const tx = portalCenterX - heroCenterX
    const ty = portalCenterY - heroCenterY

    const el = heroRef.current
    el.style.setProperty('--portal-top', `${pTop}px`)
    el.style.setProperty('--portal-bottom', `${pBottom}px`)
    el.style.setProperty('--portal-left', `${pLeft}px`)
    el.style.setProperty('--portal-right', `${pRight}px`)
    el.style.setProperty('--portal-tx', `${tx}px`)
    el.style.setProperty('--portal-ty', `${ty}px`)
    el.style.setProperty('--portal-scale', `${scale}`)
  }, [])

  // Update geometry on mount, resize, and orientation change
  useEffect(() => {
    applyGeometryVars()
    window.addEventListener('resize', applyGeometryVars)
    return () => window.removeEventListener('resize', applyGeometryVars)
  }, [applyGeometryVars])

  // Watch reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReducedMotion(e.matches)
    if (mq.addEventListener) {
      mq.addEventListener('change', handler)
    } else {
      mq.addListener(handler)
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler)
      } else {
        mq.removeListener(handler)
      }
    }
  }, [])

  // Cleanup on unmount: pause both persistent video elements and clear timers
  useEffect(() => {
    const vid0 = slot0Ref.current
    const vid1 = slot1Ref.current
    const timers = timersRef.current

    return () => {
      timers.forEach((t) => clearTimeout(t))
      if (vid0) {
        try {
          vid0.pause()
        } catch {
          // ignore
        }
      }
      if (vid1) {
        try {
          vid1.pause()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // Initial playback start on mount
  const hasInitializedRef = useRef(false)
  useEffect(() => {
    if (reducedMotion || hasInitializedRef.current) return
    hasInitializedRef.current = true

    const playSlotSafe = (vid, scene) => {
      if (!vid || !scene) return
      vid.currentTime = scene.clipStart
      const p = vid.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {})
      }
    }

    if (slot0Ref.current && slot0.role === 'background') {
      playSlotSafe(slot0Ref.current, SCENES[slot0.scenarioKey])
    }
    if (slot1Ref.current && slot1.role === 'portal') {
      playSlotSafe(slot1Ref.current, SCENES[slot1.scenarioKey])
    }
  }, [reducedMotion, slot0.role, slot0.scenarioKey, slot1.role, slot1.scenarioKey])

  // Separate trim-loop handling: NEVER loop or seek during expansion
  const handleTimeUpdate = useCallback((e, slotId) => {
    if (reducedMotion) return
    const vid = e.target
    const slotState = slotId === 0 ? slot0 : slot1
    if (slotState.role === 'expanding') return

    const scene = SCENES[slotState.scenarioKey]
    if (!scene) return
    if (vid.currentTime >= scene.clipEnd) {
      vid.currentTime = scene.clipStart
    }
  }, [reducedMotion, slot0, slot1])

  // Finalize handoff upon animation completion (driven by transitionend event, not a fixed timeout)
  const completeHandoff = useCallback(() => {
    if (!isTransitioningRef.current) return
    const targetKey = transitionTargetKeyRef.current
    if (!targetKey) return

    const incomingSlotId = bgSlot === 0 ? 1 : 0
    const outgoingSlotId = bgSlot
    const outgoingRef = outgoingSlotId === 0 ? slot0Ref : slot1Ref

    // Pause outgoing slot retired underneath
    if (outgoingRef.current) {
      try {
        outgoingRef.current.pause()
      } catch {
        // ignore
      }
    }

    // Promote incoming slot to background without remounting or seeking
    setBgSlot(incomingSlotId)
    setActiveKey(targetKey)
    setTextAnimState('entering')

    if (incomingSlotId === 0) {
      setSlot0({ scenarioKey: targetKey, role: 'background' })
    } else {
      setSlot1({ scenarioKey: targetKey, role: 'background' })
    }

    // Prepare following preview scenario for the retired slot
    const nextUpcomingKey = SCENES[targetKey].nextKey
    const retiredSlotId = outgoingSlotId
    const retiredRef = outgoingRef

    if (retiredSlotId === 0) {
      setSlot0({ scenarioKey: nextUpcomingKey, role: 'standby' })
    } else {
      setSlot1({ scenarioKey: nextUpcomingKey, role: 'standby' })
    }

    // Reveal new text and prepare the next portal preview
    addTimer(() => {
      setTextAnimState('visible')

      if (retiredRef.current) {
        const nextSceneData = SCENES[nextUpcomingKey]
        retiredRef.current.currentTime = nextSceneData.clipStart
        const playPromise = retiredRef.current.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {})
        }
      }

      if (retiredSlotId === 0) {
        setSlot0({ scenarioKey: nextUpcomingKey, role: 'portal' })
      } else {
        setSlot1({ scenarioKey: nextUpcomingKey, role: 'portal' })
      }

      setPortalUIVisible(true)
      isTransitioningRef.current = false
      transitionTargetKeyRef.current = null
      setIsTransitioning(false)
    }, 200)
  }, [bgSlot])

  // Transitionend or animationend listener on expanding slot
  const handleTransitionEnd = useCallback((e) => {
    if (!isTransitioningRef.current) return
    // Ensure we trigger on clip-path/transform transition or keyframe animation completion
    if (
      e.propertyName === 'clip-path' ||
      e.propertyName === 'transform' ||
      e.animationName === 'expandClipper' ||
      e.animationName === 'expandVideo'
    ) {
      completeHandoff()
    }
  }, [completeHandoff])

  // Core transition initiator
  const triggerTransitionTo = useCallback((targetKey) => {
    if (isTransitioningRef.current || targetKey === activeKey) return
    isTransitioningRef.current = true
    transitionTargetKeyRef.current = targetKey
    setIsTransitioning(true)

    // Ensure geometry vars are fresh before animating
    applyGeometryVars()

    // Reduced motion path: immediate clean fade without portal expansion
    if (reducedMotion) {
      setTextAnimState('exiting')
      addTimer(() => {
        setActiveKey(targetKey)
        const nextNext = SCENES[targetKey].nextKey
        if (bgSlot === 0) {
          setSlot0({ scenarioKey: targetKey, role: 'background' })
          setSlot1({ scenarioKey: nextNext, role: 'portal' })
        } else {
          setSlot1({ scenarioKey: targetKey, role: 'background' })
          setSlot0({ scenarioKey: nextNext, role: 'portal' })
        }
        setTextAnimState('entering')
        addTimer(() => {
          setTextAnimState('visible')
          isTransitioningRef.current = false
          transitionTargetKeyRef.current = null
          setIsTransitioning(false)
        }, 150)
      }, 150)
      return
    }

    // Determine incoming slot
    const incomingSlotId = bgSlot === 0 ? 1 : 0
    const incomingRef = incomingSlotId === 0 ? slot0Ref : slot1Ref
    const incomingVid = incomingRef.current
    const targetScene = SCENES[targetKey]

    // Ensure playback headroom before expanding to avoid trim seek during expansion
    if (incomingVid && targetScene) {
      const remainingTime = targetScene.clipEnd - incomingVid.currentTime
      if (remainingTime < 2.0 || incomingVid.currentTime < targetScene.clipStart) {
        incomingVid.currentTime = targetScene.clipStart
      }
      const p = incomingVid.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }

    // Step 1: Hide portal UI overlay and begin fading outgoing text
    setPortalUIVisible(false)
    setTextAnimState('exiting')

    // Step 2: Set incoming slot to 'expanding' (clip-path and transform animate together)
    if (incomingSlotId === 0) {
      setSlot0((prev) => ({ ...prev, role: 'expanding' }))
    } else {
      setSlot1((prev) => ({ ...prev, role: 'expanding' }))
    }

    // Safety fallback timer (950ms) in case transitionend is missed
    addTimer(() => {
      if (isTransitioningRef.current) {
        completeHandoff()
      }
    }, 950)
  }, [activeKey, bgSlot, reducedMotion, applyGeometryVars, completeHandoff])

  // Direct scenario chip selection
  const handleDirectSelect = useCallback((key) => {
    if (key === activeKey || isTransitioningRef.current) return
    const incomingSlotId = bgSlot === 0 ? 1 : 0
    const incomingSetter = incomingSlotId === 0 ? setSlot0 : setSlot1
    const incomingRef = incomingSlotId === 0 ? slot0Ref : slot1Ref

    incomingSetter({ scenarioKey: key, role: 'portal' })

    if (incomingRef.current) {
      const sceneData = SCENES[key]
      incomingRef.current.currentTime = sceneData.clipStart
      const p = incomingRef.current.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }

    setTimeout(() => {
      triggerTransitionTo(key)
    }, 40)
  }, [activeKey, bgSlot, triggerTransitionTo])

  // Main portal button activation (cycles to nextScenario)
  const handleTriggerCycle = useCallback(() => {
    triggerTransitionTo(nextScenario.key)
  }, [triggerTransitionTo, nextScenario.key])

  return (
    <div className={`cinematic-landing-root ${reducedMotion ? 'reduced-motion' : ''}`}>
      {/* Top Header / Branding */}
      <header className="cinematic-topbar">
        <div className="brand-group">
          <span className="brand-mark" aria-hidden="true">♧</span>
          <div className="brand-text">
            <span className="brand-name">
              PreDict<span className="brand-light">-Chef</span>
            </span>
            <span className="brand-tagline">DEMAND INTELLIGENCE</span>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            id="open-dashboard-btn"
            className="btn-open-dashboard"
            onClick={() => onOpenDashboard(activeKey)}
          >
            <span>Open dashboard</span>
            <span className="btn-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      {/* Main Full-Height Hero */}
      <main
        ref={heroRef}
        className="cinematic-hero"
        role="region"
        aria-label="PredictChef Interactive Scenario Explorer"
      >
        {/* Persistent Video Slot 0 */}
        <div
          className={`slot-layer role-${slot0.role}`}
          onTransitionEnd={handleTransitionEnd}
          onAnimationEnd={handleTransitionEnd}
          aria-hidden="true"
        >
          {!reducedMotion ? (
            <video
              ref={slot0Ref}
              className="slot-video"
              src={SCENES[slot0.scenarioKey]?.videoSrc}
              poster={SCENES[slot0.scenarioKey]?.posterSrc}
              muted
              playsInline
              loop
              onTimeUpdate={(e) => handleTimeUpdate(e, 0)}
              onError={() => setVideoError(true)}
            />
          ) : (
            <img
              src={SCENES[slot0.scenarioKey]?.posterSrc}
              alt=""
              className="slot-poster-img"
            />
          )}
        </div>

        {/* Persistent Video Slot 1 */}
        <div
          className={`slot-layer role-${slot1.role}`}
          onTransitionEnd={handleTransitionEnd}
          onAnimationEnd={handleTransitionEnd}
          aria-hidden="true"
        >
          {!reducedMotion ? (
            <video
              ref={slot1Ref}
              className="slot-video"
              src={SCENES[slot1.scenarioKey]?.videoSrc}
              poster={SCENES[slot1.scenarioKey]?.posterSrc}
              muted
              playsInline
              loop
              onTimeUpdate={(e) => handleTimeUpdate(e, 1)}
              onError={() => setVideoError(true)}
            />
          ) : (
            <img
              src={SCENES[slot1.scenarioKey]?.posterSrc}
              alt=""
              className="slot-poster-img"
            />
          )}
        </div>

        {/* Light overall tint + concentrated lower-left text shading (Central emblem remains clear) */}
        <div className="hero-gradient-overlay" aria-hidden="true" />

        {/* Resting Portal Anchor in Bottom-Right (Caption above, footage clear, focusable) */}
        <div ref={portalAnchorRef} className="portal-anchor">
          {/* Caption immediately above the portal, leaving footage completely clear */}
          <div
            className={`portal-caption-above ${portalUIVisible ? 'is-visible' : 'is-hidden'}`}
            id="portal-caption-label"
          >
            <span className="caption-dot" aria-hidden="true" />
            <span className="caption-text">Next: {nextScenario.label}</span>
          </div>

          {/* Interactive portal frame button covering the resting aperture */}
          <button
            type="button"
            id="explore-scenario-btn"
            className={`portal-window-btn ${portalUIVisible ? 'is-visible' : 'is-hidden'}`}
            onClick={handleTriggerCycle}
            disabled={isTransitioning}
            aria-label={`Explore ${nextScenario.label}`}
            aria-describedby="portal-caption-label"
          >
            <span className="portal-sheen" aria-hidden="true" />
            <span className="portal-edge-glow" aria-hidden="true" />
          </button>
        </div>

        {/* Cleaner Foreground Content: Product Message, Substantial Title, Portions, Explanation, Direct Chips */}
        <div className={`hero-content-anchor ${textAnimState}`}>
          {/* Product Headline & Direct Scenario Selectors */}
          <div className="hero-product-block">
            <h2 className="hero-product-message">
              Prepare for demand. Before it arrives.
            </h2>

            {/* Accessible direct scenario selection chips */}
            <div className="scenario-direct-chips" role="group" aria-label="Direct scenario selection">
              {Object.values(SCENES).map((s) => {
                const isSelected = activeKey === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    id={`direct-scenario-${s.key}`}
                    className={`direct-chip-btn ${isSelected ? 'active' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={`Switch to ${s.label}`}
                    onClick={() => handleDirectSelect(s.key)}
                    disabled={isTransitioning || isSelected}
                  >
                    <span className="direct-chip-dot" aria-hidden="true" />
                    <span className="direct-chip-text">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Scenario Title, Forecast Pill, Explanation */}
          <div className="hero-title-block">
            <h1 className="hero-title" id="scenario-title">
              {currentScene.title}
            </h1>
            <div className="hero-forecast-pill" id="scenario-portions">
              <span className="forecast-val">{currentScene.portions}</span>
            </div>
            <p className="hero-explanation" id="scenario-explanation">
              {currentScene.explanation}
            </p>
          </div>
        </div>

        {/* Video failure notification */}
        {videoError && (
          <div className="video-fallback-banner" role="status">
            <span>Video playback unavailable · Static kitchen visual active</span>
          </div>
        )}
      </main>
    </div>
  )
}

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
  const [transitionState, setTransitionState] = useState('idle') // 'idle' | 'expanding' | 'repositioning'
  const [textAnimState, setTextAnimState] = useState('visible') // 'visible' | 'exiting' | 'entering'
  const [targetOverrideKey, setTargetOverrideKey] = useState(null)
  const [videoError, setVideoError] = useState(false)

  // Reduced motion query
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  // Single source of truth: nextScenario is derived strictly from activeKey (or active target override)
  const currentScene = SCENES[activeKey] || SCENES.normal
  const effectiveTargetKey = targetOverrideKey || currentScene.nextKey
  const nextScenario = SCENES[effectiveTargetKey] || SCENES.normal

  // Video refs
  const bgVideoRef = useRef(null)
  const portalVideoRef = useRef(null)
  const isTransitioningRef = useRef(false)
  const timersRef = useRef([])

  // Watch media query
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

  // Clear timers helper
  const addTimer = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
    return id
  }

  // Cleanup on unmount
  useEffect(() => {
    const bg = bgVideoRef.current
    const portal = portalVideoRef.current
    const timers = timersRef.current

    return () => {
      timers.forEach((t) => clearTimeout(t))
      if (bg) {
        try {
          bg.pause()
        } catch {
          // ignore
        }
      }
      if (portal) {
        try {
          portal.pause()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // Maintain smooth looping within safe range (skipping opening emblems/jumps and end-of-clip bunting loss)
  const handleTimeUpdate = useCallback((e, sceneKey) => {
    if (reducedMotion) return
    const vid = e.target
    const scene = SCENES[sceneKey]
    if (!scene) return
    if (vid.currentTime >= scene.clipEnd) {
      vid.currentTime = scene.clipStart
    }
  }, [reducedMotion])

  // Playback initialization when activeKey, targetOverrideKey or reducedMotion changes
  useEffect(() => {
    if (reducedMotion) {
      if (bgVideoRef.current) bgVideoRef.current.pause()
      if (portalVideoRef.current) portalVideoRef.current.pause()
      return
    }

    const playSafe = (vid, scene) => {
      if (!vid) return
      vid.currentTime = scene.clipStart
      const p = vid.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay was blocked or element not ready
        })
      }
    }

    playSafe(bgVideoRef.current, currentScene)
    playSafe(portalVideoRef.current, nextScenario)
  }, [activeKey, nextScenario, reducedMotion, currentScene])

  // Unified transition trigger to a given target key
  const executeTransitionTo = useCallback((destinationKey) => {
    if (isTransitioningRef.current || destinationKey === activeKey) return
    isTransitioningRef.current = true

    if (reducedMotion) {
      // Reduced motion: immediate/brief fade without portal expansion
      setTextAnimState('exiting')
      addTimer(() => {
        setActiveKey(destinationKey)
        setTargetOverrideKey(null)
        setTextAnimState('entering')
        addTimer(() => {
          setTextAnimState('visible')
          isTransitioningRef.current = false
        }, 150)
      }, 150)
      return
    }

    // Step 1: Start fading outgoing text and expanding portal
    setTextAnimState('exiting')
    setTransitionState('expanding')

    // Step 2: At 850ms, expansion covers the hero bounds fully with no exposed edges.
    // Commit the new active scene, title, and forecast together.
    addTimer(() => {
      const targetTime = portalVideoRef.current ? portalVideoRef.current.currentTime : 1.5
      setActiveKey(destinationKey)
      setTargetOverrideKey(null)
      setTextAnimState('entering')

      // Sync background video time to match portal video for seamless handoff
      if (bgVideoRef.current) {
        bgVideoRef.current.currentTime = targetTime
      }

      // Enter repositioning state: portal returns smoothly to resting position
      setTransitionState('repositioning')

      addTimer(() => {
        setTextAnimState('visible')
        setTransitionState('idle')
        isTransitioningRef.current = false
      }, 250)
    }, 850)
  }, [reducedMotion, activeKey])

  // Main portal button activation (cycles to currentScene.nextKey)
  const handleTriggerCycle = useCallback(() => {
    executeTransitionTo(effectiveTargetKey)
  }, [executeTransitionTo, effectiveTargetKey])

  // Direct scenario selector activation
  const handleDirectSelect = useCallback((key) => {
    if (key === activeKey || isTransitioningRef.current) return
    setTargetOverrideKey(key)
    // Small timeout to allow portalVideo to mount the target before expansion begins
    setTimeout(() => {
      executeTransitionTo(key)
    }, 30)
  }, [activeKey, executeTransitionTo])

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
      <main className="cinematic-hero" role="region" aria-label="PredictChef Interactive Scenario Explorer">
        {/* Background Layer: Current Scene Video & Poster */}
        <div className="hero-bg-layer" aria-hidden="true">
          {!reducedMotion ? (
            <video
              ref={bgVideoRef}
              key={`bg-${currentScene.key}`}
              className="bg-video"
              src={currentScene.videoSrc}
              poster={currentScene.posterSrc}
              muted
              playsInline
              autoPlay
              loop
              onTimeUpdate={(e) => handleTimeUpdate(e, currentScene.key)}
              onError={() => setVideoError(true)}
            />
          ) : (
            <img
              src={currentScene.posterSrc}
              alt=""
              className="bg-poster-img"
            />
          )}
          {/* Light overall tint + concentrated lower-left text shading */}
          <div className="hero-gradient-overlay" />
        </div>

        {/* Floating / Expanding Portal Preview (Taller, Window Area Position) */}
        <div
          className={`portal-container ${transitionState === 'expanding' ? 'is-expanding' : ''} ${
            transitionState === 'repositioning' ? 'is-repositioning' : ''
          }`}
          aria-live="polite"
        >
          <div className="portal-frame">
            {/* Incoming Video inside Portal */}
            <div className="portal-video-wrap">
              {!reducedMotion ? (
                <video
                  ref={portalVideoRef}
                  key={`portal-${nextScenario.key}`}
                  className="portal-video"
                  src={nextScenario.videoSrc}
                  poster={nextScenario.posterSrc}
                  muted
                  playsInline
                  autoPlay
                  loop
                  onTimeUpdate={(e) => handleTimeUpdate(e, nextScenario.key)}
                />
              ) : (
                <img
                  src={nextScenario.posterSrc}
                  alt=""
                  className="portal-poster-img"
                />
              )}
              <div className="portal-sheen" aria-hidden="true" />
            </div>

            {/* Portal Labels & Action derived strictly from ONE nextScenario value */}
            <div className="portal-meta">
              <span className="portal-badge">
                <span className="live-dot" aria-hidden="true" /> NEXT SCENE
              </span>
              <span className="portal-caption" id="portal-caption-label">
                Next: {nextScenario.label}
              </span>
            </div>

            {/* Accessible interactive button overlay covering the portal */}
            <button
              type="button"
              id="explore-scenario-btn"
              className="portal-action-btn"
              onClick={handleTriggerCycle}
              disabled={transitionState !== 'idle'}
              aria-label={`Explore ${nextScenario.label}`}
              aria-describedby="portal-caption-label"
            >
              <span className="portal-action-text">
                Explore {nextScenario.label}
              </span>
              <span className="portal-action-icon" aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Foreground Content: Prominent Product Message, Substantial Title, Portions, Explanation */}
        <div className={`hero-content-anchor ${textAnimState}`}>
          {/* Prominent Product Message Header & Direct Scenario Selectors */}
          <div className="hero-product-block">
            <div className="hero-badge-row">
              <span className="simulated-chip">
                <span className="sim-dot" aria-hidden="true">◉</span> Simulated demo
              </span>

              {/* Small accessible direct scenario selection controls */}
              <div className="scenario-direct-chips" role="group" aria-label="Direct scenario selection">
                {Object.values(SCENES).map((s) => {
                  const isCurrent = activeKey === s.key
                  return (
                    <button
                      key={s.key}
                      type="button"
                      id={`direct-scenario-${s.key}`}
                      className={`direct-chip-btn ${isCurrent ? 'active' : ''}`}
                      aria-pressed={isCurrent}
                      aria-label={`Switch to ${s.label}`}
                      onClick={() => handleDirectSelect(s.key)}
                      disabled={transitionState !== 'idle' || isCurrent}
                    >
                      <span className="direct-chip-dot" aria-hidden="true" />
                      <span className="direct-chip-text">{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <h2 className="hero-product-message">
              Prepare for demand. Before it arrives.
            </h2>
          </div>

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

          <div className="hero-footer-note">
            <span>Cycle through typical baseline, heavy rain and campus festival to preview kitchen demand adaptations.</span>
          </div>
        </div>

        {/* Video failure / fallback notification */}
        {videoError && (
          <div className="video-fallback-banner" role="status">
            <span>Video playback unavailable · Static kitchen visual active</span>
          </div>
        )}
      </main>
    </div>
  )
}

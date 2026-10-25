import { useState, useEffect, useRef, useCallback } from 'react'
import './LandingPreview.css'

const SCENES = {
  typical: {
    key: 'typical',
    label: 'Typical Day',
    title: 'TYPICAL DAY',
    portions: '230 forecast portions',
    explanation: 'A steady lunch service. Demand follows the historical Saturday pattern.',
    videoSrc: '/videos/typical-day.mp4',
    posterSrc: '/videos/typical-day-poster.png',
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
    clipStart: 1.2,
    clipEnd: 8.8,
  },
}

export default function LandingPreview({ onOpenDashboard }) {
  const [activeKey, setActiveKey] = useState('typical')
  const [transitionState, setTransitionState] = useState('idle') // 'idle' | 'expanding' | 'repositioning'
  const [textAnimState, setTextAnimState] = useState('visible') // 'visible' | 'exiting' | 'entering'
  const [videoError, setVideoError] = useState(false)

  // Reduced motion query
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  // Single source of truth: nextScenario is derived strictly from activeKey
  const currentScene = SCENES[activeKey]
  const nextScenarioKey = activeKey === 'typical' ? 'rain' : 'typical'
  const nextScenario = SCENES[nextScenarioKey]

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

  // Maintain smooth looping within safe range (skipping opening emblems/jumps)
  const handleTimeUpdate = useCallback((e, sceneKey) => {
    if (reducedMotion) return
    const vid = e.target
    const scene = SCENES[sceneKey]
    if (!scene) return
    if (vid.currentTime >= scene.clipEnd) {
      vid.currentTime = scene.clipStart
    }
  }, [reducedMotion])

  // Playback initialization when activeKey or reducedMotion changes
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
  }, [activeKey, reducedMotion, currentScene, nextScenario])

  // Trigger portal expansion transition
  const handleTriggerTransition = useCallback(() => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true

    if (reducedMotion) {
      // Reduced motion: immediate/brief fade without portal expansion
      setTextAnimState('exiting')
      addTimer(() => {
        setActiveKey(nextScenarioKey)
        setTextAnimState('entering')
        addTimer(() => {
          setTextAnimState('visible')
          isTransitioningRef.current = false
        }, 150)
      }, 150)
      return
    }

    // Step 1: Start fading outgoing text
    setTextAnimState('exiting')
    setTransitionState('expanding')

    // Step 2: At 850ms, expansion covers the hero.
    // Commit the new active scene, title, and forecast together.
    addTimer(() => {
      const targetTime = portalVideoRef.current ? portalVideoRef.current.currentTime : 1.5
      setActiveKey(nextScenarioKey)
      setTextAnimState('entering')

      // Sync background video time to match portal video for seamless handoff
      if (bgVideoRef.current) {
        bgVideoRef.current.currentTime = targetTime
      }

      // Enter repositioning state: portal returns to center-left and fades back in
      setTransitionState('repositioning')

      addTimer(() => {
        setTextAnimState('visible')
        setTransitionState('idle')
        isTransitioningRef.current = false
      }, 250)
    }, 850)
  }, [reducedMotion, nextScenarioKey])

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
            onClick={onOpenDashboard}
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
              onClick={handleTriggerTransition}
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
          {/* Prominent Product Message Header */}
          <div className="hero-product-block">
            <div className="hero-badge-row">
              <span className="simulated-chip">
                <span className="sim-dot" aria-hidden="true">◉</span> Simulated demo
              </span>
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
            <span>Toggle between typical baseline and rain scenario to preview kitchen demand adaptations.</span>
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

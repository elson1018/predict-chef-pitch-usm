import { useState, useEffect, useRef, useCallback } from 'react'
import './LandingPreview.css'

const SCENES = {
  typical: {
    key: 'typical',
    title: 'TYPICAL DAY',
    portions: '230 forecast portions',
    explanation: 'A steady lunch service. Demand follows the historical Saturday pattern.',
    videoSrc: '/videos/typical-day.mp4',
    posterSrc: '/videos/typical-day-poster.png',
    nextKey: 'rain',
    nextLabel: 'Heavy Rain',
    clipStart: 1.2,
    clipEnd: 8.8,
  },
  rain: {
    key: 'rain',
    title: 'HEAVY RAIN',
    portions: '184 forecast portions',
    explanation: 'Simulated demand falls by 20%. Reduced walk-ins expected across lunch service.',
    videoSrc: '/videos/heavy-rain.mp4',
    posterSrc: '/videos/heavy-rain-poster.png',
    nextKey: 'typical',
    nextLabel: 'Typical Day',
    clipStart: 1.2,
    clipEnd: 8.8,
  },
}

export default function LandingPreview({ onOpenDashboard }) {
  const [activeKey, setActiveKey] = useState('typical')
  const [transitionState, setTransitionState] = useState('idle') // 'idle' | 'expanding' | 'settling'
  const [textAnimState, setTextAnimState] = useState('visible') // 'visible' | 'exiting' | 'entering'
  const [videoError, setVideoError] = useState(false)

  // Reduced motion query
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  const currentScene = SCENES[activeKey]
  const nextScene = SCENES[currentScene.nextKey]

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
    playSafe(portalVideoRef.current, nextScene)
  }, [activeKey, reducedMotion, currentScene, nextScene])

  // Trigger portal expansion transition
  const handleTriggerTransition = useCallback(() => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true

    if (reducedMotion) {
      // Reduced motion: immediate/brief fade without portal expansion
      setTextAnimState('exiting')
      addTimer(() => {
        setActiveKey(currentScene.nextKey)
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

    // Step 2: At 850ms, commit the next scene
    addTimer(() => {
      setActiveKey(currentScene.nextKey)
      setTransitionState('settling')
      setTextAnimState('entering')

      // Step 3: At 1100ms, settle into idle and reveal new text
      addTimer(() => {
        setTransitionState('idle')
        setTextAnimState('visible')
        isTransitioningRef.current = false
      }, 250)
    }, 850)
  }, [reducedMotion, currentScene])

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
          {/* Subtle gradient vignette to guarantee contrast while keeping chef clear */}
          <div className="hero-gradient-overlay" />
        </div>

        {/* Floating / Expanding Portal Preview */}
        <div
          className={`portal-container ${transitionState === 'expanding' ? 'is-expanding' : ''} ${
            transitionState === 'settling' ? 'is-settling' : ''
          }`}
          aria-live="polite"
        >
          <div className="portal-frame">
            {/* Incoming Video inside Portal */}
            <div className="portal-video-wrap">
              {!reducedMotion ? (
                <video
                  ref={portalVideoRef}
                  key={`portal-${nextScene.key}`}
                  className="portal-video"
                  src={nextScene.videoSrc}
                  poster={nextScene.posterSrc}
                  muted
                  playsInline
                  autoPlay
                  loop
                  onTimeUpdate={(e) => handleTimeUpdate(e, nextScene.key)}
                />
              ) : (
                <img
                  src={nextScene.posterSrc}
                  alt=""
                  className="portal-poster-img"
                />
              )}
              <div className="portal-sheen" aria-hidden="true" />
            </div>

            {/* Portal Labels & Action */}
            <div className="portal-meta">
              <span className="portal-badge">
                <span className="live-dot" aria-hidden="true" /> NEXT SCENE
              </span>
              <span className="portal-caption" id="portal-caption-label">
                Next: {nextScene.nextLabel || nextScene.title}
              </span>
            </div>

            {/* Accessible interactive button overlay covering the portal */}
            <button
              type="button"
              id="explore-scenario-btn"
              className="portal-action-btn"
              onClick={handleTriggerTransition}
              disabled={transitionState !== 'idle'}
              aria-label={`Explore ${nextScene.nextLabel || nextScene.title}`}
              aria-describedby="portal-caption-label"
            >
              <span className="portal-action-text">
                Explore {nextScene.nextLabel || nextScene.title}
              </span>
              <span className="portal-action-icon" aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Foreground Content: Intro Copy, Title, Portions, Explanation */}
        <div className={`hero-content-anchor ${textAnimState}`}>
          <div className="hero-badge-row">
            <span className="simulated-chip">
              <span className="sim-dot" aria-hidden="true">◉</span> Simulated demo
            </span>
            <span className="intro-copy">Prepare for demand. Before it arrives.</span>
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

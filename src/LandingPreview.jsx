import { useState, useEffect, useCallback } from 'react'
import './LandingPreview.css'

const SCENARIOS = ['normal', 'rain', 'event']

const SCENARIO_VIDEOS = {
  normal: '/videos/typical-day.mp4',
  rain: '/videos/heavy-rain.mp4',
  event: '/videos/campus-festival.mp4',
}

const SCENARIO_META = {
  normal: {
    key: 'normal',
    label: 'Typical Day',
    headline: 'TYPICAL DAY',
    title: 'Typical Day',
    portions: '230',
    description: 'A steady lunch service. Demand follows the historical Saturday pattern.',
  },
  rain: {
    key: 'rain',
    label: 'Heavy Rain',
    headline: 'HEAVY RAIN',
    title: 'Heavy Rain',
    portions: '184',
    description: 'Simulated demand falls by 20%. Reduced walk-ins expected across lunch service.',
  },
  event: {
    key: 'event',
    label: 'Campus Festival',
    headline: 'CAMPUS FESTIVAL',
    title: 'Campus Festival',
    portions: '300',
    description: 'Simulated demand rises by 30%, with each dish rounded individually before summation.',
  },
}

export default function LandingPreview({
  initialScenario = 'normal',
  onOpenDashboard,
  onEnterDashboard,
}) {
  const [activeScenario, setActiveScenario] = useState(() =>
    SCENARIOS.includes(initialScenario) ? initialScenario : 'normal'
  )

  const getNextScenario = (current) =>
    SCENARIOS[(SCENARIOS.indexOf(current) + 1) % SCENARIOS.length]

  const [incomingScenario, setIncomingScenario] = useState(() =>
    getNextScenario(initialScenario || 'normal')
  )

  // phase: 'idle' | 'expanding' | 'resetting'
  const [phase, setPhase] = useState('idle')
  const [isPortalHovered, setIsPortalHovered] = useState(false)

  // Reduced motion safeguard
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

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

  // Exact 3-phase transition initiator
  const triggerScenarioTransition = useCallback((targetKey) => {
    if (phase !== 'idle' || targetKey === activeScenario) return

    setIncomingScenario(targetKey)
    setIsPortalHovered(false)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('expanding')
      })
    })
  }, [phase, activeScenario])

  // Exact handoff sequence: 900ms expanding -> 50ms resetting -> idle
  useEffect(() => {
    if (phase === 'expanding') {
      const duration = reducedMotion ? 50 : 900
      const expandTimer = setTimeout(() => {
        setActiveScenario(incomingScenario)
        setIncomingScenario(getNextScenario(incomingScenario))
        setPhase('resetting')
      }, duration)
      return () => clearTimeout(expandTimer)
    }

    if (phase === 'resetting') {
      const resetTimer = setTimeout(() => {
        setPhase('idle')
      }, 50)
      return () => clearTimeout(resetTimer)
    }
  }, [phase, incomingScenario, reducedMotion])

  const handleDashboard = () => {
    if (onEnterDashboard) onEnterDashboard(activeScenario)
    else if (onOpenDashboard) onOpenDashboard(activeScenario)
  }

  return (
    <div
      className={`landing-viewport phase-${phase} ${isPortalHovered ? 'portal-hovered' : ''} ${
        reducedMotion ? 'reduced-motion' : ''
      }`}
    >
      {/* 1. PERSISTENT 3-VIDEO POOL (Zero src swapping, zero frame drops) */}
      {SCENARIOS.map((key) => {
        const isBg = key === activeScenario
        const isPortal = key === incomingScenario
        const roleClass = isBg
          ? 'video-role-bg'
          : isPortal
          ? 'video-role-portal'
          : 'video-role-standby'

        return (
          <div
            key={key}
            className={`scene-video-layer ${roleClass}`}
            onClick={isPortal ? () => triggerScenarioTransition(incomingScenario) : undefined}
            onMouseEnter={isPortal ? () => setIsPortalHovered(true) : undefined}
            onMouseLeave={isPortal ? () => setIsPortalHovered(false) : undefined}
          >
            <video
              src={SCENARIO_VIDEOS[key]}
              autoPlay
              loop
              muted
              playsInline
              className="scene-video-media"
            />
          </div>
        )
      })}

      {/* 2. PORTAL CHROME OVERLAY (Border, Shadow, and Inner Pill - sits exactly over resting portal coordinates) */}
      <button
        type="button"
        className="portal-chrome-hitbox"
        onClick={() => triggerScenarioTransition(incomingScenario)}
        onMouseEnter={() => setIsPortalHovered(true)}
        onMouseLeave={() => setIsPortalHovered(false)}
        aria-label={`Switch to ${SCENARIO_META[incomingScenario].title}`}
      >
        <span className="portal-inner-badge">
          <span className="sparkle">✦</span> Next · {SCENARIO_META[incomingScenario].label}
        </span>
        <span className="portal-inner-arrow" aria-hidden="true">
          ↗
        </span>
      </button>

      {/* 3. TOP NAVIGATION BAR (Frosted pills so bunting never collides with text) */}
      <header className="landing-topbar">
        <div className="brand-frosted-pill">
          <span className="brand-logo-mark">♧</span>
          <div>
            <strong>
              PreDict<span>-Chef</span>
            </strong>
            <small>DEMAND INTELLIGENCE</small>
          </div>
        </div>
        <button
          type="button"
          className="open-dashboard-pill"
          onClick={handleDashboard}
        >
          Open dashboard <span>↗</span>
        </button>
      </header>

      {/* 4. BOTTOM-LEFT EDITORIAL STACK (Anchored strictly inside dark counter zone) */}
      <div className="landing-editorial-stack">
        {/* Persistent Scenario Switcher Pills */}
        <div className="landing-scenario-pills" role="group" aria-label="Scenario switcher">
          {SCENARIOS.map((key) => (
            <button
              key={key}
              type="button"
              className={`landing-pill-btn ${activeScenario === key ? 'active' : ''}`}
              onClick={() => triggerScenarioTransition(key)}
            >
              <span className="dot" /> {SCENARIO_META[key].label}
            </button>
          ))}
        </div>

        {/* Animated Text Block (Keyed or class-driven by phase) */}
        <div className="editorial-text-motion">
          <p className="editorial-eyebrow">Prepare for demand. Before it arrives.</p>
          <h1 className="editorial-headline">{SCENARIO_META[activeScenario].headline}</h1>
          <div className="editorial-badge-row">
            <span className="editorial-portion-badge">
              {SCENARIO_META[activeScenario].portions} forecast portions
            </span>
          </div>
          <p className="editorial-description">{SCENARIO_META[activeScenario].description}</p>
        </div>
      </div>
    </div>
  )
}

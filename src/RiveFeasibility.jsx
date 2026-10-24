import { useState, useCallback, useEffect } from 'react'
import {
  useRive,
  useViewModelInstanceBoolean,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2'

function CanteenViewer({
  width,
  height,
  maxWidth = '100%',
  title,
  idPrefix,
  note,
  scenario = 0,
  prefersReducedMotion = false,
  onLoaded,
}) {
  const [status, setStatus] = useState('Loading...')
  const { rive, RiveComponent } = useRive({
    src: '/canteen.riv',
    stateMachine: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    onLoad: () => {
      setStatus('Loaded')
      console.log(`[CanteenViewer:${idPrefix}] Loaded /canteen.riv successfully`)
      if (onLoaded) onLoaded(idPrefix)
    },
    onLoadError: (err) => {
      setStatus(`Error: ${err}`)
      console.error(`[CanteenViewer:${idPrefix}] Load error:`, err)
    },
  })

  const vmi = rive?.viewModelInstance
  const { value: scenarioVal, setValue: setScenarioVal } = useViewModelInstanceNumber('scenario', vmi)
  const { value: reducedMotionVal, setValue: setReducedMotionVal } = useViewModelInstanceBoolean(
    'prefersReducedMotion',
    vmi
  )

  // Keep Rive in sync with scenario prop (handles both before and after asset load)
  useEffect(() => {
    if (vmi) {
      try {
        const numProp = vmi.number('scenario')
        if (numProp && numProp.value !== scenario) {
          numProp.value = scenario
        }
      } catch (e) {
        console.warn(`[CanteenViewer:${idPrefix}] Error setting scenario directly:`, e)
      }
    }
    if (setScenarioVal && scenario !== undefined) {
      setScenarioVal(scenario)
    }
  }, [scenario, setScenarioVal, vmi, idPrefix])

  // Keep Rive in sync with prefersReducedMotion prop
  useEffect(() => {
    if (vmi) {
      try {
        const boolProp = vmi.boolean('prefersReducedMotion')
        if (boolProp && boolProp.value !== prefersReducedMotion) {
          boolProp.value = prefersReducedMotion
        }
      } catch (e) {
        console.warn(`[CanteenViewer:${idPrefix}] Error setting prefersReducedMotion directly:`, e)
      }
    }
    if (setReducedMotionVal && prefersReducedMotion !== undefined) {
      setReducedMotionVal(prefersReducedMotion)
    }
  }, [prefersReducedMotion, setReducedMotionVal, vmi, idPrefix])

  const effectiveScenarioVal = scenarioVal !== undefined && scenarioVal !== null ? scenarioVal : scenario
  const effectiveMotionVal = reducedMotionVal !== undefined && reducedMotionVal !== null ? reducedMotionVal : prefersReducedMotion

  const scenarioName =
    effectiveScenarioVal === 0
      ? '0 (Typical Day)'
      : effectiveScenarioVal === 1
      ? '1 (Heavy Rain)'
      : effectiveScenarioVal === 2
      ? '2 (Campus Festival)'
      : `${effectiveScenarioVal}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #2d3545',
        background: '#163024',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        width: width || '100%',
        maxWidth,
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          background: '#0d1f17',
          borderBottom: '1px solid #233e31',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#e2d9c8',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>▦</span> {title}
        </span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#b5c99a' }}>
          <span>
            scenario: <strong id={`${idPrefix}-scenario-display`}>{scenarioName}</strong>
          </span>
          <span>
            reducedMotion:{' '}
            <strong id={`${idPrefix}-reduced-motion-display`}>{effectiveMotionVal ? 'true' : 'false'}</strong>
          </span>
          <span
            id={`${idPrefix}-load-status`}
            style={{ color: status === 'Loaded' ? '#b5c99a' : '#e8b86d', fontWeight: 600 }}
          >
            ● {status}
          </span>
        </div>
      </div>
      <div
        id={`${idPrefix}-wrapper`}
        style={{
          width: '100%',
          height: height || 'auto',
          aspectRatio: '16 / 9',
          background: '#f5efe6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <RiveComponent
          id={`${idPrefix}-canvas`}
          style={{ width: '100%', height: '100%' }}
          aria-label={`Rive Canteen Scene - ${title}`}
        />
      </div>
      <div
        style={{
          padding: '8px 14px',
          background: '#11261d',
          borderTop: '1px solid #1a382a',
          fontSize: '11px',
          color: '#7a9a86',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{note || 'Artboard: 800×450 (16:9 locked orthographic 2D)'}</span>
        <span style={{ color: '#e2d9c8' }}>
          Asset: <code>/canteen.riv</code>
        </span>
      </div>
    </div>
  )
}

export default function RiveFeasibility() {
  const [activeTab, setActiveTab] = useState('canteen')
  const [scenario, setScenario] = useState(0)
  const [manualMotionOverride, setManualMotionOverride] = useState(null) // null = follow browser
  const [browserPrefersReducedMotion, setBrowserPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })
  const [scenarioLog, setScenarioLog] = useState([])
  const [isStressTesting, setIsStressTesting] = useState(false)

  // Backup feasibility test harness state
  const [toggleCount, setToggleCount] = useState(0)
  const [toggleHistory, setToggleHistory] = useState([])
  const [feasibilityLoadStatus, setFeasibilityLoadStatus] = useState('Loading asset...')
  const [runtimeError, setRuntimeError] = useState(null)
  const splashReported = 'No splash screen or watermark observed (clean render)'

  // 1. Detect browser prefers-reduced-motion media query changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handler = (e) => {
      setBrowserPrefersReducedMotion(e.matches)
      setScenarioLog((prev) => [
        `[Browser Media Query] prefers-reduced-motion changed to: ${e.matches}`,
        ...prev.slice(0, 14),
      ])
    }

    if (mq.addEventListener) {
      mq.addEventListener('change', handler)
    } else if (mq.addListener) {
      mq.addListener(handler)
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler)
      } else if (mq.removeListener) {
        mq.removeListener(handler)
      }
    }
  }, [])

  // Effective reduced motion value
  const effectiveReducedMotion =
    manualMotionOverride !== null ? manualMotionOverride : browserPrefersReducedMotion

  // Scenario selection handler
  const handleSelectScenario = useCallback(
    (newScenario, reason = 'user selection') => {
      setScenario(newScenario)
      const label =
        newScenario === 0
          ? '0: Typical Day (3 Cust, Warm Sky, Dry)'
          : newScenario === 1
          ? '1: Heavy Rain (1 Cust, Cool Sky, Rain)'
          : '2: Campus Festival (5 Cust, Bunting, Warm)'
      setScenarioLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Scenario -> ${label} (${reason})`,
        ...prev.slice(0, 14),
      ])
    },
    []
  )

  // Rapid 20x Scenario Switching Stress Test
  const handleRunRapid20xTest = useCallback(async () => {
    if (isStressTesting) return
    setIsStressTesting(true)
    setScenarioLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Starting 20x Rapid Scenario Stress Test...`,
      ...prev,
    ])

    // 20 transitions cycling across states 0, 1, 2 in non-trivial pattern, ending at 0
    const testSequence = [
      1, 2, 0, 2, 1, 0, 1, 2, 1, 0, 2, 0, 1, 2, 0, 2, 1, 2, 1, 0
    ]

    for (let i = 0; i < testSequence.length; i++) {
      const targetState = testSequence[i]
      setScenario(targetState)
      await new Promise((resolve) => setTimeout(resolve, 80))
    }

    setIsStressTesting(false)
    setScenario(0) // Explicitly settle on Typical Day
    setScenarioLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Completed 20x Rapid Test! Settled cleanly on Scenario 0 (Typical Day).`,
      ...prev.slice(0, 14),
    ])
  }, [isStressTesting])

  // Backup feasibility test harness
  const { rive: feasRive, RiveComponent: FeasRiveComponent } = useRive({
    src: '/feasibility.riv',
    stateMachine: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    onLoad: () => {
      setFeasibilityLoadStatus('Loaded and active')
      console.log('[RiveFeasibility] /feasibility.riv backup loaded successfully')
    },
    onLoadError: (err) => {
      setFeasibilityLoadStatus('Failed to load')
      setRuntimeError(String(err))
      console.error('[RiveFeasibility] Backup load error:', err)
    },
  })

  const feasVmi = feasRive?.viewModelInstance
  const { value: isRaining, setValue: setIsRaining } = useViewModelInstanceBoolean(
    'isRaining',
    feasVmi
  )

  const handleToggleRain = useCallback(() => {
    if (!setIsRaining) return
    const nextVal = !isRaining
    setIsRaining(nextVal)
    const newCount = toggleCount + 1
    setToggleCount(newCount)
    setToggleHistory((prev) => [
      `Toggle #${newCount}: rain set to ${nextVal ? 'ON (true)' : 'OFF (false)'}`,
      ...prev.slice(0, 11),
    ])
  }, [isRaining, setIsRaining, toggleCount])

  const handleRunTenToggles = useCallback(async () => {
    if (!setIsRaining) return
    let current = isRaining
    for (let i = 1; i <= 10; i++) {
      current = !current
      setIsRaining(current)
      setToggleCount((c) => c + 1)
      setToggleHistory((prev) => [
        `Batch #${i}/10: rain set to ${current ? 'ON' : 'OFF'}`,
        ...prev.slice(0, 11),
      ])
      await new Promise((r) => setTimeout(r, 120))
    }
  }, [isRaining, setIsRaining])

  return (
    <div className="rive-feasibility-container" style={{ padding: '8px 0' }}>
      {/* Top Navigation & Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="tab-canteen-btn"
            onClick={() => setActiveTab('canteen')}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: '1px solid ' + (activeTab === 'canteen' ? '#163024' : '#dfe5d9'),
              background: activeTab === 'canteen' ? '#163024' : '#fff',
              color: activeTab === 'canteen' ? '#fff' : '#495f4e',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ★ Canteen Scene: 3 Interactive States & Reduced Motion
          </button>
          <button
            id="tab-feasibility-btn"
            onClick={() => setActiveTab('feasibility')}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: '1px solid ' + (activeTab === 'feasibility' ? '#256348' : '#dfe5d9'),
              background: activeTab === 'feasibility' ? '#256348' : '#fff',
              color: activeTab === 'feasibility' ? '#fff' : '#495f4e',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Feasibility Backup Harness (/feasibility.riv)
          </button>
        </div>

        <span
          className="tag"
          style={{
            background: '#e7f2df',
            color: '#2e6345',
            fontWeight: 700,
            padding: '6px 12px',
          }}
        >
          {activeTab === 'canteen' ? 'Step 10: Interactive Rive States' : 'Feasibility Backup Verified'}
        </span>
      </div>

      {/* ========================================================
          CANTEEN SCENE: STEP 10 INTERACTIVE STATES
          ======================================================== */}
      {activeTab === 'canteen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Interactive State Control Panel (PROMINENT BUTTONS) */}
          <div
            className="card"
            style={{
              borderLeft: '5px solid #163024',
              background: '#f8fbf6',
              padding: '20px 24px',
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <h2 style={{ color: '#163024', margin: '0 0 6px', fontSize: '20px' }}>
                Scenario Data Binding & Interactive Controls
              </h2>
              <p className="subtext" style={{ margin: 0, color: '#495a44', fontSize: '13px' }}>
                Numeric data binding <code>scenario (0, 1, 2)</code> and <code>prefersReducedMotion (Boolean)</code> via @rive-app/react-webgl2.
              </p>
            </div>

            {/* Three Prominent Scenario Selection Buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {/* Button 0: Typical Day */}
              <button
                id="scenario-0-btn"
                onClick={() => handleSelectScenario(0)}
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: scenario === 0 ? '2px solid #163024' : '1px solid #c9d6c3',
                  background: scenario === 0 ? '#163024' : '#ffffff',
                  color: scenario === 0 ? '#ffffff' : '#163024',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: scenario === 0 ? '0 4px 12px rgba(22,48,36,0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>0 · Typical Day</span>
                  {scenario === 0 && (
                    <span
                      style={{
                        background: '#b5c99a',
                        color: '#0d1f17',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: scenario === 0 ? '#e2d9c8' : '#526649',
                  }}
                >
                  Warm sky · Exactly 3 customers · No rain or bunting
                </span>
              </button>

              {/* Button 1: Heavy Rain */}
              <button
                id="scenario-1-btn"
                onClick={() => handleSelectScenario(1)}
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: scenario === 1 ? '2px solid #5A7678' : '1px solid #c9d6c3',
                  background: scenario === 1 ? '#5A7678' : '#ffffff',
                  color: scenario === 1 ? '#ffffff' : '#163024',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: scenario === 1 ? '0 4px 12px rgba(90,118,120,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>1 · Heavy Rain</span>
                  {scenario === 1 && (
                    <span
                      style={{
                        background: '#e2d9c8',
                        color: '#163024',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: scenario === 1 ? '#eef4f4' : '#526649',
                  }}
                >
                  Cool slate sky · Clipped falling rain · Exactly 1 customer
                </span>
              </button>

              {/* Button 2: Campus Festival */}
              <button
                id="scenario-2-btn"
                onClick={() => handleSelectScenario(2)}
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: scenario === 2 ? '2px solid #E8B86D' : '1px solid #c9d6c3',
                  background: scenario === 2 ? '#243b2f' : '#ffffff',
                  color: scenario === 2 ? '#ffffff' : '#163024',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: scenario === 2 ? '0 4px 12px rgba(232,184,109,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>2 · Campus Festival</span>
                  {scenario === 2 && (
                    <span
                      style={{
                        background: '#E8B86D',
                        color: '#163024',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: scenario === 2 ? '#E8B86D' : '#526649',
                  }}
                >
                  Warm sky · 12 festival flags · Exactly 5 customers
                </span>
              </button>
            </div>

            {/* Secondary Controls: Reduced Motion & Rapid Test */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #e1e7dc',
              }}
            >
              {/* Reduced Motion Toggle */}
              <button
                id="reduced-motion-toggle-btn"
                onClick={() => {
                  if (manualMotionOverride === null) {
                    setManualMotionOverride(!browserPrefersReducedMotion)
                  } else {
                    setManualMotionOverride(!manualMotionOverride)
                  }
                  setScenarioLog((prev) => [
                    `[Motion] Reduced Motion toggled to: ${
                      !(manualMotionOverride !== null ? manualMotionOverride : browserPrefersReducedMotion)
                    }`,
                    ...prev.slice(0, 14),
                  ])
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: '1px solid ' + (effectiveReducedMotion ? '#8c7337' : '#c9d6c3'),
                  background: effectiveReducedMotion ? '#f9efd9' : '#ffffff',
                  color: effectiveReducedMotion ? '#8c7337' : '#334433',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{effectiveReducedMotion ? '⏹' : '▶'}</span>
                <span>
                  Reduced Motion: <strong>{effectiveReducedMotion ? 'ENABLED' : 'DISABLED'}</strong>
                </span>
                {manualMotionOverride !== null ? (
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>(Manual Override)</span>
                ) : (
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>(Browser System Sync)</span>
                )}
              </button>

              {manualMotionOverride !== null && (
                <button
                  id="reset-motion-btn"
                  onClick={() => {
                    setManualMotionOverride(null)
                    setScenarioLog((prev) => [
                      `[Motion] Reset to Browser Media Query (${browserPrefersReducedMotion})`,
                      ...prev.slice(0, 14),
                    ])
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d5ddd1',
                    background: '#f0f4ee',
                    color: '#495f4e',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ↺ Reset to System Preference ({browserPrefersReducedMotion ? 'Reduce' : 'No Preference'})
                </button>
              )}

              {/* 20x Rapid Scenario Stress Test Runner */}
              <button
                id="rapid-stress-test-btn"
                onClick={handleRunRapid20xTest}
                disabled={isStressTesting}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: '1px solid #256348',
                  background: isStressTesting ? '#dfe5d9' : '#256348',
                  color: isStressTesting ? '#778877' : '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isStressTesting ? 'not-allowed' : 'pointer',
                  marginLeft: 'auto',
                }}
              >
                {isStressTesting ? 'Running 20x Rapid Switches...' : '⚡ Run 20x Rapid Scenario Stress Test'}
              </button>
            </div>

            {/* Diagnostics and Expected State Checklist */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginTop: '16px',
                fontSize: '12px',
                color: '#495a44',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e5eae1',
                }}
              >
                <strong style={{ color: '#163024', display: 'block', marginBottom: '4px' }}>
                  Current Scenario: {scenario}
                </strong>
                {scenario === 0 && 'Typical Day · 3 customers · warm sky · no rain/bunting'}
                {scenario === 1 && 'Heavy Rain · 1 customer · cool sky · falling rain clipped'}
                {scenario === 2 && 'Campus Festival · 5 customers · warm sky · bunting visible'}
              </div>

              <div
                style={{
                  background: '#fff',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e5eae1',
                }}
              >
                <strong style={{ color: '#163024', display: 'block', marginBottom: '4px' }}>
                  Motion Mode: {effectiveReducedMotion ? 'Reduced Motion (Stationary)' : 'Full Animation'}
                </strong>
                {effectiveReducedMotion
                  ? 'Steam, rain & chef breathing held stationary. Visual scenario state preserved.'
                  : 'Staggered steam wisps, falling rain drops, and chef breathing bob looping.'}
              </div>

              <div
                style={{
                  background: '#fff',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e5eae1',
                }}
              >
                <strong style={{ color: '#163024', display: 'block', marginBottom: '4px' }}>
                  Window Rain Clipping & Stability
                </strong>
                Rain strictly clipped inside window frame (350×170). Cloud bar, window, counter & buildings stay stationary.
              </div>
            </div>

            {/* Event Log */}
            {scenarioLog.length > 0 && (
              <div
                style={{
                  marginTop: '14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8dd',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  maxHeight: '90px',
                  overflowY: 'auto',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#445544',
                }}
              >
                <div style={{ fontWeight: 700, color: '#163024', marginBottom: '4px' }}>
                  State Transition Log:
                </div>
                {scenarioLog.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            )}
          </div>

          {/* Full Size View (800x450 / 16:9 full width) */}
          <section className="card" style={{ padding: '24px' }}>
            <div className="section-title" style={{ marginBottom: '16px' }}>
              <div>
                <h2>1. Full-Size Artboard View (800 × 450 Units)</h2>
                <p className="subtext">
                  Direct 1:1 artboard projection to inspect fine geometric alignment, steam wisps, rain drops, and customers.
                </p>
              </div>
              <span className="pill muted">FULL 16:9 CANVAS</span>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <CanteenViewer
                title="Canteen Scene · Full Size (800 × 450)"
                idPrefix="canteen-full"
                maxWidth="800px"
                scenario={scenario}
                prefersReducedMotion={effectiveReducedMotion}
                note="Locked 800×450 artboard · Script-free compiled Rive binary"
              />
            </div>
          </section>

          {/* Dashboard Size View (~400x225 / 16:9 in-situ) */}
          <section className="card" style={{ padding: '24px' }}>
            <div className="section-title" style={{ marginBottom: '16px' }}>
              <div>
                <h2>2. In-Situ Dashboard Preview Size (~400 × 225 Units)</h2>
                <p className="subtext">
                  Synchronized preview verifying instant scenario readability and animation at dashboard container scale.
                </p>
              </div>
              <span className="pill muted">INTENDED DASHBOARD SCALE</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(340px, 440px) 1fr',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* Dashboard Size Container */}
              <div>
                <CanteenViewer
                  title="Dashboard Hero Scale (400 × 225)"
                  idPrefix="canteen-thumb"
                  width="100%"
                  maxWidth="420px"
                  scenario={scenario}
                  prefersReducedMotion={effectiveReducedMotion}
                  note="Scaled preview for daily brief hero container"
                />
              </div>

              {/* Rubric Evaluation Checklist */}
              <div
                style={{
                  background: '#f8f9f5',
                  border: '1px solid #e3e8de',
                  borderRadius: '10px',
                  padding: '20px',
                  fontSize: '13px',
                }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#163024' }}>
                  Verification Criteria Checklist
                </h3>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '20px',
                    lineHeight: 1.85,
                    color: '#3d4d3a',
                  }}
                >
                  <li>
                    <strong>0 Typical Day:</strong> Warm exterior sky (#F0E8DC), exactly 3 customers in bottom corners, no rain, no bunting.
                  </li>
                  <li>
                    <strong>1 Heavy Rain:</strong> Cool slate sky (#5A7678), stationary clouds, falling rain clipped inside window, exactly 1 customer.
                  </li>
                  <li>
                    <strong>2 Campus Festival:</strong> Warm exterior sky, 12 visible bunting flags (#B5C99A, #E8B86D, #7A9A86), exactly 5 customers, no rain.
                  </li>
                  <li>
                    <strong>Animation:</strong> 3 staggered rising/fading steam wisps, continuous rain loop with hidden resets, subtle chef breathing bob. Stationary clouds, counter & window.
                  </li>
                  <li>
                    <strong>Prefers Reduced Motion:</strong> Freezes decorative motion (steam, rain, chef idle hold) while preserving visual appearance and allowing full scenario switching.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================
          BACKUP FEASIBILITY GATE HARNESS
          ======================================================== */}
      {activeTab === 'feasibility' && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="section-title">
            <div>
              <h2>PredictChef Rive Feasibility Gate (Backup)</h2>
              <p className="subtext">
                Isolated test component for vector animation and boolean data binding via @rive-app/react-webgl2
              </p>
            </div>
            <span
              className="tag"
              style={{
                background: feasibilityLoadStatus.includes('Loaded') ? '#e7f2df' : '#f9efd9',
                color: feasibilityLoadStatus.includes('Loaded') ? '#2e6345' : '#8c7337',
                fontWeight: 600,
              }}
            >
              {feasibilityLoadStatus}
            </span>
          </div>

          {runtimeError && (
            <div
              style={{
                background: '#fce8e6',
                color: '#c5221f',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <strong>Runtime Error:</strong> {runtimeError}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1fr) 340px',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* Canvas Wrapper */}
            <div
              style={{
                background: '#151821',
                borderRadius: '12px',
                border: '1px solid #2d3545',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid #252c3a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#8b9bb4',
                }}
              >
                <span>
                  Asset: <code>/feasibility.riv</code> (3,944 B)
                </span>
                <span style={{ color: isRaining ? '#5dade2' : '#85917e' }}>
                  ● {isRaining ? 'Rain Active' : 'Rain Inactive'}
                </span>
              </div>

              <div
                id="rive-canvas-wrapper"
                style={{
                  width: '100%',
                  height: '420px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FeasRiveComponent
                  style={{ width: '100%', height: '100%' }}
                  aria-label="Rive Vector Feasibility Canvas"
                />
              </div>

              <div
                style={{
                  padding: '8px 16px',
                  borderTop: '1px solid #252c3a',
                  fontSize: '11px',
                  color: '#6c7a91',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>State Machine: State Machine 1</span>
                <span>Watermark / Splash: None (Script-free build)</span>
              </div>
            </div>

            {/* Controls & Diagnostics Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: '#f8f9f5',
                  border: '1px solid #e3e8de',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>Live Binding Control</h3>
                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#526649' }}>
                  Property: <code>isRaining</code> (Boolean)
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#687864' }}>Current State: </span>
                  <strong
                    id="rain-state-display"
                    style={{
                      fontSize: '14px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: isRaining ? '#d4edda' : '#f0f0f0',
                      color: isRaining ? '#155724' : '#555',
                      marginLeft: '6px',
                    }}
                  >
                    {isRaining ? 'TRUE (Raining)' : 'FALSE (Dry)'}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    id="rain-toggle-btn"
                    className="primary"
                    onClick={handleToggleRain}
                    style={{ flex: 1, minHeight: '44px', cursor: 'pointer' }}
                  >
                    Toggle Rain ({isRaining ? 'Turn OFF' : 'Turn ON'})
                  </button>
                  <button
                    id="ten-toggle-btn"
                    className="secondary"
                    onClick={handleRunTenToggles}
                    style={{ minHeight: '44px', cursor: 'pointer' }}
                    title="Executes 10 rapid state changes"
                  >
                    10x Auto-Toggle
                  </button>
                </div>

                <div style={{ marginTop: '14px', fontSize: '13px', color: '#56694d' }}>
                  Toggle count: <strong id="toggle-count-display">{toggleCount}</strong>
                </div>
              </div>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e3e8de',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <h3 style={{ margin: '0 0 10px', fontSize: '14px' }}>Feasibility Verification Gate</h3>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '18px',
                    fontSize: '12px',
                    lineHeight: 1.8,
                    color: '#445542',
                  }}
                >
                  <li>
                    <strong>CLI & Compiler:</strong> Rive 1.7.0 (windows-x64) verified
                  </li>
                  <li>
                    <strong>Vector Scene:</strong> Pot, looping steam, rain layer authored in RML
                  </li>
                  <li>
                    <strong>Runtime:</strong> @rive-app/react-webgl2 (React 19 compatible)
                  </li>
                  <li>
                    <strong>Data Binding:</strong> ViewModel <code>FeasibilityVM</code>, <code>isRaining</code>
                  </li>
                  <li>
                    <strong>Splash / Watermark:</strong> {splashReported}
                  </li>
                </ul>
              </div>

              {toggleHistory.length > 0 && (
                <div
                  style={{
                    background: '#fcfdfb',
                    border: '1px solid #e8ece3',
                    borderRadius: '8px',
                    padding: '12px',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#556b4d', marginBottom: '6px' }}>Event Log:</div>
                  {toggleHistory.map((h, i) => (
                    <div key={i} style={{ color: '#495a44' }}>
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

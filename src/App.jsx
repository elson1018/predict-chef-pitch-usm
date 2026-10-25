import { useEffect, useState, useCallback } from 'react'
import { dishes, scenarios, makePlan, sum, impact } from './data'
import KitchenScene from './KitchenScene'
import RiveFeasibility from './RiveFeasibility'
import LandingPreview from './LandingPreview'
import './App.css'

const pages = ['Overview', 'Smart Prep Sheet', 'Demand Insights', 'Impact Dashboard', 'Rive Feasibility']
const symbols = ['◫', '☷', '⌁', '♧', '⚡']

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>
}

function Metric({ label, value, detail, accent }) {
  return (
    <div className={'metric ' + (accent ? 'accent' : '')}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Chart({ rows, impactMode = false }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={
        impactMode
          ? 'Food waste comparison in kilograms; exact values in table below'
          : 'Forecast versus simulated actual sales; exact values in table below'
      }
    >
      {rows.map((r) => (
        <div className="bar-group" key={r.day}>
          <div className="bars">
            <i style={{ height: `${impactMode ? r.baselineWaste * 7 : r.predicted * 0.58}px` }} />
            <i style={{ height: `${impactMode ? r.waste * 7 : r.actual * 0.58}px` }} />
          </div>
          <span>{r.day}</span>
        </div>
      ))}
    </div>
  )
}

function ScenarioButtons({ scenario, onSelectScenario }) {
  const items = [
    { key: 'normal', label: 'Typical Day', sub: '230 portions · baseline', icon: '☀' },
    { key: 'rain', label: 'Heavy Rain', sub: '184 portions · −20% walk-ins', icon: '☂' },
    { key: 'event', label: 'Campus Festival', sub: '300 portions · +30% visitors', icon: '✧' },
  ]
  return (
    <div className="scenario-btn-group" role="group" aria-label="Kitchen scenario selection">
      {items.map((item) => {
        const isSelected = scenario === item.key
        return (
          <button
            key={item.key}
            type="button"
            id={`scenario-btn-${item.key}`}
            aria-pressed={isSelected}
            className={`scenario-btn ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectScenario(item.key)}
          >
            <span className="scenario-btn-icon" aria-hidden="true">{item.icon}</span>
            <span className="scenario-btn-text">
              <strong>{item.label}</strong>
              <small>{item.sub}</small>
            </span>
            {isSelected && <span className="scenario-active-chip" aria-hidden="true">SELECTED</span>}
          </button>
        )
      })}
    </div>
  )
}

function DishComparisonSection({ scenario, prefersReducedMotion }) {
  const MAX_PORTIONS = 120
  return (
    <section className="dish-comp-card">
      <div className="section-title">
        <div>
          <h2>Dish-by-Dish Demand Comparison</h2>
          <p className="subtext">
            Typical-day baseline vs selected scenario forecast · Fixed scale (0–{MAX_PORTIONS} portions)
          </p>
        </div>
        <span className="pill muted">PORTION BREAKDOWN</span>
      </div>
      <div className="dish-comp-rows">
        {dishes.map((d) => {
          const baseline = d.base
          const forecastVal = Math.round(d.base * scenarios[scenario].factor)
          const diff = forecastVal - baseline
          const pct = baseline > 0 ? Math.round((diff / baseline) * 100) : 0
          const baselineWidth = Math.min(100, Math.max(0, (baseline / MAX_PORTIONS) * 100))
          const forecastWidth = Math.min(100, Math.max(0, (forecastVal / MAX_PORTIONS) * 100))
          const isPositive = diff > 0
          const isNegative = diff < 0

          return (
            <div key={d.id} className="dish-comp-row">
              <div className="dish-comp-header">
                <div className="dish-comp-name">
                  <span style={{ background: d.color }}>{d.icon}</span>
                  <div>
                    <b>{d.name}</b>
                    <small>({d.category})</small>
                  </div>
                </div>
                <span
                  className={`dish-diff-badge ${
                    isPositive ? 'up' : isNegative ? 'down' : 'neutral'
                  }`}
                >
                  {isPositive
                    ? `+${diff} portions (+${pct}%)`
                    : isNegative
                    ? `${diff} portions (${pct}%)`
                    : 'Baseline (±0)'}
                </span>
              </div>
              <div className="dish-comp-bars">
                <div className="dish-bar-line">
                  <span className="dish-bar-label">Baseline</span>
                  <div className="dish-bar-track">
                    <div
                      className="dish-bar-fill baseline"
                      style={{ width: `${baselineWidth}%` }}
                      aria-label={`${d.name} baseline ${baseline} portions`}
                    />
                  </div>
                  <span className="dish-bar-val">{baseline} portions</span>
                </div>
                <div className="dish-bar-line">
                  <span className="dish-bar-label">Forecast</span>
                  <div className="dish-bar-track">
                    <div
                      className={`dish-bar-fill forecast ${scenario}`}
                      style={{
                        width: `${forecastWidth}%`,
                        transition: prefersReducedMotion ? 'none' : undefined,
                      }}
                      aria-label={`${d.name} forecast ${forecastVal} portions`}
                    />
                  </div>
                  <span className="dish-bar-val">{forecastVal} portions</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function App() {
  const [page, setPage] = useState(() => {
    const hash = typeof window !== 'undefined' ? decodeURIComponent(location.hash.slice(1)) : ''
    if (hash === 'LandingPreview') return 'LandingPreview'
    return pages.includes(hash) ? hash : pages[0]
  })
  const [scenario, setScenario] = useState('normal')
  const [buffer, setBuffer] = useState(10)
  const [overrides, setOverrides] = useState({})
  const [approved, setApproved] = useState(false)
  const [notice, setNotice] = useState('')
  const [period, setPeriod] = useState(5)
  const [resetKey, setResetKey] = useState(0)

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

  useEffect(() => {
    const change = () => {
      const next = decodeURIComponent(location.hash.slice(1))
      if (next === 'LandingPreview') {
        setPage('LandingPreview')
      } else {
        setPage(pages.includes(next) ? next : pages[0])
      }
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  const plan = makePlan(scenario, buffer, overrides)
  const total = sum(plan, 'final')
  const forecast = sum(plan, 'forecast')
  const today = scenarios[scenario]
  const stats = impact(period)

  const go = (p) => {
    setPage(p)
    location.hash = p
  }

  const invalidate = () => {
    setApproved(false)
    setNotice('')
  }

  const handleSelectScenario = useCallback((nextScenario) => {
    setScenario(nextScenario)
    setOverrides({})
    setApproved(false)
    setNotice('')
  }, [])

  const handleResetDemo = useCallback(() => {
    setScenario('normal')
    setBuffer(10)
    setOverrides({})
    setApproved(false)
    setNotice('Demo reset: Typical Day, 10% safety buffer, unapproved, 5-service history.')
    setPeriod(5)
    setPage('Overview')
    location.hash = 'Overview'
    setResetKey((k) => k + 1)
  }, [])

  const exportPlan = () => {
    const content = [
      'SIMULATED PreDict-Chef prep plan',
      `Scenario,${today.label}`,
      `Status,${approved ? 'Chef approved' : 'Draft'}`,
      'Dish,Forecast,Buffer %,Suggested,Final',
      ...plan.map((r) => `${r.name},${r.forecast},${buffer},${r.recommended},${r.final}`),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'predict-chef-prep.csv'
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Prep sheet downloaded. All quantities are simulated.')
  }

  if (page === 'LandingPreview') {
    return <LandingPreview onOpenDashboard={() => go('Overview')} />
  }

  return (
    <div className={`app-shell ${reducedMotion ? 'reduced-motion' : ''}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a href="#Overview" className="brand">
          <span className="brand-mark">♧</span>
          <span>
            PreDict<span className="brand-light">-Chef</span>
            <small>LESS WASTE. MORE POSSIBILITY.</small>
          </span>
        </a>
        <div className="workspace">
          <span className="restaurant">K</span>
          <div>
            <b>Kantin Amaterasu</b>
            <small>USM · Penang</small>
          </div>
          <span>⌄</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {pages.map((p, i) => (
            <a
              key={p}
              href={'#' + p}
              onClick={() => setPage(p)}
              aria-current={page === p ? 'page' : undefined}
              className={page === p ? 'active' : ''}
            >
              <Icon>{symbols[i]}</Icon>
              {p}
              {i === 1 && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="purpose">
            <span>♧</span>
            <b>
              A little smarter.
              <br />A lot less waste.
            </b>
            <p>Better decisions for your kitchen and our planet.</p>
            <small>Aligned with SDG 12</small>
          </div>
          <div className="profile">
            <span className="avatar">AL</span>
            <div>
              <b>Chef Alex Lim</b>
              <small>Head chef</small>
            </div>
            <span>⋮</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace <span>/</span> <b>{page}</b>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              id="open-cinematic-preview-btn"
              className="text-button"
              style={{ fontSize: '13px', color: '#8fad88', textDecoration: 'none', padding: '6px 12px', border: '1px solid #233e31', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
              onClick={() => go('LandingPreview')}
              title="Open cinematic landing page prototype"
            >
              ✦ Cinematic Landing
            </button>
            <button
              id="reset-demo-btn"
              className="reset-demo-btn"
              onClick={handleResetDemo}
              aria-label="Reset demo to initial Typical Day state"
            >
              ↺ Reset demo
            </button>
            <span className="demo-badge">
              <i /> Interactive prototype
            </span>
          </div>
        </header>

        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR KITCHEN, ONE STEP AHEAD</div>
              <h1>
                {page === 'Overview'
                  ? 'A good day starts with a smart plan.'
                  : page === 'Rive Feasibility'
                  ? 'Rive Runtime Feasibility Gate'
                  : page}
              </h1>
              <p>
                {page === 'Overview'
                  ? 'A clearer picture of demand. A more confident kitchen.'
                  : page === 'Smart Prep Sheet'
                  ? 'A recommendation from the model. The final call from you.'
                  : page === 'Demand Insights'
                  ? 'Explore how changing conditions shape your daily demand.'
                  : page === 'Rive Feasibility'
                  ? 'Feasibility evaluation of compiled Rive vector animation and data binding.'
                  : 'Small daily decisions. A measurable difference.'}
              </p>
            </div>
            <div className="date-chip">
              ▦{' '}
              <span>
                Saturday, 24 Oct 2026<small>Lunch service · 11:00–15:00</small>
              </span>
            </div>
          </div>

          <div className="simulation-note">
            <span>◉</span> Demo workspace · All forecasts, integrations and impact metrics are simulated. No live POS, weather or AI is connected.
          </div>

          {/* Prominent Scenario Selection Buttons (Shared across Overview & Demand Insights) */}
          {(page === 'Overview' || page === 'Demand Insights') && (
            <div className="scenario-toolbar">
              <span>
                <b>Today's conditions</b>
                <small>Choose a scenario to explore the forecast</small>
              </span>
              <ScenarioButtons
                scenario={scenario}
                onSelectScenario={handleSelectScenario}
              />
            </div>
          )}

          {/* PAGE 1: OVERVIEW */}
          {page === 'Overview' && (
            <>
              <div className="hero-panel" style={{ alignItems: 'center' }}>
                <div>
                  <span className="pill">✧ DAILY KITCHEN BRIEF</span>
                  <h2>
                    Prep with confidence.
                    <br />
                    <em>Waste a little less.</em>
                  </h2>
                  <p>{today.note}</p>
                  <button className="primary" onClick={() => go(pages[1])}>
                    Review Smart Prep Sheet <span>↗</span>
                  </button>
                </div>
                <div
                  className="hero-visual"
                  style={{
                    minHeight: 'auto',
                    padding: 0,
                    overflow: 'hidden',
                    background: '#163024',
                    border: '1px solid #233e31',
                    borderRadius: '12px',
                    display: 'block',
                  }}
                >
                  <KitchenScene
                    scenario={scenario}
                    prefersReducedMotion={reducedMotion}
                    resetKey={resetKey}
                    ariaLabel="Canteen Scene Live Kitchen Overview"
                  />
                </div>
              </div>

              <div className="metrics">
                <Metric label="Predicted demand" value={forecast} detail="portions · selected scenario" />
                <Metric
                  label="Today's prep plan"
                  value={total}
                  detail={`${buffer}% safety buffer · ${Object.keys(overrides).length} chef overrides`}
                />
                <Metric
                  label="Food waste prevented"
                  value={`${stats.saved} kg`}
                  detail={`simulated · last ${period} services`}
                  accent
                />
                <Metric
                  label="Estimated savings"
                  value={`RM ${stats.money}`}
                  detail={`simulated · last ${period} services`}
                />
              </div>

              <div className="two-col">
                <section className="card">
                  <div className="section-title">
                    <div>
                      <h2>Your kitchen at a glance</h2>
                      <p>The signals behind today's recommendation</p>
                    </div>
                    <span className="pill muted">MOCK DATA</span>
                  </div>
                  <div className="signal">
                    <Icon>☀</Icon>
                    <div>
                      <b>{today.weather}</b>
                      <small>Weather scenario</small>
                    </div>
                    <span className="tag">{today.weatherEffect || '±0'}%</span>
                  </div>
                  <div className="signal">
                    <Icon>⚑</Icon>
                    <div>
                      <b>{today.event}</b>
                      <small>Local event scenario</small>
                    </div>
                    <span className="tag">+{today.eventEffect}%</span>
                  </div>
                  <div className="signal">
                    <Icon>▥</Icon>
                    <div>
                      <b>5 completed services</b>
                      <small>Illustrative historical sales</small>
                    </div>
                    <span className="status-dot">Available</span>
                  </div>
                </section>

                <section className="card">
                  <div className="section-title">
                    <div>
                      <h2>Ready for the lunch rush?</h2>
                      <p>Your next step, made simple</p>
                    </div>
                  </div>
                  <div className="step">
                    <span>01</span>
                    <div>
                      <b>Review your forecast</b>
                      <p>Check demand and today's conditions.</p>
                    </div>
                    <span>✓</span>
                  </div>
                  <div className="step">
                    <span>02</span>
                    <div>
                      <b>Make it your own</b>
                      <p>Adjust the safety buffer and portion quantities.</p>
                    </div>
                  </div>
                  <div className="step">
                    <span>03</span>
                    <div>
                      <b>Give your kitchen the green light</b>
                      <p>
                        {approved
                          ? 'Your current plan is chef approved.'
                          : 'Approve the prep sheet before service.'}
                      </p>
                    </div>
                  </div>
                  <button className="text-button" onClick={() => go(pages[1])}>
                    Open prep sheet →
                  </button>
                </section>
              </div>
            </>
          )}

          {/* PAGE 2: SMART PREP SHEET */}
          {page === 'Smart Prep Sheet' && (
            <>
              <div className="prep-controls card">
                <div>
                  <h2>Safety buffer</h2>
                  <p>A safety margin for unexpected orders, not a statistical confidence score.</p>
                  <label className="range-label">
                    Safety buffer <strong>{buffer}%</strong>
                    <input
                      aria-label="Safety buffer"
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={buffer}
                      onChange={(e) => {
                        setBuffer(Number(e.target.value))
                        invalidate()
                      }}
                    />
                  </label>
                  <small>
                    0% · Lean prep <span className="right">30% · Extra headroom</span>
                  </small>
                </div>
                <div className="prep-summary">
                  <span className="pill">{today.label}</span>
                  <strong>
                    {total}
                    <small>portions to prepare</small>
                  </strong>
                  <p>
                    {forecast} forecast + {total - forecast} net adjustment
                  </p>
                  <span className={approved ? 'approved' : 'pending'}>
                    {approved ? '✓ Chef approved' : '● Awaiting chef approval'}
                  </span>
                </div>
              </div>

              <section className="card">
                <div className="section-title">
                  <div>
                    <h2>Lunch service prep sheet</h2>
                    <p>Suggested portions round up. Enter a final quantity to override.</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setOverrides({})
                      invalidate()
                    }}
                  >
                    Reset overrides
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Menu item</th>
                        <th>Forecast</th>
                        <th>With {buffer}% safety buffer</th>
                        <th>Chef's final portions</th>
                        <th>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="dish">
                              <span style={{ background: row.color }}>{row.icon}</span>
                              <div>
                                <b>{row.name}</b>
                                <small>{row.category}</small>
                              </div>
                            </div>
                          </td>
                          <td>{row.forecast}</td>
                          <td>{row.recommended}</td>
                          <td>
                            <input
                              className="portion-input"
                              aria-label={`${row.name} final portions`}
                              type="number"
                              min="0"
                              max="999"
                              step="1"
                              value={row.final}
                              onChange={(e) => {
                                const n = Math.min(
                                  999,
                                  Math.max(0, Math.round(Number(e.target.value)))
                                )
                                setOverrides({ ...overrides, [row.id]: n })
                                invalidate()
                              }}
                            />
                          </td>
                          <td>
                            <span
                              className={
                                'tag ' +
                                (overrides[row.id] !== undefined ? 'override' : '')
                              }
                            >
                              {overrides[row.id] !== undefined
                                ? 'Chef override'
                                : 'Suggested'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total portions</th>
                        <td>{forecast}</td>
                        <td>{sum(plan, 'recommended')}</td>
                        <td>{total}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="approval-footer">
                  <p>
                    You're in control.
                    <small>Any change reopens the plan for your review.</small>
                  </p>
                  <div className="button-row">
                    <button className="secondary" onClick={exportPlan}>
                      ↓ Export CSV
                    </button>
                    <button
                      className="primary"
                      disabled={approved || total === 0}
                      onClick={() => {
                        setApproved(true)
                        setNotice(
                          `Chef Alex approved ${total} portions for ${today.label}. This is a demo approval only.`
                        )
                      }}
                    >
                      {approved ? '✓ Plan approved' : 'Approve prep plan'}
                    </button>
                  </div>
                </div>
              </section>

              <div className="info-box">
                ✧{' '}
                <div>
                  <b>Built for the chef's judgement</b>
                  <p>
                    The selected scenario carries over from Overview or Demand Insights. Quantities and approval stay in this session until refresh; no kitchen order is sent.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* PAGE 3: DEMAND INSIGHTS */}
          {page === 'Demand Insights' && (
            <>
              <div className="metrics">
                <Metric
                  label="Historical baseline"
                  value={sum(dishes, 'base')}
                  detail="typical Saturday portions"
                />
                <Metric
                  label="Weather adjustment"
                  value={`${today.weatherEffect}%`}
                  detail={today.weather}
                />
                <Metric
                  label="Event adjustment"
                  value={`+${today.eventEffect}%`}
                  detail={today.event}
                />
                <Metric
                  label="Scenario forecast"
                  value={forecast}
                  detail="before safety buffer"
                  accent
                />
              </div>

              {/* Kitchen Scene Prominently Alongside Forecast */}
              <div className="two-col" style={{ alignItems: 'start', marginBottom: '22px' }}>
                <section className="card" style={{ padding: '18px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: '16px' }}>Canteen Activity & Weather</h2>
                      <p className="subtext" style={{ margin: '4px 0 0' }}>
                        {today.weather} · {today.event}
                      </p>
                    </div>
                    <span className="pill muted">{today.label}</span>
                  </div>
                  <KitchenScene
                    scenario={scenario}
                    prefersReducedMotion={reducedMotion}
                    resetKey={resetKey}
                    ariaLabel="Canteen Scene Demand Insights Projection"
                  />
                </section>

                <section className="card">
                  <h2>How the scenario works</h2>
                  <p className="subtext">A transparent demo, with no trained AI model.</p>
                  <div className="formula">
                    230 baseline portions
                    <br />
                    <span>
                      × (1 + {today.weatherEffect}% + {today.eventEffect}%)
                    </span>
                    <br />
                    <b>= {forecast} forecast portions</b>
                  </div>
                  <p>
                    {today.note} Each dish forecast is rounded to a whole portion before summation (chicken: {Math.round(80 * today.factor)}, laksa: {Math.round(55 * today.factor)}, nasi lemak: {Math.round(65 * today.factor)}, salad: {Math.round(30 * today.factor)} = {forecast} portions).
                  </p>
                  <button className="text-button" onClick={() => go(pages[1])}>
                    Use this scenario in prep sheet →
                  </button>
                </section>
              </div>

              {/* Four Dish Comparison Rows */}
              <DishComparisonSection
                scenario={scenario}
                prefersReducedMotion={reducedMotion}
              />

              {/* Historical Forecast & Actual Sales (Preserved & Unchanged) */}
              <section className="card">
                <h2>Forecast & actual sales</h2>
                <p className="subtext">Simulated completed services · portions</p>
                <div className="legend">
                  <span>Historical forecast</span>
                  <span>Actual sales</span>
                </div>
                <Chart rows={stats.rows} />
              </section>

              <section className="card">
                <h2>Behind the chart</h2>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Completed service</th>
                        <th>Historical forecast</th>
                        <th>Simulated actual sales</th>
                        <th>Absolute error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.rows.map((r) => (
                        <tr key={r.day}>
                          <th>{r.day}</th>
                          <td>{r.predicted}</td>
                          <td>{r.actual}</td>
                          <td>{Math.abs(r.actual - r.predicted)} portions</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="subtext">
                  Today's scenario changes the upcoming prep plan only. Completed-service history stays fixed.
                </p>
              </section>
            </>
          )}

          {/* PAGE 4: IMPACT DASHBOARD */}
          {page === 'Impact Dashboard' && (
            <>
              <div className="scenario-toolbar">
                <span>
                  <b>Impact in perspective</b>
                  <small>Illustrative completed-service results</small>
                </span>
                <label>
                  Reporting period{' '}
                  <select
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                  >
                    <option value="5">Last 5 services</option>
                    <option value="3">Last 3 services</option>
                  </select>
                </label>
              </div>

              <div className="metrics">
                <Metric
                  label="Food waste prevented"
                  value={`${stats.saved} kg`}
                  detail={`${stats.baseline} kg baseline − ${stats.waste} kg demo waste`}
                  accent
                />
                <Metric
                  label="Estimated cost avoided"
                  value={`RM ${stats.money}`}
                  detail="prevented waste × RM18/kg"
                />
                <Metric
                  label="Forecast accuracy"
                  value={`${stats.accuracy.toFixed(1)}%`}
                  detail="1 − total absolute error / total sales"
                />
                <Metric
                  label="Waste reduction"
                  value={`${((stats.saved / stats.baseline) * 100).toFixed(1)}%`}
                  detail="relative to illustrative baseline"
                />
              </div>

              <div className="two-col">
                <section className="card">
                  <h2>Less food left behind</h2>
                  <p className="subtext">Simulated food waste · kilograms per service</p>
                  <div className="legend">
                    <span>Without forecasting</span>
                    <span>With PreDict-Chef</span>
                  </div>
                  <Chart rows={stats.rows} impactMode />
                </section>
                <section className="sdg-card">
                  <div className="sdg-number">
                    12{' '}
                    <span>
                      RESPONSIBLE
                      <br />
                      CONSUMPTION
                      <br />
                      AND PRODUCTION
                    </span>
                  </div>
                  <div className="infinity">∞</div>
                  <h2>Better prep. Better use of resources.</h2>
                  <p>Our intended contribution to SDG 12.3: prevent food waste at the preparation stage.</p>
                  <small>
                    Illustrative impact only. Actual impact requires measured kitchen waste and a comparable baseline.
                  </small>
                </section>
              </div>

              <section className="card">
                <h2>Measurement, made clear</h2>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Baseline waste</th>
                        <th>Demo waste</th>
                        <th>Prevented</th>
                        <th>Cost avoided</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.rows.map((r) => (
                        <tr key={r.day}>
                          <th>{r.day}</th>
                          <td>{r.baselineWaste} kg</td>
                          <td>{r.waste} kg</td>
                          <td>{r.baselineWaste - r.waste} kg</td>
                          <td>RM {(r.baselineWaste - r.waste) * 18}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="subtext">
                  RM18/kg is an illustrative ingredient-cost assumption. These are avoided ingredient costs, not verified profit or subscription-adjusted savings. Today's approval does not create historical savings.
                </p>
              </section>
            </>
          )}

          {/* PAGE 5: RIVE FEASIBILITY (ISOLATED TROUBLESHOOTING HARNESS) */}
          {page === 'Rive Feasibility' && <RiveFeasibility />}

          {notice && (
            <div className="notice" role="status">
              ✓ {notice}
            </div>
          )}

          <footer>
            PreDict-Chef <span>Predict. Prepare. Optimise.</span>
            <small>Team Amaterasu · Frontend demo</small>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App

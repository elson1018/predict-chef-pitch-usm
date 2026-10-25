import { useEffect, useState } from 'react'
import {
  useRive,
  useViewModelInstanceBoolean,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2'

/**
 * Maps dashboard string scenarios to numeric Rive states:
 * normal -> 0 (Typical Day)
 * rain   -> 1 (Heavy Rain)
 * event  -> 2 (Campus Festival)
 */
function scenarioToRiveIndex(scenario) {
  if (typeof scenario === 'number') return scenario
  switch (scenario) {
    case 'rain':
      return 1
    case 'event':
      return 2
    case 'normal':
    default:
      return 0
  }
}

export default function KitchenScene({
  scenario = 0,
  prefersReducedMotion = false,
  className = '',
  style = {},
  ariaLabel = 'PreDict-Chef Canteen Scene',
  resetKey = 0,
}) {
  const [loadStatus, setLoadStatus] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const targetScenarioIndex = scenarioToRiveIndex(scenario)

  const { rive, RiveComponent } = useRive({
    src: '/canteen.riv',
    stateMachine: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    onLoad: () => {
      setLoadStatus('loaded')
    },
    onLoadError: (err) => {
      setLoadStatus('error')
      setLoadError(String(err))
      console.error('[KitchenScene] Failed to load /canteen.riv:', err)
    },
  })

  const vmi = rive?.viewModelInstance
  const { setValue: setScenarioVal } = useViewModelInstanceNumber('scenario', vmi)
  const { setValue: setReducedMotionVal } = useViewModelInstanceBoolean(
    'prefersReducedMotion',
    vmi
  )

  // Track advance callbacks over 2s and expose diagnostics
  useEffect(() => {
    if (!rive) return
    let advances = 0
    const onAdvance = () => {
      advances++
    }
    try {
      rive.on('advance', onAdvance)
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      const readbackScenario = rive?.viewModelInstance?.number('scenario')?.value ?? 'unbound'
      const readbackMotion = rive?.viewModelInstance?.boolean('prefersReducedMotion')?.value ?? 'unbound'
      if (typeof window !== 'undefined' && window.__kitchenSceneDiag) {
        window.__kitchenSceneDiag.advancesIn2s = advances
      }
      console.log('[KitchenScene Diag 2s]', {
        advancesIn2s: advances,
        stateMachineNames: rive.stateMachineNames,
        playingStateMachineNames: rive.playingStateMachineNames,
        animationNames: rive.animationNames,
        playingAnimationNames: rive.playingAnimationNames,
        vmiExists: Boolean(rive.viewModelInstance),
        defaultViewModel: rive.defaultViewModel ? rive.defaultViewModel()?.name : undefined,
        actualScenario: readbackScenario,
        actualMotion: readbackMotion,
      })
    }, 2000)

    return () => {
      clearTimeout(timer)
      try {
        rive.off('advance', onAdvance)
      } catch {
        // ignore
      }
    }
  }, [rive])

  // Expose live diagnostic state on window for automated inspection
  useEffect(() => {
    if (typeof window !== 'undefined' && rive) {
      window.__kitchenSceneDiag = {
        ...(window.__kitchenSceneDiag || {}),
        hasRive: Boolean(rive),
        stateMachineNames: rive.stateMachineNames,
        playingStateMachineNames: rive.playingStateMachineNames,
        animationNames: rive.animationNames,
        playingAnimationNames: rive.playingAnimationNames,
        vmiExists: Boolean(rive.viewModelInstance),
        defaultViewModel: rive.defaultViewModel ? rive.defaultViewModel()?.name : undefined,
        actualScenario: rive.viewModelInstance?.number('scenario')?.value ?? 'unbound',
        actualMotion: rive.viewModelInstance?.boolean('prefersReducedMotion')?.value ?? 'unbound',
        rive,
      }
    }
  }, [rive, targetScenarioIndex, prefersReducedMotion])

  // Synchronise numeric scenario to Rive ViewModel
  useEffect(() => {
    if (vmi) {
      try {
        const numProp = vmi.number('scenario')
        if (numProp && numProp.value !== targetScenarioIndex) {
          numProp.value = targetScenarioIndex
        }
      } catch (e) {
        console.warn('[KitchenScene] Error assigning scenario directly:', e)
      }
    }
    if (setScenarioVal && targetScenarioIndex !== undefined) {
      setScenarioVal(targetScenarioIndex)
    }
  }, [targetScenarioIndex, setScenarioVal, vmi])

  // Synchronise prefersReducedMotion to Rive ViewModel
  useEffect(() => {
    if (vmi) {
      try {
        const boolProp = vmi.boolean('prefersReducedMotion')
        if (boolProp && boolProp.value !== prefersReducedMotion) {
          boolProp.value = prefersReducedMotion
        }
      } catch (e) {
        console.warn('[KitchenScene] Error assigning prefersReducedMotion directly:', e)
      }
    }
    if (setReducedMotionVal && prefersReducedMotion !== undefined) {
      setReducedMotionVal(prefersReducedMotion)
    }
  }, [prefersReducedMotion, setReducedMotionVal, vmi])

  // Handle resetKey: establish working data reset without destroying the active state machine
  useEffect(() => {
    if (resetKey > 0 && rive) {
      try {
        // Ensure State Machine 1 is playing if it was somehow stopped or paused
        if (
          rive.playingStateMachineNames &&
          !rive.playingStateMachineNames.includes('State Machine 1')
        ) {
          rive.play('State Machine 1')
        }
        // Verify and rebind ViewModel instance if disconnected
        let activeVmi = rive.viewModelInstance
        if (!activeVmi) {
          const defaultVm =
            rive.defaultViewModel?.() ||
            rive.viewModelByName?.('CanteenVM')
          if (defaultVm) {
            activeVmi = defaultVm.defaultInstance?.() || defaultVm.instance?.()
          }
        }
        if (activeVmi && rive.bindViewModelInstance) {
          rive.bindViewModelInstance(activeVmi)
        }
        if (activeVmi) {
          const numProp = activeVmi.number?.('scenario')
          if (numProp) {
            numProp.value = 0
          }
          const boolProp = activeVmi.boolean?.('prefersReducedMotion')
          if (boolProp) {
            boolProp.value = Boolean(prefersReducedMotion)
          }
        }
        if (setScenarioVal) {
          setScenarioVal(0)
        }
        if (setReducedMotionVal) {
          setReducedMotionVal(Boolean(prefersReducedMotion))
        }
      } catch (e) {
        console.warn('[KitchenScene] Error resetting demo state:', e)
      }
    }
  }, [resetKey, rive, prefersReducedMotion, setScenarioVal, setReducedMotionVal])

  return (
    <div
      className={`kitchen-scene-wrapper ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: '10px',
        background: '#f5efe6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <RiveComponent
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label={ariaLabel}
      />
      {loadStatus === 'loading' && (
        <div
          className="kitchen-scene-status loading"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(245, 239, 230, 0.85)',
            color: '#495a44',
            fontSize: '12px',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          <span>⏳ Loading canteen scene...</span>
        </div>
      )}
      {loadStatus === 'error' && (
        <div
          className="kitchen-scene-status error"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fce8e6',
            color: '#c5221f',
            fontSize: '12px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <span>⚠️ Failed to load canteen artwork: {loadError}</span>
        </div>
      )}
    </div>
  )
}

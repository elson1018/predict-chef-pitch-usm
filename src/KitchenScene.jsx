import { useEffect } from 'react'
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
  const targetScenarioIndex = scenarioToRiveIndex(scenario)

  const { rive, RiveComponent } = useRive({
    src: '/canteen.riv',
    stateMachine: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    onLoad: () => {
      setIsLoaded(true)
    },
    onLoadError: (err) => {
      console.error('[KitchenScene] Failed to load /canteen.riv:', err)
    },
  })

  const vmi = rive?.viewModelInstance
  const { setValue: setScenarioVal } = useViewModelInstanceNumber('scenario', vmi)
  const { setValue: setReducedMotionVal } = useViewModelInstanceBoolean(
    'prefersReducedMotion',
    vmi
  )

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

  // Handle resetKey to restart decorative loops reliably
  useEffect(() => {
    if (resetKey > 0 && rive) {
      try {
        rive.stop()
        rive.play()
      } catch (e) {
        console.warn('[KitchenScene] Error resetting animations:', e)
      }
    }
  }, [resetKey, rive])

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
        ...style,
      }}
    >
      <RiveComponent
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label={ariaLabel}
      />
    </div>
  )
}

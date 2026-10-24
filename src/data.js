export const dishes = [
  { id: 'chicken', name: 'Hainanese chicken rice', category: 'Kitchen favourite', base: 80, usual: 110, cost: 6.5, kg: .32, color: '#ecd1a5', icon: '🍗' },
  { id: 'laksa', name: 'Penang asam laksa', category: 'Signature bowl', base: 55, usual: 70, cost: 4.2, kg: .28, color: '#e7b49a', icon: '🍜' },
  { id: 'nasi', name: 'Nasi lemak', category: 'All-day classic', base: 65, usual: 85, cost: 3.8, kg: .25, color: '#c9d2a1', icon: '🍚' },
  { id: 'salad', name: 'Garden grain bowl', category: 'Plant-based', base: 30, usual: 45, cost: 5.1, kg: .22, color: '#abc7a3', icon: '🥗' },
]
export const scenarios = {
  normal: { label: 'Typical Saturday', icon: '☀', weather: 'Sunny · 30°C', event: 'Regular campus activity', factor: 1, weatherEffect: 0, eventEffect: 0, note: 'A steady lunch service. Demand follows the historical Saturday pattern.' },
  rain: { label: 'Rainy afternoon', icon: '☂', weather: 'Heavy rain · 25°C', event: 'Outdoor activity reduced', factor: .8, weatherEffect: -20, eventEffect: 0, note: 'Heavy afternoon rain reduces expected walk-in traffic by 20% in this demo.' },
  event: { label: 'USM campus festival', icon: '✧', weather: 'Sunny · 30°C', event: 'Campus festival · 500 visitors', factor: 1.3, weatherEffect: 0, eventEffect: 30, note: 'A nearby campus festival raises expected demand by 30% in this demo.' },
}
export const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0)
export function makePlan(scenario, buffer, overrides = {}) {
  return dishes.map(d => {
    const forecast = Math.round(d.base * scenarios[scenario].factor)
    const recommended = Math.ceil(forecast * (1 + buffer / 100))
    return { ...d, forecast, recommended, final: overrides[d.id] ?? recommended }
  })
}
// Illustrative completed services, independent of today's unserved prep plan.
export const history = [
  { day: 'Mon', predicted: 208, actual: 218, baselineWaste: 19, waste: 11 },
  { day: 'Tue', predicted: 225, actual: 215, baselineWaste: 21, waste: 12 },
  { day: 'Wed', predicted: 212, actual: 224, baselineWaste: 20, waste: 10 },
  { day: 'Thu', predicted: 242, actual: 232, baselineWaste: 23, waste: 13 },
  { day: 'Fri', predicted: 258, actual: 270, baselineWaste: 25, waste: 14 },
]
export function impact(days = 5) {
  const rows = history.slice(-days)
  const baseline = sum(rows, 'baselineWaste'), waste = sum(rows, 'waste')
  return { rows, baseline, waste, saved: baseline - waste, money: (baseline - waste) * 18, accuracy: (1 - rows.reduce((s, r) => s + Math.abs(r.predicted - r.actual), 0) / sum(rows, 'actual')) * 100 }
}

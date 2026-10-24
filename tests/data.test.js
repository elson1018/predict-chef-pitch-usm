import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makePlan, sum, impact } from '../src/data.js'
test('scenarios consistently update forecast and rounded buffer', () => {
  assert.equal(sum(makePlan('normal', 10), 'forecast'), 230)
  assert.equal(sum(makePlan('rain', 10), 'forecast'), 184)
  assert.equal(sum(makePlan('event', 10), 'forecast'), 300)
  for (const scenario of ['normal', 'rain', 'event']) for (const buffer of [0, 10, 30]) for (const r of makePlan(scenario, buffer)) assert.equal(r.final, Math.ceil(r.forecast * (1 + buffer / 100)))
})
test('chef override wins without altering forecast or suggestion', () => {
  const rows = makePlan('normal', 10, { chicken: 100, salad: 0 })
  assert.equal(rows[0].forecast, 80); assert.equal(rows[0].recommended, 88); assert.equal(rows[0].final, 100); assert.equal(rows[3].final, 0)
})
test('impact totals and weighted accuracy derive from same completed services', () => {
  const five = impact(5), three = impact(3)
  assert.equal(five.saved, 48); assert.equal(five.money, 864)
  assert.equal(three.saved, 31); assert.equal(three.money, 558)
  assert.equal(five.accuracy, (1 - 54 / 1159) * 100)
  assert.equal(five.baseline - five.waste, five.saved)
})

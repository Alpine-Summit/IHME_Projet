import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkout } from './planner.js'

test('buildWorkout creates an objective-specific, titled workout', () => {
  const result = buildWorkout([], { objective: 'force', muscles: ['Quadriceps'], title: 'Force des jambes', scheduledFor: '2026-11-01' })
  assert.ok(result.exercises.length >= 4)
  assert.equal(result.exercises[0].sets, 3)
  assert.equal('difficulty' in result.exercises[0], false)
  assert.equal(result.title, 'Force des jambes')
  assert.equal(result.exercises[0].exerciseId, null)
})

test('unknown objectives use general prescriptions', () => {
  const result = buildWorkout([], { objective: 'general', scheduledFor: '2026-11-01' })
  assert.match(result.title, /Renforcement général/)
})

test('buildWorkout rejects sessions without a planning date', () => {
  assert.throws(() => buildWorkout([], { objective: 'force' }), /Choisissez une date/)
})

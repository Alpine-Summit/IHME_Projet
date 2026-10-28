import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkout } from './planner.js'

test('buildWorkout creates an objective-specific workout', () => {
  const result = buildWorkout([{ id: 1, name: 'Squat', instruction: 'Dos stable' }], { objective: 'force', duration: 45, level: 'intermediaire' })
  assert.equal(result.warmupMinutes, 8)
  assert.equal(result.exercises[0].sets, 4)
  assert.equal(result.exercises[0].difficulty, 'intermediaire')
})

test('unknown objectives use general prescriptions', () => {
  const result = buildWorkout([], { objective: 'unknown', duration: 60 })
  assert.match(result.title, /Renforcement général/)
})

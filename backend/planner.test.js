import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkout } from './planner.js'

test('buildWorkout creates an objective-specific workout', () => {
  const result = buildWorkout([], { objective: 'force', level: 'intermediaire', muscles: ['Quadriceps'] })
  assert.ok(result.exercises.length >= 4)
  assert.equal(result.exercises[0].sets, 3)
  assert.equal(result.exercises[0].difficulty, 'intermediaire')
  assert.equal(result.exercises[0].exerciseId, null)
})

test('unknown objectives use general prescriptions', () => {
  const result = buildWorkout([], { objective: 'general', level: 'debutant' })
  assert.match(result.title, /Renforcement général/)
})

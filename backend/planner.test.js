import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkout } from './planner.js'

test('buildWorkout creates an objective-specific workout', () => {
  const result = buildWorkout([], { objective: 'force', duration: 45, level: 'intermediaire', sport: 'Course à pied', muscles: ['Quadriceps'] })
  assert.equal(result.warmupMinutes, 8)
  assert.equal(result.exercises[0].sets, 3)
  assert.equal(result.exercises[0].difficulty, 'intermediaire')
  assert.equal(result.exercises[0].exerciseId, null)
})

test('unknown objectives use general prescriptions', () => {
  const result = buildWorkout([], { objective: 'general', duration: 60, sport: 'Course à pied', level: 'debutant' })
  assert.match(result.title, /Renforcement général/)
})

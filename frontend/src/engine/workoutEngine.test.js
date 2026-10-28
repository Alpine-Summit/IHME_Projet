import test from 'node:test'
import assert from 'node:assert/strict'
import { EXERCISES } from '../data/exercises.js'
import { generateWorkout, selectExercises } from './workoutEngine.js'

const profile = { level: 'debutant', muscles: ['Quadriceps', 'Abdominaux'] }

test('exercise catalog is rich and uses stable unique identifiers', () => {
  assert.ok(EXERCISES.length >= 100)
  assert.equal(new Set(EXERCISES.map((exercise) => exercise.id)).size, EXERCISES.length)
  assert.ok(EXERCISES.every((exercise) => exercise.description && exercise.instruction && exercise.precautions && exercise.easier && exercise.harder))
})

test('selection respects objective, level and muscle priorities', () => {
  const selected = selectExercises({ ...profile, objective: 'force' })
  assert.ok(selected.length > 0)
  assert.ok(selected.every((exercise) => exercise.objectives.includes('force')))
  assert.ok(selected[0].muscles.some((muscle) => profile.muscles.includes(muscle)))
})

test('generated sessions contain four to six editable exercises', () => {
  const workout = generateWorkout(profile, { objective: 'force' })
  assert.ok(workout.exercises.length >= 4)
  assert.ok(workout.exercises.length <= 6)
})

test('recent exercises are deprioritized for deterministic session variety', () => {
  const first = generateWorkout(profile, { objective: 'force' })
  const second = generateWorkout(profile, { objective: 'force', recentWorkouts: [first] })
  assert.notEqual(second.exercises[0].exerciseId, first.exercises[0].exerciseId)
})

test('plyometric prescription remains controlled for beginners', () => {
  const workout = generateWorkout(profile, { objective: 'pliometrie' })
  assert.ok(workout.exercises.every((exercise) => exercise.sets <= 3))
  assert.match(workout.safety, /réceptions/i)
})

test('body mass gives only a conservative editable load range', () => {
  const workout = generateWorkout({ ...profile, bodyMass: 70 }, { objective: 'force' })
  const loadedExercise = workout.exercises.find((exercise) => exercise.loadSuggestion)
  assert.ok(loadedExercise)
  assert.ok(loadedExercise.loadSuggestion.minKg < loadedExercise.loadSuggestion.maxKg)
  assert.equal(generateWorkout(profile, { objective: 'force' }).exercises.some((exercise) => exercise.loadSuggestion), false)
})

test('scheduled sessions are planned and invalid levels are rejected', () => {
  const workout = generateWorkout(profile, { objective: 'general', scheduledFor: '2026-11-01' })
  assert.equal(workout.status, 'planned')
  assert.equal(workout.scheduledFor, '2026-11-01')
  assert.throws(() => generateWorkout({ ...profile, level: 'unknown' }), /niveau/i)
})

test('empty muscle selection still produces a general session', () => {
  const workout = generateWorkout({ ...profile, muscles: [] }, { objective: 'general' })
  assert.ok(workout.exercises.length >= 4)
})

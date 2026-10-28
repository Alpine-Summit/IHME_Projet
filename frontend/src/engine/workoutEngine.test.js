import test from 'node:test'
import assert from 'node:assert/strict'
import { EXERCISES } from '../data/exercises.js'
import { estimateWorkoutMinutes, generateWorkout, selectExercises } from './workoutEngine.js'

const profile = { sport: 'Course à pied', level: 'debutant', muscles: ['Quadriceps', 'Abdominaux'], equipment: ['Poids du corps'] }

test('exercise catalog is rich and uses stable unique identifiers', () => {
  assert.ok(EXERCISES.length >= 100)
  assert.equal(new Set(EXERCISES.map((exercise) => exercise.id)).size, EXERCISES.length)
  assert.ok(EXERCISES.every((exercise) => exercise.description && exercise.instruction && exercise.precautions && exercise.easier && exercise.harder))
})

test('selection respects objective, level and muscle priorities', () => {
  const selected = selectExercises({ ...profile, objective: 'force' })
  assert.ok(selected.length > 0)
  assert.ok(selected.every((exercise) => exercise.objectives.includes('force')))
})

test('selected muscles constrain the generated exercise list', () => {
  const selected = selectExercises({ ...profile, objective: 'force', muscles: ['Pectoraux'] })
  assert.ok(selected.length > 0)
  assert.ok(selected.every((exercise) => exercise.muscles.includes('Pectoraux')))
})

test('recent exercises are deprioritized for deterministic session variety', () => {
  const first = generateWorkout(profile, { objective: 'force', duration: 45 })
  const second = generateWorkout(profile, { objective: 'force', duration: 45, recentWorkouts: [first] })
  assert.notEqual(second.exercises[0].exerciseId, first.exercises[0].exerciseId)
})

test('plyometric prescription remains controlled for beginners', () => {
  const workout = generateWorkout(profile, { objective: 'pliometrie', duration: 30 })
  assert.equal(workout.status, 'generated')
  assert.ok(workout.exercises.every((exercise) => exercise.sets <= 3))
  assert.match(workout.safety, /réceptions/i)
})

test('estimated duration changes after an exercise is edited', () => {
  const workout = generateWorkout(profile, { objective: 'general', duration: 45 })
  const edited = { ...workout, exercises: workout.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets + 2, restSeconds: exercise.restSeconds + 30 })) }
  assert.ok(estimateWorkoutMinutes(edited) > estimateWorkoutMinutes(workout))
})

test('body mass gives only a conservative editable load range', () => {
  const workout = generateWorkout({ ...profile, bodyMass: 70 }, { objective: 'force', duration: 45 })
  const loadedExercise = workout.exercises.find((exercise) => exercise.loadSuggestion)
  assert.ok(loadedExercise)
  assert.ok(loadedExercise.loadSuggestion.minKg < loadedExercise.loadSuggestion.maxKg)
  assert.equal(generateWorkout(profile, { objective: 'force', duration: 45 }).exercises.some((exercise) => exercise.loadSuggestion), false)
})

test('scheduled sessions are planned and duration boundaries are controlled', () => {
  const workout = generateWorkout(profile, { objective: 'general', duration: 60, scheduledFor: '2026-11-01' })
  assert.equal(workout.status, 'planned')
  assert.equal(workout.targetDuration, 60)
  assert.throws(() => generateWorkout(profile, { duration: 29 }), /30 et 60/)
  assert.throws(() => generateWorkout(profile, { duration: 61 }), /30 et 60/)
})

test('empty muscle selection still produces a general session', () => {
  const workout = generateWorkout({ ...profile, muscles: [] }, { objective: 'general', duration: 30 })
  assert.ok(workout.exercises.length >= 2)
})

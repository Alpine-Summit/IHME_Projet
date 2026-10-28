import test from 'node:test'
import assert from 'node:assert/strict'
import { EXERCISES, OBJECTIVES } from '../data/exercises.js'
import { generateWorkout, selectExercises } from './workoutEngine.js'

const profile = { muscles: ['Quadriceps', 'Abdominaux'] }

test('exercise catalog is rich and uses stable unique identifiers', () => {
  assert.ok(EXERCISES.length >= 100)
  assert.equal(new Set(EXERCISES.map((exercise) => exercise.id)).size, EXERCISES.length)
  assert.ok(EXERCISES.every((exercise) => exercise.description && exercise.instruction && exercise.precautions && exercise.easier && exercise.harder))
})

test('selection respects objective and prioritizes selected muscles', () => {
  const selected = selectExercises({ ...profile, objective: 'force' })
  assert.ok(selected.length > 0)
  assert.ok(selected.every((exercise) => exercise.objectives.includes('force')))
  assert.ok(selected.every((exercise) => exercise.levels.includes('avance')))
  assert.ok(selected[0].muscles.some((muscle) => profile.muscles.includes(muscle)))
})

test('every objective has enough exercises for an advanced four-to-six-movement session', () => {
  for (const { id } of OBJECTIVES) {
    const selected = selectExercises({ objective: id })
    assert.ok(selected.length >= 4, `${id} must have at least four exercises`)
    assert.ok(selected.every((exercise) => exercise.levels.includes('avance')), `${id} must use advanced exercises`)
  }
})

test('generated sessions contain four to six editable exercises', () => {
  const workout = generateWorkout(profile, { objective: 'force', title: 'Force des jambes' })
  assert.ok(workout.exercises.length >= 4)
  assert.ok(workout.exercises.length <= 6)
  assert.equal(workout.title, 'Force des jambes')
  assert.ok(workout.exercises.every((exercise) => !('difficulty' in exercise)))
})

test('empty or oversized session titles use a useful default or return a clear error', () => {
  assert.match(generateWorkout(profile, { objective: 'force', title: '   ' }).title, /Force/)
  assert.throws(() => generateWorkout(profile, { title: 'x'.repeat(101) }), /100 caractères/)
})

test('recent exercises are deprioritized for deterministic session variety', () => {
  const first = generateWorkout(profile, { objective: 'force' })
  const second = generateWorkout(profile, { objective: 'force', recentWorkouts: [first] })
  assert.notEqual(second.exercises[0].exerciseId, first.exercises[0].exerciseId)
})

test('plyometric prescription keeps volume controlled without a user level', () => {
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
  assert.doesNotThrow(() => generateWorkout({ ...profile, bodyMass: 20 }))
  assert.doesNotThrow(() => generateWorkout({ ...profile, bodyMass: 300 }))
  assert.throws(() => generateWorkout({ ...profile, bodyMass: 19 }), /20 et 300 kg/)
  assert.throws(() => generateWorkout({ ...profile, bodyMass: 301 }), /20 et 300 kg/)
  assert.throws(() => generateWorkout({ ...profile, firstName: 'a'.repeat(41) }), /40 caractères/)
})

test('scheduled sessions are planned and invalid objectives are rejected', () => {
  const workout = generateWorkout(profile, { objective: 'general', scheduledFor: '2026-11-01' })
  assert.equal(workout.status, 'planned')
  assert.equal(workout.scheduledFor, '2026-11-01')
  assert.throws(() => generateWorkout(profile, { objective: 'unknown' }), /objectif valide/i)
  assert.throws(() => generateWorkout(profile, { scheduledFor: '2026-02-31' }), /date de planification valide/i)
})

test('empty muscle selection still produces a general session', () => {
  const workout = generateWorkout({ ...profile, muscles: [] }, { objective: 'general' })
  assert.ok(workout.exercises.length >= 4)
})

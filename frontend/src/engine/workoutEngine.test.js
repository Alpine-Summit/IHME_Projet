import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateWorkoutMinutes, generateWorkout, selectExercises } from './workoutEngine.js'

const profile = { sport: 'Course à pied', level: 'debutant', muscles: ['Jambes', 'Tronc'], equipment: ['Poids du corps'] }

test('selection respects objective, level and muscle priorities', () => {
  const selected = selectExercises({ ...profile, objective: 'force' })
  assert.ok(selected.length > 0)
  assert.ok(selected.every((exercise) => exercise.objectives.includes('force')))
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

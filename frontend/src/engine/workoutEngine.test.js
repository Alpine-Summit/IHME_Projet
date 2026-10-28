import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateWorkoutMinutes, generateWorkout, selectExercises } from './workoutEngine.js'

const profile = { sport: 'Course à pied', level: 'debutant', muscles: ['Jambes', 'Tronc'], equipment: ['Poids du corps'] }

test('selection respects objective, level and equipment', () => {
  const selected = selectExercises({ ...profile, objective: 'force' })
  assert.ok(selected.length > 0)
  assert.ok(selected.every((exercise) => exercise.equipment.includes('Poids du corps')))
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

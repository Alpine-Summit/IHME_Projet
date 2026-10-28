import { generateWorkout, selectExercises } from '../frontend/src/engine/workoutEngine.js'
import { OBJECTIVES } from '../frontend/src/data/exercises.js'

export const objectives = Object.fromEntries(OBJECTIVES.map((objective) => [objective.id, objective]))

// L’API conserve la même règle métier locale que le frontend React.
export function buildWorkout(databaseExercises = [], profile = {}) {
  const workout = generateWorkout(profile, {
    objective: profile.objective || 'general',
    scheduledFor: profile.scheduledFor || null,
  })
  const idsByName = new Map(databaseExercises.map((exercise) => [exercise.name, exercise.id]))
  return {
    ...workout,
    exercises: workout.exercises.map((exercise, index) => ({
      ...exercise,
      canonicalExerciseId: exercise.exerciseId,
      exerciseId: idsByName.get(exercise.name) ?? null,
      orderIndex: index,
    })),
  }
}

export { selectExercises }

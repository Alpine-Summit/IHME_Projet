import { generateWorkout, selectExercises } from '../frontend/src/engine/workoutEngine.js'
import { OBJECTIVES } from '../frontend/src/data/exercises.js'

export const objectives = Object.fromEntries(OBJECTIVES.map((objective) => [objective.id, objective]))

// L’API réutilise exactement le moteur appelé par le frontend React.
// databaseExercises sert uniquement à relier les identifiants SQL historiques.
export function buildWorkout(databaseExercises = [], profile = {}) {
  const workout = generateWorkout(profile, {
    objective: profile.objective || 'general',
    duration: profile.duration || 45,
    scheduledFor: profile.scheduledFor || null,
  })
  const idsByName = new Map(databaseExercises.map((exercise) => [exercise.name, exercise.id]))
  return {
    ...workout,
    duration: workout.targetDuration,
    warmupMinutes: workout.warmup.minutes,
    exercises: workout.exercises.map((exercise, index) => ({
      ...exercise,
      canonicalExerciseId: exercise.exerciseId,
      exerciseId: idsByName.get(exercise.name) ?? null,
      orderIndex: index,
    })),
  }
}

export { selectExercises }

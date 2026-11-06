function copyExercise(exercise) {
  return {
    ...exercise,
    muscles: [...(exercise.muscles || [])],
    equipment: [...(exercise.equipment || [])],
    performance: Array.isArray(exercise.performance) ? [...exercise.performance] : [],
    loadSuggestion: exercise.loadSuggestion ? { ...exercise.loadSuggestion } : null,
  }
}

export function snapshotWorkout(workout) {
  return {
    title: workout.title,
    objective: workout.objective,
    muscles: [...(workout.muscles || [])],
    scheduledFor: workout.scheduledFor,
    warmup: workout.warmup ? { ...workout.warmup } : null,
    safety: workout.safety || '',
    variationNote: workout.variationNote || '',
    exercises: workout.exercises.map(copyExercise),
  }
}

export function createRealization(exercises) {
  return {
    exercises: exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: '',
      reps: '',
      restSeconds: '',
      load: '',
      skipped: false,
      legacyResult: Array.isArray(exercise.performance) ? exercise.performance.filter(Boolean).join(' · ') : '',
    })),
  }
}

export function beginWorkout(workout, now = new Date().toISOString()) {
  if (!['planned', 'postponed'].includes(workout.status)) return workout
  const plannedSnapshot = snapshotWorkout(workout)
  return {
    ...workout,
    status: 'started',
    startedAt: now,
    plannedSnapshot,
    realization: createRealization(plannedSnapshot.exercises),
    notes: workout.notes || {},
  }
}

export function completeWorkout(workout, now = new Date().toISOString()) {
  if (workout.status !== 'started' || !workout.plannedSnapshot || !workout.realization) return workout
  return { ...workout, status: 'completed', completedAt: now }
}

import { EXERCISES, OBJECTIVES } from '../data/exercises.js'

const objectiveConfig = (id) => OBJECTIVES.find((objective) => objective.id === id) || OBJECTIVES.at(-1)
const levelRank = { debutant: 0, intermediaire: 1, avance: 2 }

function warmupFor(sport, objective) {
  const sportText = sport === 'Cyclisme' ? 'mobilité des hanches et activation des jambes' : sport === 'Course à pied' ? 'mise en route progressive, mobilité des chevilles et activation des hanches' : 'mise en route progressive, mobilité et activation générale'
  return { minutes: objective === 'pliometrie' || objective === 'puissance' ? 10 : 8, description: `${sportText}, puis deux répétitions faciles du premier mouvement.` }
}

export function selectExercises({ sport, objective, level, muscles = [] }) {
  const targetGroups = new Set(muscles)
  const rank = levelRank[level] ?? 0
  return EXERCISES
    .filter((exercise) => exercise.objectives.includes(objective))
    .filter((exercise) => exercise.sports.includes(sport) || exercise.sports.includes('Autre'))
    .filter((exercise) => exercise.levels.some((item) => levelRank[item] <= rank))
    .sort((a, b) => {
      const aGroup = targetGroups.size > 0 && a.muscles.some((muscle) => targetGroups.has(muscle)) ? 1 : 0
      const bGroup = targetGroups.size > 0 && b.muscles.some((muscle) => targetGroups.has(muscle)) ? 1 : 0
      return bGroup - aGroup
    })
}

export function estimateExerciseMinutes(item) {
  const sets = Number(item.sets) || 0
  const reps = Number.parseInt(String(item.reps), 10) || 8
  const workSeconds = item.durationSeconds || Math.max(25, reps * 4)
  return Math.ceil((sets * workSeconds + Math.max(0, sets - 1) * (Number(item.restSeconds) || 60) + 30) / 60)
}

export function estimateWorkoutMinutes(workout) {
  return (workout.warmup?.minutes || 0) + (workout.exercises || []).reduce((total, exercise) => total + estimateExerciseMinutes(exercise), 0)
}

export function prescribeExercise(exercise, objective, level) {
  const config = objectiveConfig(objective)
  const beginner = level === 'debutant'
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    description: exercise.description,
    muscles: exercise.muscles,
    equipment: exercise.equipment,
    instruction: exercise.instruction,
    errors: exercise.errors,
    precautions: exercise.precautions,
    easier: exercise.easier,
    harder: exercise.harder,
    sets: beginner ? Math.max(2, config.sets - 1) : config.sets,
    reps: config.reps,
    restSeconds: beginner ? Math.max(60, config.restSeconds - 15) : config.restSeconds,
    difficulty: level,
    load: '',
    performance: [],
  }
}

export function generateWorkout(profile, { objective = 'general', duration = 45, scheduledFor = null } = {}) {
  const config = objectiveConfig(objective)
  const selected = selectExercises({ ...profile, objective }).slice(0, Math.max(2, Math.min(6, Math.floor((Number(duration) - 10) / 7))))
  if (!selected.length) throw new Error('Aucun exercice compatible avec le matériel et le profil sélectionnés.')
  const workout = {
    id: crypto.randomUUID(),
    title: `${config.label} — ${duration} min`,
    sport: profile.sport || 'Renforcement général',
    objective,
    targetDuration: Number(duration),
    scheduledFor: scheduledFor || null,
    status: scheduledFor ? 'planned' : 'generated',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    warmup: warmupFor(profile.sport, objective),
    safety: objective === 'pliometrie' ? 'La qualité des réceptions prime. Réduisez le volume si elles deviennent bruyantes ou instables.' : 'Arrêtez en cas de douleur et choisissez une difficulté qui permet de garder une technique propre.',
    exercises: selected.map((exercise) => prescribeExercise(exercise, objective, profile.level)),
  }
  return { ...workout, estimatedMinutes: estimateWorkoutMinutes(workout) }
}

export function refreshWorkout(workout) {
  return { ...workout, estimatedMinutes: estimateWorkoutMinutes(workout), updatedAt: new Date().toISOString() }
}

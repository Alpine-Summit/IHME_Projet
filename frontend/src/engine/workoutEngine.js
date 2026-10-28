import { EXERCISES, OBJECTIVES } from '../data/exercises.js'

const levelRank = { debutant: 0, intermediaire: 1, avance: 2 }
const objectiveConfig = (id) => OBJECTIVES.find((objective) => objective.id === id) || OBJECTIVES.at(-1)

function warmupFor(objective) {
  const description = objective === 'pliometrie' || objective === 'puissance'
    ? 'Activation progressive des articulations, éducatifs de réception et répétitions techniques à faible intensité.'
    : 'Mise en route progressive, mobilité des zones ciblées et répétitions techniques du premier mouvement.'
  return { description }
}

export function selectExercises({ objective, level, muscles = [], recentWorkouts = [] }) {
  const targetGroups = new Set(muscles)
  const rank = levelRank[level] ?? 0
  const recentCounts = new Map()
  recentWorkouts.slice(0, 3).flatMap((workout) => workout.exercises || []).forEach((exercise) => {
    recentCounts.set(exercise.exerciseId, (recentCounts.get(exercise.exerciseId) || 0) + 1)
  })
  return EXERCISES
    .filter((exercise) => exercise.objectives.includes(objective))
    .filter((exercise) => exercise.levels.some((item) => levelRank[item] <= rank))
    .sort((a, b) => {
      const aTarget = targetGroups.size > 0 && a.muscles.some((muscle) => targetGroups.has(muscle)) ? 1 : 0
      const bTarget = targetGroups.size > 0 && b.muscles.some((muscle) => targetGroups.has(muscle)) ? 1 : 0
      const aRecent = recentCounts.get(a.id) || 0
      const bRecent = recentCounts.get(b.id) || 0
      return (bTarget - aTarget) || (aRecent - bRecent)
    })
}

function roundLoad(value) { return Math.max(0.5, Math.round(value * 2) / 2) }

export function suggestExternalLoad(exercise, bodyMass, level, objective) {
  const mass = Number(bodyMass)
  if (!Number.isFinite(mass) || mass <= 0 || exercise.equipment.every((item) => item === 'Poids du corps') || exercise.equipment.includes('Machines')) return null
  const levelRanges = { debutant: [0.25, 0.4], intermediaire: [0.4, 0.6], avance: [0.55, 0.8] }
  const [low, high] = levelRanges[level] || levelRanges.debutant
  let factors = exercise.group === 'Haut du corps' ? [low * 0.35, high * 0.35] : exercise.group === 'Tronc' ? [low * 0.2, high * 0.3] : [low, high]
  if (objective === 'puissance' || objective === 'pliometrie') factors = [factors[0] * 0.5, factors[1] * 0.5]
  if (exercise.name.includes('Curl') || exercise.name.includes('Élévations') || exercise.name.includes('Extension triceps')) factors = [low * 0.12, high * 0.18]
  return { minKg: roundLoad(mass * factors[0]), maxKg: roundLoad(mass * factors[1]), note: 'charge externe totale indicative' }
}

export function prescribeExercise(exercise, objective, level, bodyMass) {
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
    loadSuggestion: suggestExternalLoad(exercise, bodyMass, level, objective),
    performance: [],
  }
}

export function generateWorkout(profile, { objective = 'general', scheduledFor = null, recentWorkouts = [] } = {}) {
  if (!profile?.level || !Object.hasOwn(levelRank, profile.level)) throw new Error('Sélectionnez votre niveau avant de générer une séance.')
  if (!OBJECTIVES.some((item) => item.id === objective)) throw new Error('Sélectionnez un objectif valide.')
  const config = objectiveConfig(objective)
  const candidates = selectExercises({ ...profile, objective, recentWorkouts })
  if (!candidates.length) throw new Error('Aucun exercice compatible avec vos critères. Essayez un autre objectif ou un autre groupe musculaire.')
  const targetGroups = new Set(profile.muscles || [])
  const targeted = targetGroups.size ? candidates.filter((exercise) => exercise.muscles.some((muscle) => targetGroups.has(muscle))) : candidates
  const selected = [...targeted, ...candidates.filter((exercise) => !targeted.includes(exercise))].slice(0, Math.min(6, Math.max(4, candidates.length)))
  return {
    id: crypto.randomUUID(),
    title: `${config.label} · séance personnalisée`,
    bodyMass: Number(profile.bodyMass) || null,
    objective,
    muscles: profile.muscles || [],
    variationNote: recentWorkouts.length ? 'Sélection alternée avec vos séances récentes pour limiter les répétitions.' : 'Première séance de cette préparation : les prochaines propositions varieront selon votre historique.',
    scheduledFor: scheduledFor || null,
    status: scheduledFor ? 'planned' : 'generated',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    warmup: warmupFor(objective),
    safety: objective === 'pliometrie' ? 'La qualité des réceptions prime. Réduisez le volume si elles deviennent bruyantes ou instables.' : 'Arrêtez en cas de douleur et choisissez une difficulté qui permet de garder une technique propre.',
    exercises: selected.map((exercise) => prescribeExercise(exercise, objective, profile.level, profile.bodyMass)),
  }
}

export function refreshWorkout(workout) {
  return { ...workout, updatedAt: new Date().toISOString() }
}

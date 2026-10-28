import { EXERCISES, OBJECTIVES } from '../data/exercises.js'

export const MIN_WORKOUT_EXERCISES = 4
const MAX_GENERATED_EXERCISES = 6
const objectiveConfig = (id) => OBJECTIVES.find((objective) => objective.id === id) || OBJECTIVES.at(-1)

function warmupFor(objective) {
  const description = objective === 'pliometrie' || objective === 'puissance'
    ? 'Activation progressive des articulations, éducatifs de réception et répétitions techniques à faible intensité.'
    : 'Mise en route progressive, mobilité des zones ciblées et répétitions techniques du premier mouvement.'
  return { description }
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

export function selectExercises({ objective, muscles = [], recentWorkouts = [] }) {
  const targetGroups = new Set(muscles)
  const recentCounts = new Map()
  recentWorkouts.slice(0, 3).flatMap((workout) => workout.exercises || []).forEach((exercise) => {
    recentCounts.set(exercise.exerciseId, (recentCounts.get(exercise.exerciseId) || 0) + 1)
  })
  return EXERCISES
    .filter((exercise) => exercise.objectives.includes(objective) && exercise.levels?.includes('avance'))
    .sort((a, b) => {
      const aTarget = targetGroups.size > 0 && a.muscles.some((muscle) => targetGroups.has(muscle)) ? 1 : 0
      const bTarget = targetGroups.size > 0 && b.muscles.some((muscle) => targetGroups.has(muscle)) ? 1 : 0
      const aRecent = recentCounts.get(a.id) || 0
      const bRecent = recentCounts.get(b.id) || 0
      return (bTarget - aTarget) || (aRecent - bRecent)
    })
}

function roundLoad(value) { return Math.max(0.5, Math.round(value * 2) / 2) }

export function suggestExternalLoad(exercise, bodyMass, objective) {
  const mass = Number(bodyMass)
  if (!Number.isFinite(mass) || mass <= 0 || exercise.equipment.every((item) => item === 'Poids du corps') || exercise.equipment.includes('Machines')) return null
  const [low, high] = [0.55, 0.8]
  let factors = exercise.group === 'Haut du corps' ? [low * 0.35, high * 0.35] : exercise.group === 'Tronc' ? [low * 0.2, high * 0.3] : [low, high]
  if (objective === 'puissance' || objective === 'pliometrie') factors = [factors[0] * 0.5, factors[1] * 0.5]
  if (exercise.name.includes('Curl') || exercise.name.includes('Élévations') || exercise.name.includes('Extension triceps')) factors = [low * 0.12, high * 0.18]
  return { minKg: roundLoad(mass * factors[0]), maxKg: roundLoad(mass * factors[1]), note: 'charge externe totale indicative' }
}

export function prescribeExercise(exercise, objective, bodyMass) {
  const config = objectiveConfig(objective)
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
    sets: config.sets,
    reps: config.reps,
    restSeconds: config.restSeconds,
    load: '',
    loadSuggestion: suggestExternalLoad(exercise, bodyMass, objective),
    performance: [],
  }
}

export function generateWorkout(profile = {}, { objective = 'general', scheduledFor = null, recentWorkouts = [], title = '' } = {}) {
  if (!OBJECTIVES.some((item) => item.id === objective)) throw new Error('Sélectionnez un objectif valide.')
  if (typeof title !== 'string' || title.length > 100) throw new Error('Le titre de séance doit être un texte de 100 caractères maximum.')
  if (profile.firstName != null && (typeof profile.firstName !== 'string' || profile.firstName.length > 40)) throw new Error('Le prénom doit contenir au maximum 40 caractères.')
  const mass = profile?.bodyMass === '' || profile?.bodyMass == null ? null : Number(profile.bodyMass)
  if (mass !== null && (!Number.isFinite(mass) || mass < 20 || mass > 300)) throw new Error('La masse corporelle doit être comprise entre 20 et 300 kg.')
  if (scheduledFor == null || scheduledFor === '') throw new Error('Choisissez une date pour planifier la séance.')
  if (!isValidDate(scheduledFor)) throw new Error('Choisissez une date de planification valide.')
  const config = objectiveConfig(objective)
  const candidates = selectExercises({ ...profile, objective, recentWorkouts })
  if (!candidates.length) throw new Error('Aucun exercice compatible avec vos critères. Essayez un autre objectif ou un autre groupe musculaire.')
  if (candidates.length < MIN_WORKOUT_EXERCISES) throw new Error(`Le catalogue doit proposer au moins ${MIN_WORKOUT_EXERCISES} exercices pour cet objectif.`)
  const targetGroups = new Set(profile.muscles || [])
  const targeted = targetGroups.size ? candidates.filter((exercise) => exercise.muscles.some((muscle) => targetGroups.has(muscle))) : candidates
  const selected = []
  const coveredTargets = new Set()
  for (const exercise of targeted) {
    const newlyCovered = exercise.muscles.filter((muscle) => targetGroups.has(muscle) && !coveredTargets.has(muscle))
    if (newlyCovered.length) {
      selected.push(exercise)
      newlyCovered.forEach((muscle) => coveredTargets.add(muscle))
    }
  }
  const targetCount = Math.max(MAX_GENERATED_EXERCISES, selected.length)
  for (const exercise of candidates) {
    if (selected.length >= targetCount) break
    if (!selected.includes(exercise)) selected.push(exercise)
  }
  return {
    id: crypto.randomUUID(),
    title: title.trim() || `${config.label} · séance personnalisée`,
    bodyMass: mass,
    objective,
    muscles: profile.muscles || [],
    variationNote: recentWorkouts.length ? 'Sélection alternée avec vos séances récentes pour limiter les répétitions.' : 'Première séance de cette préparation : les prochaines propositions varieront selon votre historique.',
    scheduledFor,
    status: 'planned',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    warmup: warmupFor(objective),
    safety: objective === 'pliometrie' ? 'La qualité des réceptions prime. Réduisez le volume si elles deviennent bruyantes ou instables.' : 'Arrêtez en cas de douleur et choisissez une difficulté qui permet de garder une technique propre.',
    exercises: selected.map((exercise) => prescribeExercise(exercise, objective, profile.bodyMass)),
  }
}

export function refreshWorkout(workout) {
  return { ...workout, updatedAt: new Date().toISOString() }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const WORKOUT_STATUSES = new Set(['planned', 'started', 'completed', 'postponed', 'cancelled'])

export function isWorkoutId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function validateWorkoutForSync(workout, clientId, validObjectives) {
  if (!workout || typeof workout !== 'object' || Array.isArray(workout)) {
    throw new Error('Données de séance invalides.')
  }
  if (!isWorkoutId(clientId) || workout.id !== clientId) {
    throw new Error('Identifiant de séance invalide.')
  }
  if (typeof workout.title !== 'string' || !workout.title.trim() || workout.title.length > 100) {
    throw new Error('Le titre de la séance doit contenir entre 1 et 100 caractères.')
  }
  if (!validObjectives.has(workout.objective)) {
    throw new Error('Orientation de séance invalide.')
  }
  if (!WORKOUT_STATUSES.has(workout.status)) {
    throw new Error('Statut de séance invalide.')
  }
  const updatedAt = workout.updatedAt || workout.createdAt
    ? Date.parse(workout.updatedAt || workout.createdAt)
    : Date.now()
  if (!Number.isFinite(updatedAt) || updatedAt > Date.now() + 5 * 60 * 1000) {
    throw new Error('Date de modification de la séance invalide.')
  }
  if (!isValidDate(workout.scheduledFor)) {
    throw new Error('Date de planification invalide.')
  }
  if (!Array.isArray(workout.exercises) || workout.exercises.length < 1 || workout.exercises.length > 50) {
    throw new Error('La séance doit contenir entre 1 et 50 exercices.')
  }
  if (Buffer.byteLength(JSON.stringify(workout), 'utf8') > 80_000) {
    throw new Error('La séance dépasse la taille maximale autorisée.')
  }
  return workout
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

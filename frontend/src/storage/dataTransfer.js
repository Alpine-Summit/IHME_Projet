export const DATA_VERSION = 4

function isValidProfile(profile) {
  return profile
    && typeof profile === 'object'
    && !Array.isArray(profile)
    && (profile.firstName == null || (typeof profile.firstName === 'string' && profile.firstName.length <= 40))
    && (profile.bodyMass == null || profile.bodyMass === '' || (Number.isFinite(Number(profile.bodyMass)) && Number(profile.bodyMass) >= 20 && Number(profile.bodyMass) <= 300))
}

function isValidWorkout(workout) {
  return workout
    && typeof workout === 'object'
    && !Array.isArray(workout)
    && typeof workout.id === 'string'
    && typeof workout.title === 'string'
    && workout.title.length <= 100
    && Array.isArray(workout.exercises)
    && workout.exercises.every((exercise) => exercise && typeof exercise === 'object' && !Array.isArray(exercise))
    && ['generated', 'planned', 'started', 'completed'].includes(workout.status)
}

export function exportData(data) {
  const payload = { format: 'apex-training-data', version: DATA_VERSION, exportedAt: new Date().toISOString(), data }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `apex-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function parseImport(text) {
  let payload
  try { payload = JSON.parse(text) } catch { throw new Error('Le fichier sélectionné n’est pas un JSON valide.') }
  const supportedFormats = ['apex-training-data', 'move-training-data']
  const supportedVersions = [1, 2, 3, DATA_VERSION]
  if (!supportedFormats.includes(payload?.format) || !supportedVersions.includes(payload.version) || !isValidProfile(payload.data?.profile) || !Array.isArray(payload.data.workouts) || !payload.data.workouts.every(isValidWorkout)) throw new Error('Ce fichier n’est pas une sauvegarde APEX valide ou sa version est incompatible.')
  return payload.data
}

export const DATA_VERSION = 2

function isValidProfile(profile) {
  return profile && typeof profile === 'object' && typeof profile.displayName === 'string' && ['debutant', 'intermediaire', 'avance'].includes(profile.level)
}

function isValidWorkout(workout) {
  return workout && typeof workout === 'object' && typeof workout.id === 'string' && typeof workout.title === 'string' && Array.isArray(workout.exercises) && ['generated', 'planned', 'started', 'completed'].includes(workout.status)
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
  if (payload?.format !== 'apex-training-data' || payload.version !== DATA_VERSION || !isValidProfile(payload.data?.profile) || !Array.isArray(payload.data.workouts) || !payload.data.workouts.every(isValidWorkout)) throw new Error('Ce fichier n’est pas une sauvegarde APEX valide ou sa version est incompatible.')
  return payload.data
}

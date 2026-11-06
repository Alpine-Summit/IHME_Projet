function modifiedAt(workout) {
  const timestamp = Date.parse(workout.updatedAt || workout.createdAt || 0)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function timestampForSync(workout) {
  const timestamp = Date.parse(workout.updatedAt || workout.createdAt || Date.now())
  return new Date(Number.isFinite(timestamp) ? timestamp : Date.now()).toISOString()
}

function chooseWorkout(local, remote) {
  if (!local) return remote
  if (!remote) return local
  if (local.status === 'completed' && remote.status !== 'completed') return local
  if (remote.status === 'completed' && local.status !== 'completed') return remote
  return modifiedAt(local) > modifiedAt(remote) ? local : remote
}

export function mergeWorkoutLists(localWorkouts, remoteWorkouts) {
  const merged = new Map(remoteWorkouts.map((workout) => [workout.id, workout]))
  for (const local of localWorkouts) {
    merged.set(local.id, chooseWorkout(local, merged.get(local.id)))
  }
  return [...merged.values()].sort((first, second) => {
    const dateOrder = String(first.scheduledFor || '').localeCompare(String(second.scheduledFor || ''))
    return dateOrder || String(first.createdAt || '').localeCompare(String(second.createdAt || ''))
  })
}

function mergeForSync(localWorkouts, remoteWorkouts) {
  const remoteById = new Map(remoteWorkouts.map((workout) => [workout.id, workout]))
  const merged = mergeWorkoutLists(localWorkouts, remoteWorkouts)
  const localById = new Map(localWorkouts.map((workout) => [workout.id, workout]))
  const toUpload = merged.filter((workout) => {
    const local = localById.get(workout.id)
    const remote = remoteById.get(workout.id)
    return local === workout && (!remote || JSON.stringify(local) !== JSON.stringify(remote))
  })
  const downloaded = remoteWorkouts.filter((remote) => {
    const local = localById.get(remote.id)
    return !local || (chooseWorkout(local, remote) === remote && JSON.stringify(local) !== JSON.stringify(remote))
  }).length
  return { workouts: merged, toUpload, downloaded }
}

async function readJson(response) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('Le serveur a renvoyé une réponse illisible.')
  }
  return result
}

export async function syncLocalWorkouts(localWorkouts, request = fetch) {
  let uploaded = 0
  let state = { workouts: [...localWorkouts], downloaded: 0 }

  function fail(message, cause, status) {
    const error = new Error(message)
    error.workouts = state.workouts
    error.uploaded = uploaded
    error.downloaded = state.downloaded
    if (cause) error.cause = cause
    if (status) error.status = status
    throw error
  }

  let response
  try {
    response = await request('/api/workouts/sync', { credentials: 'same-origin' })
  } catch (error) {
    fail('Connexion au serveur interrompue.', error)
  }
  const remoteWorkouts = await readJson(response).catch((error) => fail(error.message, error))
  if (!response.ok) fail(remoteWorkouts.error || 'Impossible de récupérer les séances du compte.', undefined, response.status)
  if (!Array.isArray(remoteWorkouts) || remoteWorkouts.some((workout) => !workout || typeof workout.id !== 'string')) {
    fail('Le compte a renvoyé une liste de séances invalide.')
  }

  state = mergeForSync(localWorkouts, remoteWorkouts)
  for (const workout of state.toUpload) {
    const syncedWorkout = {
      ...workout,
      updatedAt: timestampForSync(workout),
    }
    try {
      response = await request(`/api/workouts/${encodeURIComponent(workout.id)}/sync`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout: syncedWorkout }),
      })
    } catch (error) {
      fail('Connexion au serveur interrompue.', error)
    }

    const result = await readJson(response).catch((error) => fail(error.message, error))
    if (response.status === 409 && result.workout) {
      const current = state.workouts.find((item) => item.id === result.workout.id)
      const selected = chooseWorkout(current, result.workout)
      if (selected === result.workout && JSON.stringify(current) !== JSON.stringify(result.workout)) state.downloaded += 1
      state.workouts = mergeWorkoutLists(state.workouts, [result.workout])
      continue
    }
    if (!response.ok) fail(result.error || 'La synchronisation a échoué.', undefined, response.status)
    state.workouts = mergeWorkoutLists(state.workouts, [syncedWorkout])
    uploaded += 1
  }

  return { workouts: state.workouts, uploaded, downloaded: state.downloaded }
}

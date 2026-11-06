export async function syncLocalWorkouts(workouts, request = fetch) {
  let synchronized = 0

  for (const workout of workouts) {
    let response
    try {
      response = await request(`/api/workouts/${encodeURIComponent(workout.id)}/sync`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout }),
      })
    } catch {
      const error = new Error('Connexion au serveur interrompue.')
      error.synchronized = synchronized
      throw error
    }

    let result
    try {
      result = await response.json()
    } catch {
      const error = new Error('Le serveur a renvoyé une réponse illisible.')
      error.synchronized = synchronized
      throw error
    }
    if (!response.ok) {
      const error = new Error(result.error || 'La synchronisation a échoué.')
      error.synchronized = synchronized
      throw error
    }
    synchronized += 1
  }

  return synchronized
}

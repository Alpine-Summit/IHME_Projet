import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeWorkoutLists, syncLocalWorkouts } from './accountSync.js'

const workouts = [
  { id: 'one', title: 'Séance 1' },
  { id: 'two', title: 'Séance 2' },
]

test('syncLocalWorkouts downloads account workouts and uploads only local changes', async () => {
  const requests = []
  const result = await syncLocalWorkouts(workouts, async (url, options) => {
    requests.push({ url, options })
    if (url === '/api/workouts/sync') {
      return { ok: true, json: async () => [{ id: 'remote-only', title: 'Remote session', scheduledFor: '2026-11-07', createdAt: '2026-11-06T09:00:00Z' }] }
    }
    return { ok: true, json: async () => ({ synchronized: true }) }
  })

  assert.equal(result.uploaded, 2)
  assert.equal(result.downloaded, 1)
  assert.equal(result.workouts.length, 3)
  assert.equal(requests[0].url, '/api/workouts/sync')
  assert.equal(requests[1].url, '/api/workouts/one/sync')
  assert.equal(requests[2].url, '/api/workouts/two/sync')
  assert.ok(requests.every(({ options }) => options.credentials === 'same-origin'))
  const uploaded = JSON.parse(requests[1].options.body).workout
  assert.equal(uploaded.title, workouts[0].title)
  assert.ok(Number.isFinite(Date.parse(uploaded.updatedAt)))
  assert.equal(result.workouts.find((workout) => workout.id === 'one').updatedAt, uploaded.updatedAt)
})

test('syncLocalWorkouts reports downloads and successful uploads before a failure', async () => {
  let requests = 0
  await assert.rejects(
    syncLocalWorkouts(workouts, async () => {
      requests += 1
      if (requests === 1) return { ok: true, json: async () => [{ id: 'downloaded', title: 'Remote', scheduledFor: '2026-11-06' }] }
      return requests === 2
        ? { ok: true, json: async () => ({ synchronized: true }) }
        : { ok: false, json: async () => ({ error: 'Compte non connecté.' }) }
    }),
    (error) => error.message === 'Compte non connecté.'
      && error.uploaded === 1
      && error.downloaded === 1
      && error.workouts.some((workout) => workout.id === 'downloaded'),
  )
})

test('syncLocalWorkouts handles an empty local collection', async () => {
  const result = await syncLocalWorkouts([], async (url) => {
    assert.equal(url, '/api/workouts/sync')
    return { ok: true, json: async () => [] }
  })
  assert.deepEqual(result, { workouts: [], uploaded: 0, downloaded: 0 })
})

test('syncLocalWorkouts exposes an expired session so the app can request sign-in', async () => {
  await assert.rejects(
    syncLocalWorkouts([], async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Connexion requise.' }),
    })),
    (error) => error.status === 401 && error.message === 'Connexion requise.',
  )
})

test('mergeWorkoutLists downloads remote-only sessions and preserves the newer version', async () => {
  const local = { id: 'same', title: 'Local newer', status: 'planned', scheduledFor: '2026-11-06', updatedAt: '2026-11-06T12:00:00Z' }
  const remote = { id: 'same', title: 'Remote older', status: 'planned', scheduledFor: '2026-11-06', updatedAt: '2026-11-06T10:00:00Z' }
  const completed = { ...local, id: 'completed', status: 'completed', updatedAt: '2026-11-06T09:00:00Z' }
  const stalePlanned = { ...completed, status: 'planned', updatedAt: '2026-11-06T14:00:00Z' }
  const merged = mergeWorkoutLists([local, stalePlanned], [remote, completed, { id: 'remote-only', title: 'Remote' }])

  assert.equal(merged.find((workout) => workout.id === 'same').title, 'Local newer')
  assert.equal(merged.find((workout) => workout.id === 'completed').status, 'completed')
  assert.ok(merged.some((workout) => workout.id === 'remote-only'))
})

test('syncLocalWorkouts merges a stale-write response from a concurrent device', async () => {
  const local = { id: 'same', title: 'Offline edit', objective: 'force', status: 'planned', scheduledFor: '2026-11-06', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T12:00:00Z', exercises: [] }
  const remote = { ...local, title: 'Other device edit', updatedAt: '2026-11-06T13:00:00Z' }
  const result = await syncLocalWorkouts([local], async (url) => url === '/api/workouts/sync'
    ? { ok: true, json: async () => [] }
    : { status: 409, ok: false, json: async () => ({ workout: remote }) })

  assert.equal(result.workouts[0].title, 'Other device edit')
  assert.equal(result.uploaded, 0)
  assert.equal(result.downloaded, 1)
})

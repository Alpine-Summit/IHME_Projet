import test from 'node:test'
import assert from 'node:assert/strict'
import { syncLocalWorkouts } from './accountSync.js'

const workouts = [
  { id: 'one', title: 'Séance 1' },
  { id: 'two', title: 'Séance 2' },
]

test('syncLocalWorkouts sends each local workout with the current account cookie', async () => {
  const requests = []
  const count = await syncLocalWorkouts(workouts, async (url, options) => {
    requests.push({ url, options })
    return { ok: true, json: async () => ({ synchronized: true }) }
  })

  assert.equal(count, 2)
  assert.equal(requests[0].url, '/api/workouts/one/sync')
  assert.equal(requests[1].url, '/api/workouts/two/sync')
  assert.ok(requests.every(({ options }) => options.credentials === 'same-origin'))
  assert.deepEqual(JSON.parse(requests[0].options.body), { workout: workouts[0] })
})

test('syncLocalWorkouts reports how many sessions succeeded before a failure', async () => {
  let requests = 0
  await assert.rejects(
    syncLocalWorkouts(workouts, async () => {
      requests += 1
      return requests === 1
        ? { ok: true, json: async () => ({ synchronized: true }) }
        : { ok: false, json: async () => ({ error: 'Compte non connecté.' }) }
    }),
    (error) => error.message === 'Compte non connecté.' && error.synchronized === 1,
  )
})

test('syncLocalWorkouts handles an empty local collection', async () => {
  assert.equal(await syncLocalWorkouts([], async () => assert.fail('No request expected')), 0)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { isWorkoutId, validateWorkoutForSync } from './workoutSync.js'

const id = '0b6760d5-972a-4a2d-b0d8-fd59e511b48e'
const validObjectives = new Set(['force', 'general'])
const workout = {
  id,
  title: 'Force — bas du corps',
  objective: 'force',
  scheduledFor: '2026-11-06',
  status: 'completed',
  exercises: [{ name: 'Squat' }],
  plannedSnapshot: { exercises: [{ sets: 3 }] },
  realization: { exercises: [{ sets: 2 }] },
  notes: { fatigue: 'modérée' },
}

test('workout sync accepts a complete local workout while retaining realization data', () => {
  const result = validateWorkoutForSync(workout, id, validObjectives)
  assert.equal(result, workout)
  assert.equal(result.realization.exercises[0].sets, 2)
  assert.equal(result.notes.fatigue, 'modérée')
})

test('workout sync rejects mismatched or invalid client identifiers', () => {
  assert.equal(isWorkoutId(id), true)
  assert.equal(isWorkoutId('not-a-uuid'), false)
  assert.throws(() => validateWorkoutForSync(workout, 'not-a-uuid', validObjectives), /Identifiant/)
})

test('workout sync rejects invalid objective, status, date, and exercise count', () => {
  assert.throws(() => validateWorkoutForSync({ ...workout, objective: 'unknown' }, id, validObjectives), /Orientation/)
  assert.throws(() => validateWorkoutForSync({ ...workout, status: 'deleted' }, id, validObjectives), /Statut/)
  assert.throws(() => validateWorkoutForSync({ ...workout, updatedAt: 'not-a-date' }, id, validObjectives), /modification/)
  assert.throws(() => validateWorkoutForSync({ ...workout, scheduledFor: '2026-02-31' }, id, validObjectives), /Date/)
  assert.throws(() => validateWorkoutForSync({ ...workout, exercises: [] }, id, validObjectives), /exercices/)
})

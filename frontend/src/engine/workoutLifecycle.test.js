import test from 'node:test'
import assert from 'node:assert/strict'
import { beginWorkout, completeWorkout } from './workoutLifecycle.js'

const planned = {
  id: 'session-1',
  title: 'Force — bas du corps',
  objective: 'force',
  muscles: ['Quadriceps'],
  scheduledFor: '2026-11-06',
  status: 'planned',
  exercises: [{ exerciseId: 'squat', name: 'Squat', muscles: ['Quadriceps'], equipment: ['Barre'], sets: 3, reps: '5–8', restSeconds: 120, load: '40 kg' }],
}

test('starting a workout freezes a copied plan and creates independent actual values', () => {
  const started = beginWorkout(planned, '2026-11-06T09:00:00.000Z')
  assert.equal(started.status, 'started')
  assert.notEqual(started.plannedSnapshot.exercises[0], started.exercises[0])
  assert.deepEqual(started.realization.exercises[0], {
    exerciseId: 'squat', sets: '', reps: '', restSeconds: '', load: '', skipped: false, legacyResult: '',
  })

  const edited = {
    ...started,
    exercises: [{ ...started.exercises[0], sets: 1 }],
    realization: { exercises: [{ ...started.realization.exercises[0], sets: 2, reps: '8 / 7', load: '42 kg' }] },
  }
  assert.equal(edited.plannedSnapshot.exercises[0].sets, 3)
  assert.equal(edited.exercises[0].sets, 1)
  assert.equal(edited.realization.exercises[0].sets, 2)
})

test('only an in-progress workout can be completed and completion preserves both records', () => {
  const started = beginWorkout(planned, '2026-11-06T09:00:00.000Z')
  const completed = completeWorkout({
    ...started,
    realization: { exercises: [{ exerciseId: 'squat', sets: 3, reps: '8 / 8 / 7', restSeconds: 120, load: '40 kg', skipped: false }] },
  }, '2026-11-06T10:00:00.000Z')

  assert.equal(completed.status, 'completed')
  assert.equal(completed.plannedSnapshot.exercises[0].sets, 3)
  assert.equal(completed.realization.exercises[0].reps, '8 / 8 / 7')
  assert.equal(completeWorkout(planned), planned)
  assert.equal(beginWorkout(started), started)
})

test('existing free-text exercise results are retained during migration', () => {
  const legacy = { ...planned, exercises: [{ ...planned.exercises[0], performance: ['3 × 8, RPE 7'] }] }
  const started = beginWorkout(legacy)
  assert.equal(started.realization.exercises[0].legacyResult, '3 × 8, RPE 7')
})

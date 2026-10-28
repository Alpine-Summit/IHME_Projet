import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA_VERSION, parseImport } from './dataTransfer.js'

const validData = { version: DATA_VERSION, profile: { firstName: 'Alex', bodyMass: '' }, workouts: [] }

test('JSON import accepts a versioned APEX backup', () => {
  const result = parseImport(JSON.stringify({ format: 'apex-training-data', version: DATA_VERSION, data: validData }))
  assert.equal(result.profile.firstName, 'Alex')
  assert.equal(result.profile.bodyMass, '')
})

test('JSON import keeps older versioned backups available for local migration', () => {
  const legacyData = { ...validData, profile: { displayName: 'Alex', sport: 'Course à pied', level: 'avance', bodyMass: 72 } }
  const result = parseImport(JSON.stringify({ format: 'move-training-data', version: 1, data: legacyData }))
  assert.equal(result.profile.bodyMass, 72)
})

test('JSON import rejects malformed or incompatible backups', () => {
  assert.throws(() => parseImport('{not-json'), /JSON valide/)
  assert.throws(() => parseImport(JSON.stringify({ format: 'apex-training-data', version: 99, data: validData })), /incompatible/)
  assert.throws(() => parseImport(JSON.stringify({ format: 'apex-training-data', version: DATA_VERSION, data: { ...validData, profile: { firstName: 'x'.repeat(41) } } })), /incompatible/)
  const invalidWorkout = { id: 'session', title: 'Force', status: 'generated', exercises: [null] }
  assert.throws(() => parseImport(JSON.stringify({ format: 'apex-training-data', version: DATA_VERSION, data: { ...validData, workouts: [invalidWorkout] } })), /incompatible/)
})

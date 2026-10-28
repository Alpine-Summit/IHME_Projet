import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA_VERSION, parseImport } from './dataTransfer.js'

const validData = { version: DATA_VERSION, profile: { displayName: 'Alex', level: 'debutant', bodyMass: '' }, workouts: [] }

test('JSON import accepts a versioned APEX backup', () => {
  const result = parseImport(JSON.stringify({ format: 'apex-training-data', version: DATA_VERSION, data: validData }))
  assert.equal(result.profile.level, 'debutant')
})

test('JSON import rejects malformed or incompatible backups', () => {
  assert.throws(() => parseImport('{not-json'), /JSON valide/)
  assert.throws(() => parseImport(JSON.stringify({ format: 'apex-training-data', version: 1, data: validData })), /incompatible/)
})

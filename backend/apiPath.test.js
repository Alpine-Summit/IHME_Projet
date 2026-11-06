import test from 'node:test'
import assert from 'node:assert/strict'
import { stripApiBasePath } from './apiPath.js'

test('stripApiBasePath maps prefixed API paths to the API routes', () => {
  assert.equal(stripApiBasePath('/p18/api/me', '/p18/'), '/api/me')
  assert.equal(stripApiBasePath('/p18/api/workouts/sync?since=1', '/p18'), '/api/workouts/sync?since=1')
})

test('stripApiBasePath leaves root deployments and non-API paths unchanged', () => {
  assert.equal(stripApiBasePath('/api/me', '/'), '/api/me')
  assert.equal(stripApiBasePath('/p18/calendar', '/p18/'), '/p18/calendar')
})

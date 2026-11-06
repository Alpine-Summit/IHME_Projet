import test from 'node:test'
import assert from 'node:assert/strict'
import { apiUrl } from './apiUrl.js'

test('apiUrl keeps API paths at the origin root for a root deployment', () => {
  assert.equal(apiUrl('/me', '/'), '/api/me')
})

test('apiUrl keeps API paths under the configured deployment base path', () => {
  assert.equal(apiUrl('/me', '/p18/'), '/p18/api/me')
  assert.equal(apiUrl('auth/login', '/p18'), '/p18/api/auth/login')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { initializeDatabase } from './database.js'

function createPool(missingTables) {
  const queries = []
  return {
    queries,
    async query(sql) {
      queries.push(sql)
      if (sql.includes('information_schema.tables')) {
        return { rows: missingTables.map((table_name) => ({ table_name })) }
      }
      return { rows: [] }
    },
  }
}

const requiredTables = [
  'users',
  'sessions',
  'profiles',
  'exercises',
  'workouts',
  'workout_exercises',
]

test('initializeDatabase installs the base schema when no application tables exist', async () => {
  const pool = createPool(requiredTables)
  await initializeDatabase(pool, 'initial schema', 'sync migration')

  assert.equal(pool.queries.length, 3)
  assert.match(pool.queries[0], /information_schema\.tables/)
  assert.equal(pool.queries[1], 'initial schema')
  assert.equal(pool.queries[2], 'sync migration')
})

test('initializeDatabase completes an incomplete application schema', async () => {
  const pool = createPool(['workouts', 'workout_exercises'])
  await initializeDatabase(pool, 'initial schema', 'sync migration')

  assert.equal(pool.queries[1], 'initial schema')
  assert.equal(pool.queries[2], 'sync migration')
})

test('initializeDatabase preserves a complete application schema and applies the sync migration', async () => {
  const pool = createPool([])
  await initializeDatabase(pool, 'initial schema', 'sync migration')

  assert.equal(pool.queries.length, 2)
  assert.match(pool.queries[0], /information_schema\.tables/)
  assert.equal(pool.queries[1], 'sync migration')
})

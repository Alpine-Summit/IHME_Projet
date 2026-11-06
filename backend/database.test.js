import test from 'node:test'
import assert from 'node:assert/strict'
import { initializeDatabase } from './database.js'

function createPool(tableCount) {
  const queries = []
  return {
    queries,
    async query(sql) {
      queries.push(sql)
      if (sql.includes('information_schema.tables')) {
        return { rows: [{ table_count: tableCount }] }
      }
      return { rows: [] }
    },
  }
}

test('initializeDatabase installs the base schema only on an empty database', async () => {
  const pool = createPool(0)
  await initializeDatabase(pool, 'initial schema', 'sync migration')

  assert.equal(pool.queries.length, 3)
  assert.match(pool.queries[0], /information_schema\.tables/)
  assert.equal(pool.queries[1], 'initial schema')
  assert.equal(pool.queries[2], 'sync migration')
})

test('initializeDatabase preserves an existing schema and applies the sync migration', async () => {
  const pool = createPool(6)
  await initializeDatabase(pool, 'initial schema', 'sync migration')

  assert.equal(pool.queries.length, 2)
  assert.match(pool.queries[0], /information_schema\.tables/)
  assert.equal(pool.queries[1], 'sync migration')
})

export async function initializeDatabase(pool, initialSchema, syncMigration) {
  const result = await pool.query(`
    SELECT COUNT(*)::int AS table_count
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
  `)

  if (result.rows[0].table_count === 0) {
    await pool.query(initialSchema)
  }

  await pool.query(syncMigration)
}

export async function initializeDatabase(pool, initialSchema, syncMigration) {
  const result = await pool.query(`
    SELECT required.table_name
    FROM unnest(ARRAY[
      'users',
      'sessions',
      'profiles',
      'exercises',
      'workouts',
      'workout_exercises'
    ]::text[]) AS required(table_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.tables AS existing
      WHERE existing.table_schema = current_schema()
        AND existing.table_type = 'BASE TABLE'
        AND existing.table_name = required.table_name
    )
  `)

  if (result.rows.length > 0) {
    await pool.query(initialSchema)
  }

  await pool.query(syncMigration)
}

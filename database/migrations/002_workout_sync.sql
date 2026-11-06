CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS client_workout_id UUID,
  ADD COLUMN IF NOT EXISTS workout_data JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_client_workout_idx
  ON workouts (user_id, client_workout_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '002_workout_sync') THEN
    ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_status_check;
    ALTER TABLE workouts
      ADD CONSTRAINT workouts_status_check
      CHECK (status IN ('generated', 'planned', 'started', 'completed', 'postponed', 'cancelled'));
    INSERT INTO schema_migrations (version) VALUES ('002_workout_sync');
  END IF;
END $$;

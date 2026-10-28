CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(40) NOT NULL DEFAULT '',
  body_mass NUMERIC(5,2),
  goals TEXT[] NOT NULL DEFAULT '{}', muscles TEXT[] NOT NULL DEFAULT '{}', equipment TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(40) NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    EXECUTE 'UPDATE profiles SET first_name = left(split_part(trim(display_name), '' '', 1), 40) WHERE first_name = '''' AND display_name IS NOT NULL AND trim(display_name) <> ''''';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  muscles TEXT[] NOT NULL,
  objectives TEXT[] NOT NULL,
  equipment VARCHAR(120) NOT NULL,
  load_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  easier_variant TEXT,
  harder_variant TEXT
);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instruction TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL, objective VARCHAR(30) NOT NULL,
  scheduled_for DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'planned', 'started', 'completed')),
  completed_at TIMESTAMPTZ, notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workouts_user_scheduled_idx ON workouts(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS workouts_user_status_idx ON workouts(user_id, status);

ALTER TABLE profiles DROP COLUMN IF EXISTS sport;
ALTER TABLE profiles DROP COLUMN IF EXISTS display_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS level;
ALTER TABLE workouts DROP COLUMN IF EXISTS duration_minutes;

CREATE TABLE IF NOT EXISTS workout_exercises (
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id), order_index INTEGER NOT NULL,
  sets INTEGER NOT NULL, reps VARCHAR(30) NOT NULL, rest_seconds INTEGER NOT NULL,
  PRIMARY KEY (workout_id, order_index)
);

ALTER TABLE workout_exercises DROP COLUMN IF EXISTS difficulty;

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0;

INSERT INTO exercises (name, muscles, objectives, equipment, load_percentage, description, easier_variant, harder_variant)
VALUES
('Squat au poids du corps', ARRAY['Quadriceps', 'Fessiers', 'Abdominaux'], ARRAY['force', 'endurance'], 'Poids du corps', 0, 'Un mouvement complet pour solliciter les cuisses, les fessiers et la stabilité du tronc.', 'S’asseoir sur une chaise puis se relever.', 'Ajouter un saut contrôlé ou une charge tenue contre le torse.'),
('Pompes', ARRAY['Pectoraux', 'Triceps', 'Épaules'], ARRAY['force', 'endurance'], 'Poids du corps', 0, 'Un exercice accessible pour renforcer la poussée du haut du corps.', 'Faire les pompes avec les genoux au sol ou contre un mur.', 'Éloigner les mains du corps ou surélever les pieds.'),
('Fente avant', ARRAY['Quadriceps', 'Fessiers', 'Ischio-jambiers'], ARRAY['force', 'puissance', 'endurance'], 'Poids du corps', 0, 'Un exercice unilatéral utile pour travailler les jambes et l’équilibre.', 'Se tenir près d’un support et réduire l’amplitude.', 'Ajouter une poussée dynamique vers le haut.'),
('Mountain climbers', ARRAY['Abdominaux', 'Épaules', 'Fléchisseurs de hanche'], ARRAY['puissance', 'endurance'], 'Poids du corps', 0, 'Un mouvement dynamique qui combine gainage, coordination et sollicitation cardio-musculaire.', 'Ralentir le mouvement et garder les mains sur un support surélevé.', 'Accélérer progressivement en gardant le bassin stable.'),
('Squat avec barre', ARRAY['Quadriceps', 'Fessiers', 'Lombaires'], ARRAY['force', 'puissance', 'endurance'], 'Barre et rack', 55, 'Un exercice guidé par une barre pour développer la force des jambes et du tronc.', 'Commencer avec une barre légère et une amplitude confortable.', 'Augmenter par petites étapes en gardant une technique stable.'),
('Presse à cuisses', ARRAY['Quadriceps', 'Fessiers', 'Mollets'], ARRAY['force', 'endurance'], 'Presse à cuisses', 75, 'Une machine stable pour travailler la poussée des jambes avec un placement contrôlé.', 'Réduire l’amplitude et choisir une charge très légère.', 'Augmenter progressivement sans décoller le bassin du dossier.'),
('Soulevé de terre', ARRAY['Ischio-jambiers', 'Fessiers', 'Lombaires', 'Trapèzes'], ARRAY['force', 'puissance'], 'Barre', 60, 'Un mouvement de charnière de hanche qui sollicite toute la chaîne postérieure.', 'Élever la barre sur des supports et réduire la charge.', 'Augmenter seulement si le dos reste neutre du début à la fin.'),
('Hip thrust', ARRAY['Fessiers', 'Ischio-jambiers'], ARRAY['force', 'puissance', 'endurance'], 'Banc et barre', 45, 'Un mouvement ciblé pour renforcer l’extension de hanche et les fessiers.', 'Réaliser le mouvement au poids du corps.', 'Ajouter une charge légère en marquant une pause en haut.'),
('Leg curl', ARRAY['Ischio-jambiers', 'Mollets'], ARRAY['force', 'endurance'], 'Machine leg curl', 25, 'Une machine d’isolation pour renforcer l’arrière des cuisses.', 'Choisir la charge minimale et ralentir le retour.', 'Ajouter quelques répétitions sans perdre le contrôle.'),
('Élévations mollets', ARRAY['Mollets'], ARRAY['force', 'endurance'], 'Machine à mollets', 35, 'Un exercice simple pour renforcer la poussée de la cheville et les mollets.', 'Commencer debout au poids du corps.', 'Augmenter la charge tout en gardant une amplitude complète.'),
('Développé couché haltères', ARRAY['Pectoraux', 'Triceps', 'Épaules'], ARRAY['force', 'endurance'], 'Banc et haltères', 25, 'Un mouvement de poussée du haut du corps avec une trajectoire libre.', 'Utiliser deux haltères très légers ou des pompes inclinées.', 'Augmenter par petits paliers si les épaules restent confortables.'),
('Tirage vertical', ARRAY['Grand dorsal', 'Biceps', 'Trapèzes'], ARRAY['force', 'endurance'], 'Poulie haute', 30, 'Un tirage vertical pour renforcer le dos et les bras.', 'Réduire la charge et utiliser une amplitude confortable.', 'Marquer une pause quand la barre arrive vers le haut du torse.'),
('Rowing assis à la poulie', ARRAY['Grand dorsal', 'Rhomboïdes', 'Biceps'], ARRAY['force', 'endurance'], 'Poulie basse', 30, 'Un tirage horizontal qui renforce le dos et la stabilité des épaules.', 'Choisir une charge légère et garder le buste immobile.', 'Ralentir le retour pour augmenter le contrôle.'),
('Développé épaules', ARRAY['Épaules', 'Triceps'], ARRAY['force', 'endurance'], 'Machine ou haltères', 20, 'Un mouvement de poussée au-dessus de la tête pour les épaules.', 'Utiliser une machine guidée et une amplitude partielle.', 'Augmenter légèrement la charge sans cambrer le dos.'),
('Curl biceps', ARRAY['Biceps', 'Avant-bras'], ARRAY['force', 'endurance'], 'Haltères', 12, 'Un exercice d’isolation des bras avec une charge facile à contrôler.', 'Utiliser un seul haltère et s’asseoir.', 'Ralentir la descente plutôt que de balancer le buste.'),
('Extension triceps à la poulie', ARRAY['Triceps'], ARRAY['force', 'endurance'], 'Poulie haute', 15, 'Un exercice d’isolation pour renforcer l’extension du coude.', 'Choisir une charge faible et garder les coudes près du corps.', 'Augmenter légèrement la charge sans bouger les épaules.'),
('Planche', ARRAY['Abdominaux', 'Lombaires', 'Épaules'], ARRAY['force', 'endurance'], 'Poids du corps', 0, 'Un exercice de gainage pour apprendre à stabiliser le tronc.', 'Poser les genoux au sol et réduire le temps de maintien.', 'Ajouter du temps par petites étapes sans creuser le dos.'),
('Kettlebell swing', ARRAY['Fessiers', 'Ischio-jambiers', 'Lombaires', 'Épaules'], ARRAY['puissance', 'endurance'], 'Kettlebell', 20, 'Un mouvement explosif de hanche à réaliser dans un espace dégagé.', 'Apprendre la charnière de hanche sans charge.', 'Accélérer l’extension sans tirer avec les bras.'),
('Lancer de medecine-ball', ARRAY['Pectoraux', 'Épaules', 'Abdominaux'], ARRAY['puissance'], 'Medecine-ball', 8, 'Un exercice explosif pour développer la vitesse de production de force.', 'Utiliser un ballon léger et réduire l’amplitude du lancer.', 'Augmenter progressivement la vitesse sans perdre le contrôle.')
ON CONFLICT (name) DO NOTHING;

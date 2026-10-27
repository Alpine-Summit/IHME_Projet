CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  muscles TEXT[] NOT NULL,
  objectives TEXT[] NOT NULL,
  equipment VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  easier_variant TEXT,
  harder_variant TEXT
);

INSERT INTO exercises (name, muscles, objectives, equipment, description, easier_variant, harder_variant)
VALUES
('Squat au poids du corps', ARRAY['Jambes', 'Abdominaux'], ARRAY['force', 'endurance'], 'Poids du corps', 'Un mouvement complet pour solliciter les cuisses, les fessiers et la stabilité du tronc.', 'S’asseoir sur une chaise puis se relever.', 'Ajouter un saut contrôlé ou une charge tenue contre le torse.'),
('Pompes', ARRAY['Pectoraux', 'Bras', 'Épaules'], ARRAY['force', 'endurance'], 'Poids du corps', 'Un exercice accessible pour renforcer la poussée du haut du corps.', 'Faire les pompes avec les genoux au sol ou contre un mur.', 'Éloigner les mains du corps ou surélever les pieds.'),
('Fente avant', ARRAY['Jambes', 'Abdominaux'], ARRAY['force', 'puissance', 'endurance'], 'Poids du corps', 'Un exercice unilatéral utile pour travailler les jambes et l’équilibre.', 'Se tenir près d’un support et réduire l’amplitude.', 'Ajouter une poussée dynamique vers le haut.'),
('Mountain climbers', ARRAY['Abdominaux', 'Épaules', 'Jambes'], ARRAY['puissance', 'endurance'], 'Poids du corps', 'Un mouvement dynamique qui combine gainage, coordination et sollicitation cardio-musculaire.', 'Ralentir le mouvement et garder les mains sur un support surélevé.', 'Accélérer progressivement en gardant le bassin stable.'),
('Rowing avec haltère', ARRAY['Dos', 'Bras'], ARRAY['force'], 'Un haltère', 'Un mouvement de tirage pour renforcer le dos et les muscles qui rapprochent le bras du corps.', 'Utiliser une charge légère et un support pour une main.', 'Augmenter légèrement la charge seulement si la technique reste maîtrisée.'),
('Lancer de medecine-ball', ARRAY['Jambes', 'Épaules', 'Abdominaux'], ARRAY['puissance'], 'Medecine-ball', 'Un exercice explosif à réaliser dans un espace dégagé pour développer la vitesse de production de force.', 'Utiliser un ballon léger et réduire l’amplitude du lancer.', 'Augmenter progressivement la vitesse sans perdre le contrôle.')
ON CONFLICT (name) DO NOTHING;

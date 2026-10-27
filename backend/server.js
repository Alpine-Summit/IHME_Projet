import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const app = express()
const port = Number(process.env.PORT || 3000)
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.join(currentDirectory, '../frontend/dist')

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 4 })
  : null

const exercises = [
  { name: 'Squat au poids du corps', muscles: ['Jambes', 'Abdominaux'], objectives: ['force', 'endurance'], emoji: '🦵', equipment: 'Poids du corps', description: 'Un mouvement complet pour solliciter les cuisses, les fessiers et la stabilité du tronc.', easier: 'S’asseoir sur une chaise puis se relever.', harder: 'Ajouter un saut contrôlé ou une charge tenue contre le torse.' },
  { name: 'Pompes', muscles: ['Pectoraux', 'Bras', 'Épaules'], objectives: ['force', 'endurance'], emoji: '💪', equipment: 'Poids du corps', description: 'Un exercice accessible pour renforcer la poussée du haut du corps.', easier: 'Faire les pompes avec les genoux au sol ou contre un mur.', harder: 'Éloigner les mains du corps ou surélever les pieds.' },
  { name: 'Fente avant', muscles: ['Jambes', 'Abdominaux'], objectives: ['force', 'puissance', 'endurance'], emoji: '🏃', equipment: 'Poids du corps', description: 'Un exercice unilatéral utile pour travailler les jambes et l’équilibre.', easier: 'Se tenir près d’un support et réduire l’amplitude.', harder: 'Ajouter une poussée dynamique vers le haut.' },
  { name: 'Mountain climbers', muscles: ['Abdominaux', 'Épaules', 'Jambes'], objectives: ['puissance', 'endurance'], emoji: '⚡', equipment: 'Poids du corps', description: 'Un mouvement dynamique qui combine gainage, coordination et sollicitation cardio-musculaire.', easier: 'Ralentir le mouvement et garder les mains sur un support surélevé.', harder: 'Accélérer progressivement en gardant le bassin stable.' },
  { name: 'Rowing avec haltère', muscles: ['Dos', 'Bras'], objectives: ['force'], emoji: '🏋️', equipment: 'Un haltère', description: 'Un mouvement de tirage pour renforcer le dos et les muscles qui rapprochent le bras du corps.', easier: 'Utiliser une charge légère et un support pour une main.', harder: 'Augmenter légèrement la charge seulement si la technique reste maîtrisée.' },
  { name: 'Lancer de medecine-ball', muscles: ['Jambes', 'Épaules', 'Abdominaux'], objectives: ['puissance'], emoji: '🎯', equipment: 'Medecine-ball', description: 'Un exercice explosif à réaliser dans un espace dégagé pour développer la vitesse de production de force.', easier: 'Utiliser un ballon léger et réduire l’amplitude du lancer.', harder: 'Augmenter progressivement la vitesse sans perdre le contrôle.' },
]

app.use(express.json())

app.get('/api/health', async (_request, response) => {
  if (!pool) return response.json({ status: 'ok', database: 'not-configured' })
  try {
    await pool.query('SELECT 1')
    return response.json({ status: 'ok', database: 'connected' })
  } catch {
    return response.status(503).json({ status: 'unavailable', database: 'unavailable' })
  }
})

app.get('/api/exercises', async (request, response) => {
  const objective = String(request.query.objective || '')
  const selectedMuscles = String(request.query.muscles || '').split(',').filter(Boolean)
  const fallbackSuggestions = exercises.filter((exercise) =>
    exercise.objectives.includes(objective) &&
    exercise.muscles.some((muscle) => selectedMuscles.includes(muscle)),
  )
  if (!pool) return response.json(fallbackSuggestions)
  try {
    const result = await pool.query(
      `SELECT name, muscles, objectives, equipment, description,
        easier_variant AS easier, harder_variant AS harder
       FROM exercises
       WHERE $1 = ANY(objectives) AND muscles && $2::text[]
       ORDER BY name`,
      [objective, selectedMuscles],
    )
    return response.json(result.rows)
  } catch {
    return response.json(fallbackSuggestions)
  }
})

app.use(express.static(frontendDirectory))
app.get('*splat', (_request, response) => response.sendFile(path.join(frontendDirectory, 'index.html')))

app.listen(port, '0.0.0.0', () => {
  console.log(`Muscle Training App listening on port ${port}`)
})

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
  { name: 'Squat au poids du corps', muscles: ['Quadriceps', 'Fessiers', 'Abdominaux'], objectives: ['force', 'endurance'], emoji: '🦵', equipment: 'Poids du corps', loadPercent: 0, description: 'Un mouvement complet pour solliciter les cuisses, les fessiers et la stabilité du tronc.', easier: 'S’asseoir sur une chaise puis se relever.', harder: 'Ajouter un saut contrôlé ou une charge tenue contre le torse.' },
  { name: 'Pompes', muscles: ['Pectoraux', 'Triceps', 'Épaules'], objectives: ['force', 'endurance'], emoji: '💪', equipment: 'Poids du corps', loadPercent: 0, description: 'Un exercice accessible pour renforcer la poussée du haut du corps.', easier: 'Faire les pompes avec les genoux au sol ou contre un mur.', harder: 'Éloigner les mains du corps ou surélever les pieds.' },
  { name: 'Fente avant', muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'], objectives: ['force', 'puissance', 'endurance'], emoji: '🏃', equipment: 'Poids du corps', loadPercent: 0, description: 'Un exercice unilatéral utile pour travailler les jambes et l’équilibre.', easier: 'Se tenir près d’un support et réduire l’amplitude.', harder: 'Ajouter une poussée dynamique vers le haut.' },
  { name: 'Mountain climbers', muscles: ['Abdominaux', 'Épaules', 'Fléchisseurs de hanche'], objectives: ['puissance', 'endurance'], emoji: '⚡', equipment: 'Poids du corps', loadPercent: 0, description: 'Un mouvement dynamique qui combine gainage, coordination et sollicitation cardio-musculaire.', easier: 'Ralentir le mouvement et garder les mains sur un support surélevé.', harder: 'Accélérer progressivement en gardant le bassin stable.' },
  { name: 'Squat avec barre', muscles: ['Quadriceps', 'Fessiers', 'Lombaires'], objectives: ['force', 'puissance', 'endurance'], emoji: '🏋️', equipment: 'Barre et rack', loadPercent: 55, description: 'Un exercice guidé par une barre pour développer la force des jambes et du tronc.', easier: 'Commencer avec une barre légère et une amplitude confortable.', harder: 'Augmenter par petites étapes en gardant une technique stable.' },
  { name: 'Presse à cuisses', muscles: ['Quadriceps', 'Fessiers', 'Mollets'], objectives: ['force', 'endurance'], emoji: '🦿', equipment: 'Presse à cuisses', loadPercent: 75, description: 'Une machine stable pour travailler la poussée des jambes avec un placement contrôlé.', easier: 'Réduire l’amplitude et choisir une charge très légère.', harder: 'Augmenter progressivement sans décoller le bassin du dossier.' },
  { name: 'Soulevé de terre', muscles: ['Ischio-jambiers', 'Fessiers', 'Lombaires', 'Trapèzes'], objectives: ['force', 'puissance'], emoji: '⚙️', equipment: 'Barre', loadPercent: 60, description: 'Un mouvement de charnière de hanche qui sollicite toute la chaîne postérieure.', easier: 'Élever la barre sur des supports et réduire la charge.', harder: 'Augmenter seulement si le dos reste neutre du début à la fin.' },
  { name: 'Hip thrust', muscles: ['Fessiers', 'Ischio-jambiers'], objectives: ['force', 'puissance', 'endurance'], emoji: '🍑', equipment: 'Banc et barre', loadPercent: 45, description: 'Un mouvement ciblé pour renforcer l’extension de hanche et les fessiers.', easier: 'Réaliser le mouvement au poids du corps.', harder: 'Ajouter une charge légère en marquant une pause en haut.' },
  { name: 'Leg curl', muscles: ['Ischio-jambiers', 'Mollets'], objectives: ['force', 'endurance'], emoji: '🔁', equipment: 'Machine leg curl', loadPercent: 25, description: 'Une machine d’isolation pour renforcer l’arrière des cuisses.', easier: 'Choisir la charge minimale et ralentir le retour.', harder: 'Ajouter quelques répétitions sans perdre le contrôle.' },
  { name: 'Élévations mollets', muscles: ['Mollets'], objectives: ['force', 'endurance'], emoji: '🦶', equipment: 'Machine à mollets', loadPercent: 35, description: 'Un exercice simple pour renforcer la poussée de la cheville et les mollets.', easier: 'Commencer debout au poids du corps.', harder: 'Augmenter la charge tout en gardant une amplitude complète.' },
  { name: 'Développé couché haltères', muscles: ['Pectoraux', 'Triceps', 'Épaules'], objectives: ['force', 'endurance'], emoji: '🏋️', equipment: 'Banc et haltères', loadPercent: 25, description: 'Un mouvement de poussée du haut du corps avec une trajectoire libre.', easier: 'Utiliser deux haltères très légers ou des pompes inclinées.', harder: 'Augmenter par petits paliers si les épaules restent confortables.' },
  { name: 'Tirage vertical', muscles: ['Grand dorsal', 'Biceps', 'Trapèzes'], objectives: ['force', 'endurance'], emoji: '🪢', equipment: 'Poulie haute', loadPercent: 30, description: 'Un tirage vertical pour renforcer le dos et les bras.', easier: 'Réduire la charge et utiliser une amplitude confortable.', harder: 'Marquer une pause quand la barre arrive vers le haut du torse.' },
  { name: 'Rowing assis à la poulie', muscles: ['Grand dorsal', 'Rhomboïdes', 'Biceps'], objectives: ['force', 'endurance'], emoji: '🚣', equipment: 'Poulie basse', loadPercent: 30, description: 'Un tirage horizontal qui renforce le dos et la stabilité des épaules.', easier: 'Choisir une charge légère et garder le buste immobile.', harder: 'Ralentir le retour pour augmenter le contrôle.' },
  { name: 'Développé épaules', muscles: ['Épaules', 'Triceps'], objectives: ['force', 'endurance'], emoji: '🙌', equipment: 'Machine ou haltères', loadPercent: 20, description: 'Un mouvement de poussée au-dessus de la tête pour les épaules.', easier: 'Utiliser une machine guidée et une amplitude partielle.', harder: 'Augmenter légèrement la charge sans cambrer le dos.' },
  { name: 'Curl biceps', muscles: ['Biceps', 'Avant-bras'], objectives: ['force', 'endurance'], emoji: '💪', equipment: 'Haltères', loadPercent: 12, description: 'Un exercice d’isolation des bras avec une charge facile à contrôler.', easier: 'Utiliser un seul haltère et s’asseoir.', harder: 'Ralentir la descente plutôt que de balancer le buste.' },
  { name: 'Extension triceps à la poulie', muscles: ['Triceps'], objectives: ['force', 'endurance'], emoji: '🔻', equipment: 'Poulie haute', loadPercent: 15, description: 'Un exercice d’isolation pour renforcer l’extension du coude.', easier: 'Choisir une charge faible et garder les coudes près du corps.', harder: 'Augmenter légèrement la charge sans bouger les épaules.' },
  { name: 'Planche', muscles: ['Abdominaux', 'Lombaires', 'Épaules'], objectives: ['force', 'endurance'], emoji: '🧱', equipment: 'Poids du corps', loadPercent: 0, description: 'Un exercice de gainage pour apprendre à stabiliser le tronc.', easier: 'Poser les genoux au sol et réduire la durée.', harder: 'Ajouter du temps par petites étapes sans creuser le dos.' },
  { name: 'Kettlebell swing', muscles: ['Fessiers', 'Ischio-jambiers', 'Lombaires', 'Épaules'], objectives: ['puissance', 'endurance'], emoji: '🔔', equipment: 'Kettlebell', loadPercent: 20, description: 'Un mouvement explosif de hanche à réaliser dans un espace dégagé.', easier: 'Apprendre la charnière de hanche sans charge.', harder: 'Accélérer l’extension sans tirer avec les bras.' },
  { name: 'Lancer de medecine-ball', muscles: ['Pectoraux', 'Épaules', 'Abdominaux'], objectives: ['puissance'], emoji: '🎯', equipment: 'Medecine-ball', loadPercent: 8, description: 'Un exercice explosif pour développer la vitesse de production de force.', easier: 'Utiliser un ballon léger et réduire l’amplitude du lancer.', harder: 'Augmenter progressivement la vitesse sans perdre le contrôle.' },
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
      `SELECT name, muscles, objectives, equipment, load_percentage AS "loadPercent", description,
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

import express from 'express'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { buildWorkout, objectives } from './planner.js'

const app = express()
const port = Number(process.env.PORT || 3000)
const root = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.join(root, '../frontend/dist')
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 8 }) : null
const fallback = [
  ['Squat au poids du corps', ['Quadriceps', 'Fessiers'], ['force', 'endurance', 'general'], 'Poids du corps', 'Descendez avec le genou dans l’axe du pied.'],
  ['Pompes inclinées', ['Pectoraux', 'Triceps', 'Épaules'], ['force', 'endurance', 'general'], 'Banc ou mur', 'Gardez le corps gainé et les épaules basses.'],
  ['Fente arrière', ['Quadriceps', 'Fessiers', 'Ischio-jambiers'], ['force', 'puissance', 'general'], 'Poids du corps', 'Poussez dans le sol sans perdre l’équilibre.'],
  ['Planche', ['Abdominaux', 'Épaules'], ['force', 'endurance', 'general'], 'Poids du corps', 'Respirez et gardez le bassin neutre.'],
  ['Kettlebell swing', ['Fessiers', 'Ischio-jambiers'], ['puissance', 'endurance'], 'Kettlebell', 'La puissance vient de l’extension de hanche.'],
  ['Sauts bas amplitude', ['Quadriceps', 'Mollets'], ['pliometrie'], 'Poids du corps', 'Atterrissez silencieusement, genoux stables.'],
  ['Rowing élastique', ['Grand dorsal', 'Biceps'], ['force', 'endurance', 'general'], 'Élastique', 'Rapprochez les omoplates sans hausser les épaules.'],
  ['Pont fessier', ['Fessiers', 'Ischio-jambiers'], ['force', 'endurance', 'general'], 'Poids du corps', 'Marquez une pause en haut sans cambrer.'],
]

app.use(express.json({ limit: '100kb' }))
app.use((request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && process.env.PUBLIC_ORIGIN) {
    const origin = request.get('origin')
    if (origin && origin !== process.env.PUBLIC_ORIGIN) return response.status(403).json({ error: 'Origine refusée.' })
  }
  next()
})

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex')
const cookieFlags = () => `HttpOnly; Path=/; SameSite=Strict${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`
const cookie = (request) => request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('session='))?.slice(8)
function passwordHash(password) { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}` }
function validPassword(password, stored) { const [salt, key] = String(stored).split(':'); return salt && key && crypto.timingSafeEqual(Buffer.from(key, 'hex'), crypto.scryptSync(password, salt, 64)) }
async function auth(request, response, next) {
  if (!pool) return response.status(503).json({ error: 'La base de données est nécessaire.' })
  const token = cookie(request); if (!token) return response.status(401).json({ error: 'Connexion requise.' })
  const result = await pool.query('SELECT u.id, u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()', [hash(token)])
  if (!result.rows[0]) return response.status(401).json({ error: 'Session expirée.' }); request.user = result.rows[0]; next()
}
async function startSession(user, response) { const token = crypto.randomBytes(32).toString('hex'); await pool.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,NOW()+INTERVAL '8 hours')", [user.id, hash(token)]); response.setHeader('Set-Cookie', `session=${token}; ${cookieFlags()}`); response.json({ user }) }
function profile(body) { const bodyMass = body.bodyMass === '' || body.bodyMass == null ? null : Number(body.bodyMass); if (bodyMass !== null && (!Number.isFinite(bodyMass) || bodyMass < 20 || bodyMass > 300)) throw new Error('La masse doit être comprise entre 20 et 300 kg.'); return { displayName: String(body.displayName || '').slice(0, 100), sport: String(body.sport || '').slice(0, 80), level: ['debutant', 'intermediaire', 'avance'].includes(body.level) ? body.level : 'debutant', bodyMass, goals: Array.isArray(body.goals) ? body.goals.slice(0, 8).map(String) : [], muscles: Array.isArray(body.muscles) ? body.muscles.slice(0, 12).map(String) : [], equipment: Array.isArray(body.equipment) ? body.equipment.slice(0, 12).map(String) : [] } }

app.get('/api/health', async (_request, response) => { if (!pool) return response.json({ status: 'ok', database: 'not-configured' }); try { await pool.query('SELECT 1'); response.json({ status: 'ok', database: 'connected' }) } catch { response.status(503).json({ status: 'unavailable' }) } })
app.post('/api/auth/register', async (request, response) => { if (!pool) return response.status(503).json({ error: 'Base de données non configurée.' }); const email = String(request.body.email || '').trim().toLowerCase(); const password = String(request.body.password || ''); if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10) return response.status(400).json({ error: 'Email valide et mot de passe de 10 caractères minimum requis.' }); try { const result = await pool.query('INSERT INTO users (email,password_hash) VALUES ($1,$2) RETURNING id,email', [email, passwordHash(password)]); await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [result.rows[0].id]); await startSession(result.rows[0], response) } catch (error) { if (error.code === '23505') return response.status(409).json({ error: 'Cet email est déjà utilisé.' }); response.status(500).json({ error: 'Inscription impossible.' }) } })
app.post('/api/auth/login', async (request, response) => { if (!pool) return response.status(503).json({ error: 'Base de données non configurée.' }); const email = String(request.body.email || '').trim().toLowerCase(); const result = await pool.query('SELECT id,email,password_hash FROM users WHERE email=$1', [email]); if (!result.rows[0] || !validPassword(String(request.body.password || ''), result.rows[0].password_hash)) return response.status(401).json({ error: 'Identifiants invalides.' }); await startSession(result.rows[0], response) })
app.post('/api/auth/logout', async (request, response) => { const token = cookie(request); if (pool && token) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash(token)]); response.setHeader('Set-Cookie', `session=; Max-Age=0; ${cookieFlags()}`); response.json({ ok: true }) })
app.get('/api/me', auth, async (request, response) => { const result = await pool.query('SELECT display_name AS "displayName",sport,level,body_mass AS "bodyMass",goals,muscles,equipment FROM profiles WHERE user_id=$1', [request.user.id]); response.json({ user: request.user, profile: result.rows[0] }) })
app.put('/api/profile', auth, async (request, response) => { try { const p = profile(request.body); const result = await pool.query('UPDATE profiles SET display_name=$1,sport=$2,level=$3,body_mass=$4,goals=$5,muscles=$6,equipment=$7,updated_at=NOW() WHERE user_id=$8 RETURNING display_name AS "displayName",sport,level,body_mass AS "bodyMass",goals,muscles,equipment', [p.displayName,p.sport,p.level,p.bodyMass,p.goals,p.muscles,p.equipment,request.user.id]); response.json(result.rows[0]) } catch (error) { response.status(400).json({ error: error.message }) } })
app.get('/api/exercises', async (request, response) => { const objective = String(request.query.objective || 'general'); if (!pool) return response.json(fallback.filter((item) => item[2].includes(objective)).map((item, id) => ({ id, name: item[0], muscles: item[1], objectives: item[2], equipment: item[3], instruction: item[4] }))); const result = await pool.query('SELECT id,name,muscles,objectives,equipment,instruction FROM exercises WHERE $1=ANY(objectives) ORDER BY name', [objective]); response.json(result.rows) })
app.post('/api/workouts', auth, async (request, response) => { const { objective = 'general', duration = 45, scheduledFor = null, level = 'debutant' } = request.body; if (!objectives[objective] || ![30,45,60].includes(Number(duration))) return response.status(400).json({ error: 'Paramètres invalides.' }); const rows = await pool.query('SELECT id,name,instruction FROM exercises WHERE $1=ANY(objectives) ORDER BY id LIMIT 8', [objective]); const plan = buildWorkout(rows.rows, { objective, duration, level }); const client = await pool.connect(); try { await client.query('BEGIN'); const result = await client.query('INSERT INTO workouts (user_id,title,objective,duration_minutes,scheduled_for) VALUES ($1,$2,$3,$4,$5) RETURNING *', [request.user.id,plan.title,objective,duration,scheduledFor]); for (const item of plan.exercises) await client.query('INSERT INTO workout_exercises (workout_id,exercise_id,order_index,sets,reps,rest_seconds,difficulty) VALUES ($1,$2,$3,$4,$5,$6,$7)', [result.rows[0].id,item.exerciseId,item.orderIndex,item.sets,item.reps,item.restSeconds,item.difficulty]); await client.query('COMMIT'); response.status(201).json({ ...result.rows[0], ...plan }) } catch { await client.query('ROLLBACK'); response.status(500).json({ error: 'Séance non enregistrée.' }) } finally { client.release() } })
app.get('/api/workouts', auth, async (request, response) => { const result = await pool.query('SELECT id,title,objective,duration_minutes AS "duration",scheduled_for AS "scheduledFor",status,completed_at AS "completedAt",notes FROM workouts WHERE user_id=$1 ORDER BY COALESCE(scheduled_for,created_at) DESC', [request.user.id]); response.json(result.rows) })
app.patch('/api/workouts/:id/status', auth, async (request, response) => { const status = request.body.status === 'completed' ? 'completed' : 'planned'; const result = await pool.query("UPDATE workouts SET status=$1,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE NULL END WHERE id=$2 AND user_id=$3 RETURNING id,status,completed_at AS \"completedAt\"", [status,request.params.id,request.user.id]); if (!result.rows[0]) return response.status(404).json({ error: 'Séance introuvable.' }); response.json(result.rows[0]) })
app.use(express.static(frontendDirectory))
app.get('*splat', (_request, response) => response.sendFile(path.join(frontendDirectory, 'index.html')))
app.listen(port, '0.0.0.0', () => console.log(`Muscle Training App listening on port ${port}`))

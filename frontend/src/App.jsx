import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './local.css'
import { EXERCISES, MUSCLE_GROUPS, OBJECTIVES } from './data/exercises'
import apexLogo from './assets/apex-logo.svg'
import { generateWorkout, MIN_WORKOUT_EXERCISES, prescribeExercise, refreshWorkout } from './engine/workoutEngine'
import { exportData, parseImport } from './storage/dataTransfer'
import { readAppData, writeAppData } from './storage/indexedDb'

const emptyProfile = { firstName: '', bodyMass: '' }
const initialData = { version: 4, profile: emptyProfile, workouts: [] }
const tabs = [['home', 'Créer'], ['calendar', 'Calendrier'], ['history', 'Historique'], ['settings', 'Sauvegarde']]

function normalizeData(stored) {
  const storedProfile = stored?.profile || {}
  const legacyName = storedProfile.firstName ?? storedProfile.displayName ?? ''
  const profile = {
    firstName: typeof legacyName === 'string' ? legacyName.trim().split(/\s+/)[0].slice(0, 40) : '',
    bodyMass: storedProfile.bodyMass ?? '',
  }
  const workouts = Array.isArray(stored?.workouts) ? stored.workouts.map((workout) => {
    if (!workout || typeof workout !== 'object' || !Array.isArray(workout.exercises)) throw new Error('La sauvegarde contient une séance invalide.')
    const cleanWorkout = Object.fromEntries(Object.entries(workout).filter(([key]) => !['sport', 'targetDuration', 'estimatedMinutes', 'difficulty'].includes(key)))
    const exercises = workout.exercises.map((exercise) => {
      if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) throw new Error('La sauvegarde contient un exercice invalide.')
      return Object.fromEntries(Object.entries(exercise).filter(([key]) => !['difficulty', 'level', 'levels'].includes(key)))
    })
    const warmup = workout.warmup ? { description: workout.warmup.description } : { description: 'Mise en route progressive et mobilité des zones ciblées.' }
    const hasLegacyDurationTitle = /\b\d+\s*min\b/i.test(workout.title)
    const objectiveLabel = OBJECTIVES.find((item) => item.id === workout.objective)?.label || 'Renforcement général'
    return { ...cleanWorkout, exercises, title: hasLegacyDurationTitle ? `${objectiveLabel} · séance` : workout.title, warmup }
  }) : []
  return { ...initialData, profile, workouts }
}

function App() {
  const [data, setData] = useState(initialData)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState('home')
  const [activeWorkoutId, setActiveWorkoutId] = useState(null)
  const [notice, setNotice] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    let active = true
    readAppData(initialData)
      .then((stored) => { if (active) setData(normalizeData(stored)) })
      .catch((error) => { if (active) setNotice(`Impossible de lire la sauvegarde locale : ${error.message}`) })
      .finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])
  useEffect(() => { if (ready) writeAppData(data).catch(() => setNotice('La sauvegarde locale est momentanément indisponible.')) }, [data, ready])

  const activeWorkout = data.workouts.find((workout) => workout.id === activeWorkoutId)
  function updateProfile(profile) { setData((current) => ({ ...current, profile })) }
  function addWorkout(workout) { setData((current) => ({ ...current, workouts: [workout, ...current.workouts] })); setActiveWorkoutId(workout.id); setTab('workout'); setNotice('Séance créée et enregistrée dans votre espace.') }
  function updateWorkout(workout) { setData((current) => ({ ...current, workouts: current.workouts.map((item) => item.id === workout.id ? refreshWorkout(workout) : item) })) }
  function deleteWorkout(id) { if (window.confirm('Supprimer définitivement cette séance ?')) { setData((current) => ({ ...current, workouts: current.workouts.filter((item) => item.id !== id) })); setNotice('Séance supprimée.') } }
  function openWorkout(id) { setActiveWorkoutId(id); setTab('workout') }
  function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { try { if (data.workouts.length && !window.confirm('Remplacer les données actuelles par cette sauvegarde ?')) return; setData(normalizeData(parseImport(reader.result))); setNotice('Sauvegarde importée.'); setTab('home') } catch (error) { setNotice(error.message) } }
    reader.onerror = () => setNotice('Impossible de lire le fichier sélectionné.')
    reader.readAsText(file)
    event.target.value = ''
  }

  if (!ready) return <main className="app loading"><img className="apex-logo" src={apexLogo} alt="APEX Performance" /><p>Préparation de votre espace de performance…</p></main>
  return <main className="app"><header className="topbar"><button className="brand brand-button" aria-label="APEX — accueil" onClick={() => setTab('home')}><img className="apex-logo" src={apexLogo} alt="APEX Performance" /></button><nav aria-label="Navigation principale">{tabs.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav><div className="data-actions"><button onClick={() => exportData(data)}>Exporter</button><button onClick={() => fileInput.current?.click()}>Importer</button><input ref={fileInput} type="file" accept="application/json" hidden onChange={importFile} /></div></header>{notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>Fermer</button></div>}{tab === 'home' && <Home profile={data.profile} workouts={data.workouts} onProfileChange={updateProfile} onCreate={addWorkout} />}{tab === 'calendar' && <Calendar workouts={data.workouts} onOpen={openWorkout} onDelete={deleteWorkout} />}{tab === 'history' && <History workouts={data.workouts} onOpen={openWorkout} onDelete={deleteWorkout} />}{tab === 'settings' && <Settings data={data} onImport={() => fileInput.current?.click()} />}{tab === 'workout' && activeWorkout && <WorkoutEditor workout={activeWorkout} onChange={updateWorkout} onNotice={setNotice} onBack={() => setTab('calendar')} />}{tab === 'workout' && !activeWorkout && <Empty title="Séance introuvable" text="Retournez au calendrier pour choisir une séance." />}</main>
}

function Home({ profile, workouts, onProfileChange, onCreate }) {
  return <><section className="welcome"><div className="welcome-copy"><p className="eyebrow">APEX PERFORMANCE · STRENGTH SYSTEMS</p>{profile.firstName && <p className="hero-greeting">Bonjour, {profile.firstName}</p>}<h1>Construisez la force qui sert votre performance.</h1><p className="muted">Un assistant de préparation physique de précision : une base de séance structurée, des recommandations lisibles, et le contrôle final entre vos mains.</p><div className="hero-points"><span>Programmation orientée performance</span><span>Chaque mouvement ajustable</span><span>Confidentialité locale</span></div></div><div className="stat"><strong>{workouts.filter((item) => item.status === 'completed').length}</strong><span>séances terminées</span><small>Une progression documentée, séance après séance.</small></div></section><Profile profile={profile} onChange={onProfileChange} /><Generator profile={profile} history={workouts} onCreate={onCreate} /></>
}

function Profile({ profile, onChange }) {
  return <section className="panel profile profile-compact"><div className="panel-heading"><div><p className="eyebrow">PERSONNALISATION</p><h2>Un repère pour vos recommandations</h2><p className="muted">Les séances partent d’une pratique avancée. Votre masse corporelle sert à contextualiser des charges indicatives, jamais imposées.</p></div><span className="badge">Enregistré sur cet appareil</span></div><div className="profile-fields"><label className="weight-field">Prénom <span>(pour votre accueil)</span><input type="text" autoComplete="given-name" maxLength="40" placeholder="Ex. Alex" value={profile.firstName} onChange={(event) => onChange({ ...profile, firstName: event.target.value })} /></label><label className="weight-field">Masse corporelle <span>(facultative)</span><div className="input-suffix"><input type="number" min="20" max="300" step="0.1" placeholder="Ex. 72" value={profile.bodyMass} onChange={(event) => onChange({ ...profile, bodyMass: event.target.value })} /><b>kg</b></div><small>Les charges proposées restent indicatives et modifiables.</small></label></div></section>
}

function ChoiceGroup({ title, values, selected, onToggle }) { return <fieldset><legend>{title}</legend><div className="chips">{values.map((value) => <label className={selected.includes(value) ? 'chip selected' : 'chip'} key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />{value}</label>)}</div></fieldset> }

function Generator({ profile, history, onCreate }) {
  const [objective, setObjective] = useState('general')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [muscles, setMuscles] = useState([])
  const [error, setError] = useState('')
  function toggleMuscle(value) { setMuscles((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) }
  function submit(event) { event.preventDefault(); try { setError(''); onCreate(generateWorkout({ ...profile, muscles }, { objective, title, scheduledFor: date, recentWorkouts: history })) } catch (generationError) { setError(generationError.message) } }
  return <section className="dashboard-grid"><form className="panel generator" onSubmit={submit}><div className="generator-heading"><div><p className="eyebrow">CRÉER UNE SÉANCE</p><h2>Votre prochaine séance, pensée pour vous.</h2></div><span className="step-label">APEX / 01</span></div><p className="muted">Définissez l’intention et les zones à travailler. APEX compose une trame de 4 à 6 mouvements que vous gardez entièrement sous votre contrôle.</p><label>Titre de la séance <span className="field-hint">(pour la retrouver facilement)</span><input type="text" maxLength="100" placeholder="Ex. Force — bas du corps" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Objectif<select value={objective} onChange={(event) => setObjective(event.target.value)}>{OBJECTIVES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><ChoiceGroup title="Groupes musculaires à cibler" values={MUSCLE_GROUPS} selected={muscles} onToggle={toggleMuscle} /><label>Ajouter au calendrier <span className="field-hint">(facultatif)</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><button className="primary">Générer ma séance <span>→</span></button>{error && <p className="error" role="alert">{error}</p>}<p className="note">La sélection varie selon votre historique. Vous pourrez ajuster les exercices, séries, répétitions, repos et charges.</p></form></section>
}

function WorkoutEditor({ workout, onChange, onBack, onNotice }) {
  const [practice, setPractice] = useState(workout.status === 'started')
  const [newExerciseId, setNewExerciseId] = useState('')
  const [replacementIds, setReplacementIds] = useState({})
  function changeExercise(index, field, value) { onChange({ ...workout, exercises: workout.exercises.map((exercise, itemIndex) => itemIndex === index ? { ...exercise, [field]: value } : exercise) }) }
  function move(index, direction) { const exercises = [...workout.exercises]; const target = index + direction; if (target < 0 || target >= exercises.length) return; [exercises[index], exercises[target]] = [exercises[target], exercises[index]]; onChange({ ...workout, exercises }); onNotice('Ordre des exercices mis à jour.') }
  function remove(index) { if (workout.exercises.length <= MIN_WORKOUT_EXERCISES) { onNotice(`Une séance doit conserver au moins ${MIN_WORKOUT_EXERCISES} exercices.`); return } onChange({ ...workout, exercises: workout.exercises.filter((_, itemIndex) => itemIndex !== index) }); onNotice('Exercice supprimé de la séance.') }
  function addExercise() { const exercise = EXERCISES.find((item) => item.id === newExerciseId && item.levels?.includes('avance')); if (!exercise) return; onChange({ ...workout, exercises: [...workout.exercises, prescribeExercise(exercise, workout.objective, workout.bodyMass)] }); setNewExerciseId(''); onNotice('Exercice ajouté à la séance.') }
  function replace(index) { const exercise = EXERCISES.find((item) => item.id === replacementIds[index] && item.levels?.includes('avance')); if (!exercise) return; const prescribed = prescribeExercise(exercise, workout.objective, workout.bodyMass); onChange({ ...workout, exercises: workout.exercises.map((item, itemIndex) => itemIndex === index ? prescribed : item) }); setReplacementIds((current) => ({ ...current, [index]: '' })); onNotice('Exercice remplacé.') }
  function togglePractice() { const nextStatus = practice ? 'planned' : 'started'; setPractice(!practice); onChange({ ...workout, status: nextStatus, startedAt: nextStatus === 'started' ? new Date().toISOString() : workout.startedAt }) }
  function complete() { onChange({ ...workout, status: 'completed', completedAt: new Date().toISOString() }); setPractice(false) }
  function cardExercise(exercise, index) { const replacement = replacementIds[index]; return <article className={`panel exercise-card ${practice && index === 0 ? 'current' : ''}`} key={`${exercise.exerciseId}-${index}`}><div className="panel-heading"><div><span className="step">{index + 1}</span><h2>{exercise.name}</h2><p className="muted">{exercise.muscles.join(' · ')} · {exercise.equipment.join(', ')}</p></div><div className="row-actions">{!practice && <><button className="icon-button" title="Monter" aria-label="Monter" onClick={() => move(index, -1)}>↑</button><button className="icon-button" title="Descendre" aria-label="Descendre" onClick={() => move(index, 1)}>↓</button><button className="danger" onClick={() => remove(index)}>Supprimer</button></>}</div></div><p>{exercise.instruction}</p>{exercise.loadSuggestion && <p className="load-suggestion"><b>Point de départ indicatif :</b> {exercise.loadSuggestion.minKg}–{exercise.loadSuggestion.maxKg} kg · {exercise.loadSuggestion.note}. Commencez bas et gardez 2–3 répétitions en réserve.</p>}<div className="exercise-grid"><label>Séries<input type="number" min="1" max="12" value={exercise.sets} onChange={(event) => changeExercise(index, 'sets', Number(event.target.value))} /></label><label>Répétitions / format<input value={exercise.reps} onChange={(event) => changeExercise(index, 'reps', event.target.value)} /></label><label>Repos (s)<input type="number" min="0" max="600" value={exercise.restSeconds} onChange={(event) => changeExercise(index, 'restSeconds', Number(event.target.value))} /></label><label>Charge utilisée<input placeholder="Ex. 8 kg" value={exercise.load} onChange={(event) => changeExercise(index, 'load', event.target.value)} /></label></div>{practice && <label>Résultat réalisé<input placeholder="Ex. 3 × 10, RPE 7" value={exercise.performance?.[0] || ''} onChange={(event) => changeExercise(index, 'performance', [event.target.value])} /></label>}{!practice && <div className="replace-row"><select value={replacement || ''} onChange={(event) => setReplacementIds((current) => ({ ...current, [index]: event.target.value }))}><option value="">Remplacer ce mouvement…</option>{EXERCISES.filter((item) => item.objectives.includes(workout.objective)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="secondary" type="button" disabled={!replacement} onClick={() => replace(index)}>Remplacer</button></div>}<details><summary>Consignes et variantes</summary><p><b>Attention :</b> {exercise.errors}</p><p><b>Précaution :</b> {exercise.precautions}</p><p><b>Plus facile :</b> {exercise.easier} · <b>Plus difficile :</b> {exercise.harder}</p></details></article> }
  return <section className="workout-view"><div className="section-heading"><button className="text-button" onClick={onBack}>← Retour</button><div><p className="eyebrow">{practice ? 'MODE ENTRAÎNEMENT' : 'SÉANCE MODIFIABLE'}</p><h1>{workout.title}</h1><p className="muted">{workout.objective} · {workout.exercises.length} mouvements</p></div><div className="row-actions">{!practice && workout.status !== 'completed' && <button className="primary small" onClick={togglePractice}>Commencer</button>}{practice && <button className="primary small" onClick={complete}>Terminer</button>}</div></div><div className="workout-layout"><section className="panel"><div className="panel-heading"><h2>Préparation</h2><span className="badge">Progressive</span></div><p>{workout.warmup.description}</p><p className="note">{workout.safety}</p>{workout.variationNote && <p className="variation-note">{workout.variationNote}</p>}{!practice && <div className="add-exercise"><select value={newExerciseId} onChange={(event) => setNewExerciseId(event.target.value)}><option value="">Ajouter un exercice…</option>{EXERCISES.filter((item) => item.objectives.includes(workout.objective)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="secondary" type="button" onClick={addExercise}>Ajouter</button></div>}</section>{workout.exercises.map(cardExercise)}</div></section>
}

function localDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function Calendar({ workouts, onOpen, onDelete }) { const [month, setMonth] = useState(new Date()); const days = useMemo(() => { const start = new Date(month.getFullYear(), month.getMonth(), 1); const end = new Date(month.getFullYear(), month.getMonth() + 1, 0); const offset = (start.getDay() + 6) % 7; return [...Array(offset).fill(null), ...Array.from({ length: end.getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))] }, [month]); const dayWorkouts = (day) => workouts.filter((workout) => workout.scheduledFor === localDateKey(day)); return <section><div className="section-heading"><div><p className="eyebrow">CALENDRIER PERSONNEL</p><h1>Planifier et retrouver</h1><p className="muted">Les séances planifiées apparaissent ici automatiquement.</p></div><div className="row-actions"><button className="secondary" aria-label="Mois précédent" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><strong>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong><button className="secondary" aria-label="Mois suivant" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div></div><div className="calendar-grid weekdays">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map((day, index) => <div className="calendar-day" key={day?.toISOString() || `empty-${index}`}>{day && <><strong>{day.getDate()}</strong>{dayWorkouts(day).map((workout) => <div className={`calendar-event ${workout.status}`} key={workout.id}><button className="calendar-open" onClick={() => onOpen(workout.id)}><b>{workout.status === 'completed' ? 'Consulter' : 'Modifier'}</b><span>{workout.title}</span></button><button className="calendar-delete" aria-label={`Supprimer ${workout.title}`} onClick={() => onDelete(workout.id)}>×</button></div>)}</>}</div>)}</div>{workouts.length === 0 && <Empty title="Votre calendrier est vide" text="Planifiez une séance depuis l’accueil pour commencer." />}</section> }
function History({ workouts, onOpen, onDelete }) {
  const archived = workouts
    .filter((workout) => workout.status === 'completed' || !workout.scheduledFor)
    .sort((a, b) => Date.parse(b.completedAt || b.createdAt || 0) - Date.parse(a.completedAt || a.createdAt || 0))

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">HISTORIQUE</p>
          <h1>Vos séances</h1>
          <p className="muted">Retrouvez ici les séances sans date et celles déjà réalisées.</p>
        </div>
      </div>
      {archived.length ? (
        <div className="history-list">
          {archived.map((workout) => {
            const date = workout.completedAt || workout.createdAt
            const dateLabel = date ? new Date(date).toLocaleDateString('fr-FR') : 'Date inconnue'
            const statusLabel = workout.status === 'completed' ? 'Terminée' : 'À poursuivre'
            return (
              <article className="panel history-item" key={workout.id}>
                <button className="history-open" onClick={() => onOpen(workout.id)}>
                  <strong>{workout.title}</strong>
                  <span>{dateLabel} · {workout.exercises.length} mouvements · {statusLabel}</span>
                </button>
                <button className="danger" onClick={() => onDelete(workout.id)}>Supprimer</button>
              </article>
            )
          })}
        </div>
      ) : <Empty title="Aucune séance enregistrée" text="Créez une séance sans date ou terminez une séance planifiée pour la retrouver ici." />}
    </section>
  )
}
function Settings({ data, onImport }) { return <section className="settings"><div className="section-heading"><div><p className="eyebrow">PARAMÈTRES & SAUVEGARDE</p><h1>Vos données restent à vous</h1></div></div><section className="panel"><h2>Stockage local</h2><p>Les données personnelles sont conservées dans IndexedDB sur cet appareil. Elles ne sont pas envoyées au serveur. Exportez régulièrement une sauvegarde avant de changer d’appareil ou de nettoyer les données du navigateur.</p><div className="row-actions"><button className="primary small" onClick={() => exportData(data)}>Exporter mes données</button><button className="secondary" onClick={onImport}>Importer une sauvegarde</button></div></section></section> }
function Empty({ title, text }) { return <section className="panel empty"><h2>{title}</h2><p>{text}</p></section> }

export default App

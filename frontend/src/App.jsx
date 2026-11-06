import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './local.css'
import './professional.css'
import { EXERCISES, MUSCLE_GROUPS, OBJECTIVES } from './data/exercises'
import apexLogo from './assets/apex-logo.svg'
import { generateWorkout, MIN_WORKOUT_EXERCISES, prescribeExercise, refreshWorkout } from './engine/workoutEngine'
import { beginWorkout, completeWorkout, createRealization, snapshotWorkout } from './engine/workoutLifecycle'
import { exportData, parseImport } from './storage/dataTransfer'
import { syncLocalWorkouts } from './storage/accountSync'
import { readAppData, writeAppData } from './storage/indexedDb'

const emptyProfile = { firstName: '', bodyMass: '' }
const initialData = { version: 5, profile: emptyProfile, workouts: [] }
const tabs = [['home', 'Créer'], ['calendar', 'Calendrier'], ['history', 'Historique'], ['settings', 'Sauvegarde']]
const STATUS_LABELS = { planned: 'Planifiée', started: 'En cours', completed: 'Réalisée', postponed: 'Reportée', cancelled: 'Annulée' }
const EXERCISE_GROUPS = [
  { title: 'Membres inférieurs', muscles: ['Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Adducteurs', 'Abducteurs', 'Tibial antérieur', 'Fléchisseurs de hanche', 'Hanches'] },
  { title: 'Tronc', muscles: ['Abdominaux', 'Obliques', 'Lombaires'] },
  { title: 'Membres supérieurs', muscles: ['Pectoraux', 'Grand dorsal', 'Trapèzes', 'Rhomboïdes', 'Épaules', 'Biceps', 'Triceps', 'Avant-bras'] },
]

async function accountResult(response) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('Le serveur a renvoyé une réponse illisible. Réessayez plus tard.')
  }
  if (!response.ok) throw new Error(result.error || 'La demande a échoué. Réessayez.')
  return result
}

async function accountRequest(path, options = {}) {
  let response
  try {
    response = await fetch(path, { credentials: 'same-origin', ...options })
  } catch {
    throw new Error('Impossible de joindre le service de compte. Vérifiez la connexion au serveur.')
  }
  return accountResult(response)
}

function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

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
    const createdAt = typeof workout.createdAt === 'string' || typeof workout.createdAt === 'number'
      ? new Date(workout.createdAt)
      : new Date(Number.NaN)
    const scheduledFor = isValidDateKey(workout.scheduledFor)
      ? workout.scheduledFor
      : localDateKey(Number.isFinite(createdAt.getTime()) ? createdAt : new Date())
    const status = ['planned', 'started', 'completed', 'postponed', 'cancelled'].includes(workout.status) ? workout.status : 'planned'
    const normalized = {
      ...cleanWorkout,
      exercises,
      title: hasLegacyDurationTitle ? `${objectiveLabel} · séance` : workout.title,
      warmup,
      scheduledFor,
      status,
      notes: workout.notes || {},
    }
    if (status === 'started' || status === 'completed') {
      normalized.plannedSnapshot = workout.plannedSnapshot || snapshotWorkout(normalized)
      normalized.realization = workout.realization || createRealization(normalized.plannedSnapshot.exercises)
    }
    return normalized
  }) : []
  return { ...initialData, profile, workouts }
}

function App() {
  const [data, setData] = useState(initialData)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState('home')
  const [activeWorkoutId, setActiveWorkoutId] = useState(null)
  const [calendarFocusDate, setCalendarFocusDate] = useState(null)
  const [notice, setNotice] = useState('')
  const [account, setAccount] = useState(null)
  const [accountService, setAccountService] = useState({ status: 'checking', message: '' })
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    let active = true
    readAppData(initialData)
      .then((stored) => { if (active) setData(normalizeData(stored)) })
      .catch((error) => { if (active) setNotice(`Impossible de lire la sauvegarde locale : ${error.message}`) })
      .finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/me', { credentials: 'same-origin' })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setAccountService({ status: 'available', message: '' })
          return
        }
        const result = await accountResult(response)
        if (active) {
          setAccount(result.user)
          setAccountService({ status: 'available', message: '' })
        }
      })
      .catch((error) => {
        if (active) setAccountService({ status: 'unavailable', message: `${error.message} Vous pouvez continuer à utiliser l’application et vos données locales.` })
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (ready) writeAppData(data).catch((error) => setNotice(`La sauvegarde locale a échoué : ${error.message}`))
  }, [data, ready])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 4800)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const activeWorkout = data.workouts.find((workout) => workout.id === activeWorkoutId)
  function updateAccount(user) {
    setAccount(user)
    setAccountService({ status: 'available', message: '' })
  }
  async function synchronizeWorkouts() {
    setSyncing(true)
    setSyncMessage('')
    try {
      const count = await syncLocalWorkouts(data.workouts)
      setSyncMessage(count
        ? `${count} séance${count > 1 ? 's' : ''} synchronisée${count > 1 ? 's' : ''} avec le compte.`
        : 'Aucune séance locale à synchroniser.')
    } catch (error) {
      const synchronized = Number.isInteger(error.synchronized) ? error.synchronized : 0
      setSyncMessage(synchronized
        ? `${synchronized}/${data.workouts.length} séances synchronisées. Le reste n’a pas été envoyé : ${error.message}`
        : `Synchronisation impossible : ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }
  function updateProfile(profile) { setData((current) => ({ ...current, profile })) }
  function addWorkout(workout) {
    setData((current) => ({ ...current, workouts: [workout, ...current.workouts] }))
    setCalendarFocusDate(workout.scheduledFor)
    setTab('calendar')
    setNotice('Séance planifiée et ajoutée au calendrier.')
  }
  function updateWorkout(workout) {
    setData((current) => ({
      ...current,
      workouts: current.workouts.map((item) => {
        if (item.id !== workout.id || item.status === 'completed') return item
        if (item.status === 'started') {
          return refreshWorkout({
            ...item,
            realization: workout.realization || item.realization,
            notes: workout.notes || item.notes,
          })
        }
        return refreshWorkout(workout)
      }),
    }))
  }
  function startWorkout(id) {
    setData((current) => ({
      ...current,
      workouts: current.workouts.map((item) => item.id === id && ['planned', 'postponed'].includes(item.status) ? beginWorkout(item) : item),
    }))
    setNotice('Programme verrouillé. Renseignez maintenant les performances réalisées.')
  }
  function validateWorkout(id) {
    const workout = data.workouts.find((item) => item.id === id)
    if (!workout || workout.status !== 'started') return
    if (!window.confirm(`Valider définitivement la réalisation de « ${workout.title} » ? Le programme sera conservé comme référence historique.`)) return
    setData((current) => ({
      ...current,
      workouts: current.workouts.map((item) => item.id === id && item.status === 'started' ? completeWorkout(item) : item),
    }))
    setNotice('Séance validée. Son programme et sa réalisation sont conservés dans votre historique.')
  }
  function changeSchedule(id, date) {
    if (!isValidDateKey(date)) {
      setNotice('Choisissez une date de séance valide.')
      return
    }
    const workout = data.workouts.find((item) => item.id === id)
    if (!workout || !['planned', 'postponed'].includes(workout.status)) return
    setData((current) => ({
      ...current,
      workouts: current.workouts.map((item) => item.id === id && ['planned', 'postponed'].includes(item.status)
        ? refreshWorkout({ ...item, scheduledFor: date })
        : item),
    }))
    setCalendarFocusDate(date)
    setTab('calendar')
    setNotice('Date modifiée. Le calendrier a été mis à jour.')
  }
  function changeStatus(id, status) {
    if (!['planned', 'postponed', 'cancelled'].includes(status)) return
    setData((current) => ({
      ...current,
      workouts: current.workouts.map((item) => item.id === id && item.status !== 'completed' && item.status !== 'started'
        ? refreshWorkout({ ...item, status })
        : item),
    }))
    setNotice(`Statut mis à jour : ${STATUS_LABELS[status].toLowerCase()}.`)
  }
  function deleteWorkout(id) {
    if (!window.confirm('Supprimer définitivement cette séance et son historique ? Cette action ne peut pas être annulée.')) return
    setData((current) => ({ ...current, workouts: current.workouts.filter((item) => item.id !== id) }))
    setNotice('Séance supprimée.')
  }
  function openWorkout(id) { setActiveWorkoutId(id); setTab('workout') }
  function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        if (data.workouts.length && !window.confirm('Remplacer les données actuelles par cette sauvegarde ?')) return
        setData(normalizeData(parseImport(reader.result)))
        setNotice('Sauvegarde importée.')
        setTab('home')
      } catch (error) {
        setNotice(error.message)
      }
    }
    reader.onerror = () => setNotice('Impossible de lire le fichier sélectionné.')
    reader.readAsText(file)
    event.target.value = ''
  }

  if (!ready) return <main className="app loading"><img className="apex-logo" src={apexLogo} alt="APEX Performance" /><p>Préparation de votre espace de performance…</p></main>
  return (
    <main className={`app page-${tab}`}>
      <header className="topbar">
        <button className="brand brand-button" aria-label="APEX — accueil" onClick={() => setTab('home')}>
          <img className="apex-logo" src={apexLogo} alt="APEX Performance" />
        </button>
        <nav aria-label="Navigation principale">
          {tabs.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <div className="data-actions">
          <button onClick={() => exportData(data)}>Exporter</button>
          <button onClick={() => setTab('account')}>{account ? 'Mon compte' : 'Se connecter'}</button>
          <input ref={fileInput} type="file" accept="application/json" hidden onChange={importFile} />
        </div>
      </header>
      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>Fermer</button></div>}
      {tab === 'home' && <Home profile={data.profile} workouts={data.workouts} onProfileChange={updateProfile} onCreate={addWorkout} />}
      {tab === 'calendar' && <Calendar key={calendarFocusDate || 'current'} workouts={data.workouts} focusDate={calendarFocusDate} onOpen={openWorkout} onDelete={deleteWorkout} />}
      {tab === 'history' && <History workouts={data.workouts} onOpen={openWorkout} onDelete={deleteWorkout} />}
      {tab === 'settings' && <Settings
        data={data}
        account={account}
        accountService={accountService}
        syncing={syncing}
        syncMessage={syncMessage}
        onSync={synchronizeWorkouts}
        onImport={() => fileInput.current?.click()}
      />}
      {tab === 'account' && <AccountPage account={account} service={accountService} onAccountChange={updateAccount} />}
      {tab === 'workout' && activeWorkout && <WorkoutEditor
        key={activeWorkout.id}
        workout={activeWorkout}
        onChange={updateWorkout}
        onStart={() => startWorkout(activeWorkout.id)}
        onComplete={() => validateWorkout(activeWorkout.id)}
        onReschedule={(date) => changeSchedule(activeWorkout.id, date)}
        onStatusChange={(status) => changeStatus(activeWorkout.id, status)}
        onDelete={() => deleteWorkout(activeWorkout.id)}
        onNotice={setNotice}
        onBack={() => setTab('calendar')}
      />}
      {tab === 'workout' && !activeWorkout && <Empty title="Séance introuvable" text="Retournez au calendrier pour choisir une séance." />}
    </main>
  )
}

function AccountPage({ account, service, onAccountChange }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await accountRequest(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      onAccountChange(result.user)
      setMessage(mode === 'register' ? 'Compte créé et connexion ouverte.' : 'Connexion réussie.')
    } catch (requestError) {
      setError(requestError.message || 'Impossible de joindre le service de compte.')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await accountRequest('/api/auth/logout', { method: 'POST' })
      onAccountChange(null)
      setMessage('Vous êtes déconnecté. Vos données locales sont conservées sur cet appareil.')
    } catch (requestError) {
      setError(requestError.message || 'Impossible de joindre le service de compte.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="account-page">
    <div className="section-heading">
      <div><p className="eyebrow">ESPACE PERSONNEL</p><h1>{account ? 'Votre compte' : 'Se connecter'}</h1><p className="muted">L’accès au compte est facultatif : vous pouvez utiliser l’application localement sans vous connecter.</p></div>
    </div>
    <div className="panel account-panel">
      {account ? <>
        <p className="eyebrow">SESSION ACTIVE</p>
        <h2>{account.email}</h2>
        <p>Votre connexion au service de compte est ouverte. Le profil et les séances restent locaux par défaut. Depuis l’onglet Sauvegarde, vous pouvez envoyer une copie de vos séances vers ce compte.</p>
        <button className="secondary" type="button" disabled={busy} onClick={logout}>{busy ? 'Déconnexion…' : 'Se déconnecter'}</button>
      </> : <>
        <p className="eyebrow">CONNEXION FACULTATIVE</p>
        <h2>{mode === 'register' ? 'Créer un compte' : 'Accéder à votre compte'}</h2>
        <p>Un compte permet de vous identifier auprès du serveur. La connexion ne modifie pas vos données locales et ne les envoie pas vers PostgreSQL.</p>
        {service.status === 'checking' && <p className="account-service-message">Vérification du service de compte…</p>}
        {service.status === 'unavailable' && <p className="error" role="status">{service.message}</p>}
        <form className="account-form" onSubmit={submit}>
          <label>Adresse e-mail<input name="email" type="email" autoComplete="email" required maxLength="254" /></label>
          <label>Mot de passe<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 10 : undefined} /></label>
          {mode === 'register' && <small>10 caractères minimum.</small>}
          {error && <p className="error" role="alert">{error}</p>}
          {message && <p className="account-service-message" role="status">{message}</p>}
          <button className="primary" type="submit" disabled={busy || service.status === 'unavailable'}>{busy ? 'Veuillez patienter…' : mode === 'register' ? 'Créer mon compte' : 'Se connecter'}</button>
        </form>
        <button className="account-mode-button" type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); setMessage('') }}>
          {mode === 'register' ? 'J’ai déjà un compte' : 'Créer un compte'}
        </button>
      </>}
    </div>
  </section>
}

function Home({ profile, workouts, onProfileChange, onCreate }) {
  const upcoming = workouts.filter((workout) => ['planned', 'postponed'].includes(workout.status))
  return <>
    <section className="welcome">
      <div className="welcome-copy">
        <p className="eyebrow">APEX PERFORMANCE · ENDURANCE STRENGTH</p>
        {profile.firstName && <p className="hero-greeting">Bonjour, {profile.firstName}</p>}
        <h1>La force au service de votre endurance</h1>
        <p className="muted">Planifiez vos séances de renforcement, suivez chaque réalisation et construisez une préparation cohérente au fil de votre saison.</p>
        <div className="hero-points"><span>Programme structuré</span><span>Historique de réalisation</span><span>Données privées sur cet appareil</span></div>
      </div>
      <div className="stat"><strong>{upcoming.length}</strong><span>séances à venir</span><small>{workouts.filter((item) => item.status === 'completed').length} séances réalisées et archivées</small></div>
    </section>
    <Profile profile={profile} onChange={onProfileChange} />
    <Generator profile={profile} history={workouts} onCreate={onCreate} />
  </>
}

function Profile({ profile, onChange }) {
  return <section className="panel profile profile-compact">
    <div className="panel-heading"><div><p className="eyebrow">VOTRE PROFIL</p><h2>Personnaliser les repères</h2><p className="muted">La masse corporelle ajuste les suggestions de charge indicatives. Toutes les valeurs restent modifiables.</p></div><span className="badge">Enregistré sur cet appareil</span></div>
    <div className="profile-fields">
      <label className="weight-field">Prénom <span>(facultatif)</span><input type="text" autoComplete="given-name" maxLength="40" placeholder="Ex. Paul" value={profile.firstName} onChange={(event) => onChange({ ...profile, firstName: event.target.value })} /></label>
      <label className="weight-field">Masse corporelle <span>(facultative)</span><div className="input-suffix"><input type="number" min="20" max="300" step="0.1" placeholder="Ex. 72" value={profile.bodyMass} onChange={(event) => onChange({ ...profile, bodyMass: event.target.value })} /><b>kg</b></div><small>Les charges proposées restent indicatives et modifiables.</small></label>
    </div>
  </section>
}

function ChoiceGroup({ title, values, selected, onToggle }) {
  return <fieldset className="muscle-choices"><legend>{title}</legend><div className="chips">{values.map((value) => <label className={selected.includes(value) ? 'chip selected' : 'chip'} key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />{value}</label>)}</div></fieldset>
}

function Generator({ profile, history, onCreate }) {
  const [objective, setObjective] = useState('general')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => localDateKey(new Date()))
  const [muscles, setMuscles] = useState([])
  const [error, setError] = useState('')
  function toggleMuscle(value) { setMuscles((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) }
  function submit(event) {
    event.preventDefault()
    try {
      setError('')
      onCreate(generateWorkout({ ...profile, muscles }, { objective, title, scheduledFor: date, recentWorkouts: history }))
    } catch (generationError) {
      setError(generationError.message)
    }
  }
  return <section className="dashboard-grid">
    <form className="panel generator" onSubmit={submit}>
      <div className="generator-heading"><div><p className="eyebrow">PROGRAMMATION</p><h2>Préparer une séance</h2></div><span className="step-label">NOUVELLE SÉANCE</span></div>
      <p className="muted">Choisissez une orientation, vos groupes musculaires et une date. Le programme proposé reste entièrement ajustable avant la séance.</p>
      <label>Titre <span className="field-hint">(facultatif)</span><input type="text" maxLength="100" placeholder="Ex. Force — bas du corps" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Orientation de séance<select value={objective} onChange={(event) => setObjective(event.target.value)}>{OBJECTIVES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <ChoiceGroup title="Groupes musculaires ciblés" values={MUSCLE_GROUPS} selected={muscles} onToggle={toggleMuscle} />
      <label>Date prévue<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary">Créer et planifier <span>→</span></button>
      <p className="note">La séance apparaîtra au calendrier avec le statut « Planifiée ». Vous pourrez modifier son programme jusqu’au début de sa réalisation.</p>
    </form>
  </section>
}

function ExerciseLibraryPicker({ objective, onSelect, buttonLabel = 'Ajouter' }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('fr')
  const available = EXERCISES.filter((exercise) => exercise.objectives.includes(objective))
  const categoryGroups = EXERCISE_GROUPS.map((category) => ({
    ...category,
    subgroups: category.muscles.map((muscle) => ({
      muscle,
      exercises: available.filter((exercise) => exercise.muscles[0] === muscle
        || (!EXERCISE_GROUPS.some((group) => group.muscles.includes(exercise.muscles[0])) && exercise.muscles.includes(muscle))),
    })).filter((group) => group.exercises.length),
  })).filter((category) => category.subgroups.length)
  const searchResults = normalizedQuery ? available.filter((exercise) => `${exercise.name} ${exercise.muscles.join(' ')}`.toLocaleLowerCase('fr').includes(normalizedQuery)) : []
  function exerciseButton(exercise) {
    return <button className="library-exercise" type="button" key={exercise.id} onClick={() => { onSelect(exercise); setQuery('') }}>
      <span>{exercise.name}<small>{exercise.muscles.join(' · ')}</small></span><b>{buttonLabel}</b>
    </button>
  }
  return <div className="exercise-library">
    <label className="library-search">Rechercher un exercice<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou groupe musculaire" /></label>
    {normalizedQuery
      ? <div className="library-results">{searchResults.length ? searchResults.map(exerciseButton) : <p className="note">Aucun exercice correspondant.</p>}</div>
      : <div className="library-categories">{categoryGroups.map((category) => <details key={category.title}>
        <summary>{category.title}<span>{category.subgroups.reduce((total, subgroup) => total + subgroup.exercises.length, 0)} exercices</span></summary>
        {category.subgroups.map((subgroup) => <section className="library-subgroup" key={subgroup.muscle}>
          <h4>{subgroup.muscle}</h4>
          {subgroup.exercises.map(exerciseButton)}
        </section>)}
      </details>)}</div>}
  </div>
}

function WorkoutEditor({ workout, onChange, onStart, onComplete, onReschedule, onStatusChange, onDelete, onNotice, onBack }) {
  const [view, setView] = useState(workout.status === 'started' ? 'realization' : 'program')
  const [newDate, setNewDate] = useState(workout.scheduledFor)
  const locked = workout.status === 'started' || workout.status === 'completed'
  const plan = workout.plannedSnapshot || snapshotWorkout(workout)
  const realization = workout.realization || createRealization(plan.exercises)

  function changePlannedExercise(index, field, value) {
    if (workout.status !== 'planned') return
    onChange({ ...workout, exercises: workout.exercises.map((exercise, itemIndex) => itemIndex === index ? { ...exercise, [field]: value } : exercise) })
  }
  function changeActual(index, field, value) {
    if (workout.status !== 'started') return
    const actualExercises = realization.exercises.map((exercise, itemIndex) => itemIndex === index ? { ...exercise, [field]: value } : exercise)
    onChange({ ...workout, realization: { ...realization, exercises: actualExercises } })
  }
  function updateNotes(field, value) {
    if (workout.status !== 'started') return
    onChange({ ...workout, notes: { ...workout.notes, [field]: value } })
  }
  function addExercise(exercise) {
    if (!exercise || workout.status !== 'planned') return
    onChange({ ...workout, exercises: [...workout.exercises, prescribeExercise(exercise, workout.objective, workout.bodyMass)] })
    onNotice(`${exercise.name} ajouté au programme.`)
  }
  function replaceExercise(index, exercise) {
    if (!exercise || workout.status !== 'planned') return
    onChange({ ...workout, exercises: workout.exercises.map((item, itemIndex) => itemIndex === index ? prescribeExercise(exercise, workout.objective, workout.bodyMass) : item) })
    onNotice(`Mouvement remplacé par ${exercise.name}.`)
  }
  function removeExercise(index) {
    if (workout.exercises.length <= MIN_WORKOUT_EXERCISES) {
      onNotice(`Une séance doit conserver au moins ${MIN_WORKOUT_EXERCISES} exercices.`)
      return
    }
    onChange({ ...workout, exercises: workout.exercises.filter((_, itemIndex) => itemIndex !== index) })
  }
  function moveExercise(index, direction) {
    const exercises = [...workout.exercises]
    const target = index + direction
    if (target < 0 || target >= exercises.length) return
    ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
    onChange({ ...workout, exercises })
  }
  function toggleSkipped(index) {
    const current = realization.exercises[index]
    changeActual(index, 'skipped', !current.skipped)
  }
  function planCard(exercise, index) {
    return <article className="panel exercise-card" key={`${exercise.exerciseId}-${index}`}>
      <div className="panel-heading"><div><span className="step">{index + 1}</span><h2>{exercise.name}</h2><p className="muted">{exercise.muscles.join(' · ')} · {exercise.equipment.join(', ')}</p></div>
        {!locked && <div className="row-actions"><button className="icon-button" type="button" aria-label="Monter" disabled={index === 0} onClick={() => moveExercise(index, -1)}>↑</button><button className="icon-button" type="button" aria-label="Descendre" disabled={index === workout.exercises.length - 1} onClick={() => moveExercise(index, 1)}>↓</button><button className="danger" type="button" onClick={() => removeExercise(index)}>Supprimer</button></div>}
      </div>
      <p>{exercise.instruction}</p>
      {exercise.loadSuggestion && <p className="load-suggestion"><b>Repère indicatif :</b> {exercise.loadSuggestion.minKg}–{exercise.loadSuggestion.maxKg} kg · {exercise.loadSuggestion.note}.</p>}
      <div className="exercise-grid">
        <label>Séries prévues<input type="number" min="1" max="12" value={exercise.sets} disabled={locked} onChange={(event) => changePlannedExercise(index, 'sets', Number(event.target.value))} /></label>
        <label>Répétitions / format<input value={exercise.reps} disabled={locked} onChange={(event) => changePlannedExercise(index, 'reps', event.target.value)} /></label>
        <label>Récupération (s)<input type="number" min="0" max="600" value={exercise.restSeconds} disabled={locked} onChange={(event) => changePlannedExercise(index, 'restSeconds', Number(event.target.value))} /></label>
        <label>Charge prévue<input placeholder="Ex. 8 kg" value={exercise.load} disabled={locked} onChange={(event) => changePlannedExercise(index, 'load', event.target.value)} /></label>
      </div>
      <details><summary>Consignes et variantes</summary><p><b>Point de vigilance :</b> {exercise.errors}</p><p><b>Précaution :</b> {exercise.precautions}</p><p><b>Adapter :</b> {exercise.easier} · <b>Progression :</b> {exercise.harder}</p></details>
      {!locked && <ExerciseLibraryPicker objective={workout.objective} buttonLabel="Remplacer" onSelect={(selected) => replaceExercise(index, selected)} />}
    </article>
  }
  function actualCard(exercise, index) {
    const actual = realization.exercises[index] || {}
    return <article className={`panel exercise-card actual-card ${actual.skipped ? 'skipped' : ''}`} key={`${exercise.exerciseId}-${index}`}>
      <div className="panel-heading"><div><span className="step">{index + 1}</span><h2>{exercise.name}</h2><p className="muted">Prévu : {exercise.sets} séries · {exercise.reps} répétitions · {exercise.load || 'sans charge précisée'}</p></div>
        <label className="skipped-control"><input type="checkbox" checked={Boolean(actual.skipped)} onChange={() => toggleSkipped(index)} disabled={workout.status !== 'started'} /> Non réalisé</label>
      </div>
      {!actual.skipped && <div className="exercise-grid">
        <label>Séries réalisées<input type="number" min="0" max="12" value={actual.sets ?? ''} disabled={workout.status !== 'started'} onChange={(event) => changeActual(index, 'sets', event.target.value === '' ? '' : Number(event.target.value))} /></label>
        <label>Répétitions réalisées<input value={actual.reps ?? ''} disabled={workout.status !== 'started'} placeholder="Ex. 8 / 8 / 7" onChange={(event) => changeActual(index, 'reps', event.target.value)} /></label>
        <label>Récupération réelle (s)<input type="number" min="0" max="1800" value={actual.restSeconds ?? ''} disabled={workout.status !== 'started'} onChange={(event) => changeActual(index, 'restSeconds', event.target.value === '' ? '' : Number(event.target.value))} /></label>
        <label>Charge réelle<input value={actual.load ?? ''} disabled={workout.status !== 'started'} placeholder="Ex. 8 kg" onChange={(event) => changeActual(index, 'load', event.target.value)} /></label>
      </div>}
      {actual.legacyResult && <p className="load-suggestion"><b>Résultat saisi avant cette mise à jour :</b> {actual.legacyResult}</p>}
    </article>
  }
  const dateLabel = isValidDateKey(plan.scheduledFor) ? new Date(`${plan.scheduledFor}T12:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : ''
  return <section className="workout-view">
    <div className="section-heading workout-heading">
      <button className="text-button" onClick={onBack}>← Calendrier</button>
      <div><p className="eyebrow">{STATUS_LABELS[workout.status]?.toLocaleUpperCase('fr') || 'SÉANCE'}</p><h1>{plan.title}</h1><p className="muted">{OBJECTIVES.find((item) => item.id === plan.objective)?.label || plan.objective} · {plan.exercises.length} mouvements · {dateLabel}</p></div>
      <span className={`status-badge ${workout.status}`}>{STATUS_LABELS[workout.status]}</span>
    </div>
    <div className="workout-tabs" role="tablist" aria-label="Détails de la séance">
      <button role="tab" aria-selected={view === 'program'} className={view === 'program' ? 'active' : ''} onClick={() => setView('program')}>Programme prévu</button>
      {(workout.status === 'started' || workout.status === 'completed') && <button role="tab" aria-selected={view === 'realization'} className={view === 'realization' ? 'active' : ''} onClick={() => setView('realization')}>Réalisation</button>}
      {(workout.status === 'started' || workout.status === 'completed') && <button role="tab" aria-selected={view === 'notes'} className={view === 'notes' ? 'active' : ''} onClick={() => setView('notes')}>Notes</button>}
    </div>
    {view === 'program' && <>
      <div className="workout-layout">
        <section className="panel workout-preparation">
          <div className="panel-heading"><h2>Préparation</h2><span className="badge">{locked ? 'Programme verrouillé' : 'Modifiable avant le départ'}</span></div>
          <p>{plan.warmup?.description}</p><p className="note">{plan.safety}</p>
          {plan.variationNote && <p className="variation-note">{plan.variationNote}</p>}
          <label className="program-notes">Consignes complémentaires<textarea rows="3" maxLength="1000" value={workout.coachNotes || ''} disabled={locked} placeholder="Repères de séance, matériel, consignes de l’entraîneur…" onChange={(event) => onChange({ ...workout, coachNotes: event.target.value })} /></label>
          {!locked && <ExerciseLibraryPicker objective={workout.objective} onSelect={addExercise} />}
        </section>
        {(locked ? plan.exercises : workout.exercises).map(planCard)}
      </div>
      {!locked && <div className="plan-actions panel">
        <label>Déplacer la séance vers une autre date<input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /></label>
        <button className="secondary" type="button" disabled={!isValidDateKey(newDate) || newDate === workout.scheduledFor} onClick={() => onReschedule(newDate)}>Enregistrer la nouvelle date</button>
        <label>Statut<select value={workout.status} onChange={(event) => onStatusChange(event.target.value)}><option value="planned">Planifiée</option><option value="postponed">Reportée</option><option value="cancelled">Annulée</option></select></label>
        <button className="danger" type="button" onClick={onDelete}>Supprimer la séance</button>
      </div>}
      {['planned', 'postponed'].includes(workout.status) && <div className="start-panel panel"><div><h2>La séance est prête ?</h2><p>Le programme sera verrouillé comme référence dès le démarrage. Vos performances seront saisies séparément.</p></div><button className="primary small" type="button" onClick={() => { onStart(); setView('realization') }}>Démarrer la réalisation</button></div>}
    </>}
    {view === 'realization' && <div className="workout-layout">
      <section className="panel workout-preparation"><h2>Réalisation de la séance</h2><p>Les données ci-dessous sont indépendantes du programme prévu. Les modifications du programme sont maintenant verrouillées.</p></section>
      {plan.exercises.map(actualCard)}
      {workout.status === 'started' && <div className="completion-panel panel"><p>Vérifiez les performances saisies avant de valider. La validation clôture cette séance et conserve son historique.</p><button className="primary small" type="button" onClick={onComplete}>Valider la séance réalisée</button></div>}
      {workout.status === 'completed' && <p className="notice-inline">Séance validée le {workout.completedAt ? new Date(workout.completedAt).toLocaleString('fr-FR') : '—'} · historique en lecture seule.</p>}
    </div>}
    {view === 'notes' && <section className="panel journal-panel">
      <p className="eyebrow">CARNET D’ENTRAÎNEMENT</p><h2>Notes de séance</h2><p className="muted">Ces repères restent associés à la séance pour préparer les prochaines séances.</p>
      <label>Sensations<textarea rows="3" maxLength="1500" value={workout.notes?.sensations || ''} disabled={workout.status !== 'started'} placeholder="Comment vous êtes-vous senti pendant la séance ?" onChange={(event) => updateNotes('sensations', event.target.value)} /></label>
      <label>Niveau de fatigue<select value={workout.notes?.fatigue || ''} disabled={workout.status !== 'started'} onChange={(event) => updateNotes('fatigue', event.target.value)}><option value="">Non renseigné</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => <option key={level} value={String(level)}>{level} / 10</option>)}</select></label>
      <label>Difficultés rencontrées<textarea rows="3" maxLength="1500" value={workout.notes?.difficulties || ''} disabled={workout.status !== 'started'} placeholder="Mouvement, charge ou contexte à surveiller…" onChange={(event) => updateNotes('difficulties', event.target.value)} /></label>
      <label>Douleurs ou gênes<textarea rows="3" maxLength="1500" value={workout.notes?.discomfort || ''} disabled={workout.status !== 'started'} placeholder="Décrivez toute gêne ressentie, sans chercher à la diagnostiquer." onChange={(event) => updateNotes('discomfort', event.target.value)} /></label>
      <label>Observations pour la suite<textarea rows="3" maxLength="1500" value={workout.notes?.observations || ''} disabled={workout.status !== 'started'} placeholder="Repères utiles pour votre prochaine séance…" onChange={(event) => updateNotes('observations', event.target.value)} /></label>
      {workout.status === 'completed' && <p className="note">Séance validée : les notes sont conservées en lecture seule avec l’historique.</p>}
    </section>}
  </section>
}

function Calendar({ workouts, focusDate, onOpen, onDelete }) {
  const [month, setMonth] = useState(() => {
    const date = focusDate ? new Date(`${focusDate}T12:00:00`) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    const offset = (start.getDay() + 6) % 7
    const cells = [...Array(offset).fill(null), ...Array.from({ length: end.getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]
    while (cells.length % 7) cells.push(null)
    return cells
  }, [month])
  const dayWorkouts = (day) => workouts.filter((workout) => workout.scheduledFor === localDateKey(day))
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const agendaWorkouts = workouts.filter((workout) => workout.scheduledFor?.startsWith(monthKey))
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
  return <section className="calendar-section">
    <div className="section-heading"><div><p className="eyebrow">PLANIFICATION</p><h1>Calendrier des séances</h1><p className="muted">Ouvrez une séance pour consulter le programme, saisir les résultats ou modifier sa date.</p></div>
      <div className="month-controls"><button className="secondary" aria-label="Mois précédent" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><strong>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong><button className="secondary" aria-label="Mois suivant" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div>
    </div>
    <div className="status-legend">{Object.entries(STATUS_LABELS).map(([status, label]) => <span key={status}><i className={`status-dot ${status}`} />{label}</span>)}</div>
    <div className="calendar-grid weekdays">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">
      {days.map((day, index) => <div className={`calendar-day ${day && localDateKey(day) === localDateKey(new Date()) ? 'today' : ''}`} key={day?.toISOString() || `empty-${index}`}>
        {day && <><strong>{day.getDate()}</strong>{dayWorkouts(day).map((workout) => <article className={`calendar-event ${workout.status}`} key={workout.id}>
          <button className="calendar-open" onClick={() => onOpen(workout.id)}><b>{STATUS_LABELS[workout.status] || 'Planifiée'}</b><span>{workout.title}</span></button>
          <div className="calendar-event-actions"><button className="calendar-delete" aria-label={`Supprimer ${workout.title}`} title="Supprimer" onClick={() => onDelete(workout.id)}>×</button></div>
        </article>)}</>}
      </div>)}
    </div>
    <div className="calendar-agenda">
      {agendaWorkouts.length ? agendaWorkouts.map((workout, index) => <div key={workout.id}>
        {(index === 0 || agendaWorkouts[index - 1].scheduledFor !== workout.scheduledFor) && <p className="agenda-date">{new Date(`${workout.scheduledFor}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
        <article className={`agenda-event ${workout.status}`}><button onClick={() => onOpen(workout.id)}><b>{STATUS_LABELS[workout.status] || 'Planifiée'}</b><span>{workout.title}</span></button><button className="calendar-delete" aria-label={`Supprimer ${workout.title}`} onClick={() => onDelete(workout.id)}>×</button></article>
      </div>) : <p className="note">Aucune séance ce mois-ci.</p>}
    </div>
    {workouts.length === 0 && <Empty title="Votre calendrier est prêt" text="Créez une séance datée depuis l’accueil pour démarrer votre planification." />}
  </section>
}

function History({ workouts, onOpen, onDelete }) {
  const archived = workouts.filter((workout) => workout.status === 'completed')
    .sort((a, b) => Date.parse(b.completedAt || b.createdAt || 0) - Date.parse(a.completedAt || a.createdAt || 0))
  return <section className="history-section">
    <div className="section-heading"><div><p className="eyebrow">CARNET DE SUIVI</p><h1>Historique des séances</h1><p className="muted">Programmes, performances réalisées et notes conservés ensemble.</p></div></div>
    {archived.length ? <div className="history-list">{archived.map((workout) => <article className="panel history-item" key={workout.id}>
      <button className="history-open" onClick={() => onOpen(workout.id)}><strong>{workout.title}</strong><span>{workout.completedAt ? new Date(workout.completedAt).toLocaleDateString('fr-FR') : 'Date inconnue'} · {workout.exercises.length} mouvements · séance réalisée</span></button>
      <button className="danger" onClick={() => onDelete(workout.id)}>Supprimer</button>
    </article>)}</div> : <Empty title="Aucune séance réalisée" text="Après une séance, renseignez les performances puis validez-la pour la retrouver ici." />}
  </section>
}

function Settings({ data, account, accountService, syncing, syncMessage, onSync, onImport }) {
  return <section className="settings"><div className="section-heading"><div><p className="eyebrow">CONFIDENTIALITÉ & SAUVEGARDE</p><h1>Vos données restent à vous</h1></div></div>
    <section className="panel"><h2>Stockage local</h2><p>Vos données personnelles sont conservées dans IndexedDB sur cet appareil et ne sont pas envoyées au serveur. Exportez régulièrement une sauvegarde avant de changer d’appareil ou de nettoyer les données du navigateur.</p>
      <p className="note">{data.workouts.length} séances · sauvegarde au format JSON</p><div className="row-actions"><button className="primary small" onClick={() => exportData(data)}>Exporter mes données</button><button className="secondary" onClick={onImport}>Importer une sauvegarde</button></div>
    </section>
    <section className="panel account-sync-panel">
      <p className="eyebrow">SAUVEGARDE DU COMPTE</p>
      <h2>Synchroniser mes séances</h2>
      <p>Envoyez une copie de vos séances locales vers votre compte. Votre calendrier et vos données locales restent prioritaires et continuent de fonctionner hors connexion.</p>
      {account
        ? <p className="account-sync-status">Connecté en tant que <strong>{account.email}</strong></p>
        : <p className="note">{accountService.status === 'unavailable' ? accountService.message : 'Connectez-vous pour synchroniser une copie de vos séances sur votre compte.'}</p>}
      <button className="secondary" type="button" disabled={!account || syncing || data.workouts.length === 0} onClick={onSync}>
        {syncing ? 'Synchronisation…' : 'Synchroniser avec mon compte'}
      </button>
      {syncMessage && <p className={syncMessage.startsWith('Synchronisation impossible') || syncMessage.includes('n’a pas été envoyé') ? 'error' : 'account-sync-status'} role="status">{syncMessage}</p>}
      <p className="note">Les séances déjà envoyées sont mises à jour sans créer de doublons. Cette action envoie les séances de cet appareil vers le compte ; elle ne récupère pas les données d’un autre appareil.</p>
    </section>
  </section>
}

function Empty({ title, text }) { return <section className="panel empty"><h2>{title}</h2><p>{text}</p></section> }

export default App

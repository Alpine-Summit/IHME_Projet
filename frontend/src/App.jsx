import { useState } from 'react'
import './App.css'

const objectives = [
  { value: 'force', label: 'Force', description: 'Développer la capacité à produire un effort important.' },
  { value: 'puissance', label: 'Puissance', description: 'Produire un effort rapidement et efficacement.' },
  { value: 'endurance', label: 'Endurance', description: 'Maintenir un effort musculaire plus longtemps.' },
]

const muscles = ['Quadriceps', 'Fessiers', 'Ischio-jambiers', 'Mollets', 'Pectoraux', 'Grand dorsal', 'Rhomboïdes', 'Trapèzes', 'Épaules', 'Biceps', 'Triceps', 'Avant-bras', 'Abdominaux', 'Lombaires', 'Fléchisseurs de hanche']

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

function recommendedLoad(exercise, weight, objective) {
  const basePercent = Number(exercise.loadPercent || 0)
  const objectiveFactor = { force: 1, endurance: 0.55, puissance: 0.75 }[objective] || 1
  const percent = Math.round(basePercent * objectiveFactor)
  if (percent === 0) return 'Poids du corps — charge additionnelle : 0 kg'
  const load = Math.max(1, Math.round((Number(weight) * percent / 100) / 2.5) * 2.5)
  return `≈ ${load} kg (${percent}% du poids)`
}

function App() {
  const [weight, setWeight] = useState('')
  const [objective, setObjective] = useState('force')
  const [selectedMuscles, setSelectedMuscles] = useState([])
  const [results, setResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [message, setMessage] = useState('')

  function toggleMuscle(muscle) {
    setSelectedMuscles((current) => current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle])
  }

  async function searchExercises(event) {
    event.preventDefault()
    if (!weight || Number(weight) <= 0) {
      setMessage('Indiquez un poids supérieur à 0 kg pour continuer.')
      return
    }
    if (selectedMuscles.length === 0) {
      setMessage('Sélectionnez au moins un groupe musculaire.')
      return
    }
    const localSuggestions = exercises.filter((exercise) => exercise.objectives.includes(objective) && exercise.muscles.some((muscle) => selectedMuscles.includes(muscle)))
    let suggestions = localSuggestions
    try {
      const params = new URLSearchParams({ objective, muscles: selectedMuscles.join(',') })
      const response = await fetch(`${import.meta.env.BASE_URL}api/exercises?${params}`)
      if (response.ok) suggestions = await response.json()
    } catch {
      // Le mode local permet de tester l’interface sans lancer le backend.
    }
    setMessage('')
    setResults(suggestions)
    setHasSearched(true)
  }

  return (
    <main className="app-shell">
      <header className="hero-section">
        <div className="brand-mark">M</div>
        <p className="eyebrow">RENFORCEMENT MUSCULAIRE</p>
        <h1>Trouvez le bon exercice pour votre objectif.</h1>
        <p className="hero-text">Une sélection d’exercices au poids du corps, avec haltères, barres et machines, adaptée à votre objectif.</p>
        <span className="demo-badge">Prototype — données de démonstration</span>
      </header>

      <section className="workspace">
        <form className="search-card" onSubmit={searchExercises}>
          <div className="section-heading"><span className="step-number">01</span><div><p className="eyebrow">VOS INFORMATIONS</p><h2>Personnalisons votre recherche</h2></div></div>
          <label className="field-label" htmlFor="weight">Votre poids</label>
          <div className="weight-input"><input id="weight" type="number" min="1" max="300" placeholder="70" value={weight} onChange={(event) => setWeight(event.target.value)} /><span>kg</span></div>

          <fieldset><legend className="field-label">Votre objectif</legend><div className="objective-grid">
            {objectives.map((item) => <label className={`objective-option ${objective === item.value ? 'selected' : ''}`} key={item.value}><input type="radio" name="objective" value={item.value} checked={objective === item.value} onChange={(event) => setObjective(event.target.value)} /><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}
          </div></fieldset>

          <fieldset><legend className="field-label">Groupes musculaires à travailler</legend><div className="muscle-grid">
            {muscles.map((muscle) => <label className={`muscle-option ${selectedMuscles.includes(muscle) ? 'selected' : ''}`} key={muscle}><input type="checkbox" checked={selectedMuscles.includes(muscle)} onChange={() => toggleMuscle(muscle)} /><span>{muscle}</span></label>)}
          </div></fieldset>

          {message && <p className="form-message" role="alert">{message}</p>}
          <button className="primary-button" type="submit">Rechercher des exercices <span>→</span></button>
        </form>

        <section className="results-section" aria-live="polite">
          <div className="results-heading"><div><p className="eyebrow">VOS SUGGESTIONS</p><h2>{hasSearched ? `${results.length} exercice${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}` : 'Des idées pour commencer'}</h2></div><span className="results-count">{hasSearched ? results.length : '—'}</span></div>
          {!hasSearched && <p className="empty-state">Renseignez vos informations pour découvrir des exercices adaptés à votre recherche.</p>}
          {hasSearched && results.length === 0 && <p className="empty-state">Aucun exercice ne correspond exactement à ces critères. Essayez un autre objectif ou un autre groupe musculaire.</p>}
          <div className="exercise-list">{results.map((exercise) => <article className="exercise-card" key={exercise.name}>
            <div className="exercise-icon" aria-hidden="true">{exercise.emoji || '🏋️'}</div><div className="exercise-content"><div className="exercise-title-row"><div><h3>{exercise.name}</h3><p className="exercise-muscles">{exercise.muscles.join(' · ')}</p></div><span className="tag">{exercise.equipment}</span></div><p>{exercise.description}</p><p className="load-recommendation"><b>Charge indicative</b>{recommendedLoad(exercise, weight, objective)}</p><div className="variants"><span><b>Plus facile</b>{exercise.easier}</span><span><b>Plus difficile</b>{exercise.harder}</span></div></div>
          </article>)}</div>
          {hasSearched && <p className="safety-note">Les charges sont des estimations pédagogiques basées sur le poids renseigné et l’objectif choisi. Elles ne remplacent pas un encadrement professionnel : commencez plus léger, vérifiez la technique et arrêtez en cas de douleur.</p>}
        </section>
      </section>
      <footer>Un outil d’inspiration — pas un programme d’entraînement personnalisé.</footer>
    </main>
  )
}

export default App

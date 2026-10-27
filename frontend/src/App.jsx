import { useState } from 'react'
import './App.css'

const objectives = [
  { value: 'force', label: 'Force', description: 'Développer la capacité à produire un effort important.' },
  { value: 'puissance', label: 'Puissance', description: 'Produire un effort rapidement et efficacement.' },
  { value: 'endurance', label: 'Endurance', description: 'Maintenir un effort musculaire plus longtemps.' },
]

const muscles = ['Jambes', 'Pectoraux', 'Dos', 'Épaules', 'Bras', 'Abdominaux']

const exercises = [
  { name: 'Squat au poids du corps', muscles: ['Jambes', 'Abdominaux'], objectives: ['force', 'endurance'], emoji: '🦵', equipment: 'Poids du corps', description: 'Un mouvement complet pour solliciter les cuisses, les fessiers et la stabilité du tronc.', easier: 'S’asseoir sur une chaise puis se relever.', harder: 'Ajouter un saut contrôlé ou une charge tenue contre le torse.' },
  { name: 'Pompes', muscles: ['Pectoraux', 'Bras', 'Épaules'], objectives: ['force', 'endurance'], emoji: '💪', equipment: 'Poids du corps', description: 'Un exercice accessible pour renforcer la poussée du haut du corps.', easier: 'Faire les pompes avec les genoux au sol ou contre un mur.', harder: 'Éloigner les mains du corps ou surélever les pieds.' },
  { name: 'Fente avant', muscles: ['Jambes', 'Abdominaux'], objectives: ['force', 'puissance', 'endurance'], emoji: '🏃', equipment: 'Poids du corps', description: 'Un exercice unilatéral utile pour travailler les jambes et l’équilibre.', easier: 'Se tenir près d’un support et réduire l’amplitude.', harder: 'Ajouter une poussée dynamique vers le haut.' },
  { name: 'Mountain climbers', muscles: ['Abdominaux', 'Épaules', 'Jambes'], objectives: ['puissance', 'endurance'], emoji: '⚡', equipment: 'Poids du corps', description: 'Un mouvement dynamique qui combine gainage, coordination et sollicitation cardio-musculaire.', easier: 'Ralentir le mouvement et garder les mains sur un support surélevé.', harder: 'Accélérer progressivement en gardant le bassin stable.' },
  { name: 'Rowing avec haltère', muscles: ['Dos', 'Bras'], objectives: ['force'], emoji: '🏋️', equipment: 'Un haltère', description: 'Un mouvement de tirage pour renforcer le dos et les muscles qui rapprochent le bras du corps.', easier: 'Utiliser une charge légère et un support pour une main.', harder: 'Augmenter légèrement la charge seulement si la technique reste maîtrisée.' },
  { name: 'Lancer de medecine-ball', muscles: ['Jambes', 'Épaules', 'Abdominaux'], objectives: ['puissance'], emoji: '🎯', equipment: 'Medecine-ball', description: 'Un exercice explosif à réaliser dans un espace dégagé pour développer la vitesse de production de force.', easier: 'Utiliser un ballon léger et réduire l’amplitude du lancer.', harder: 'Augmenter progressivement la vitesse sans perdre le contrôle.' },
]

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
        <p className="hero-text">Une sélection simple d’exercices pour les personnes qui souhaitent renforcer leur corps, sans créer une séance complète.</p>
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
            <div className="exercise-icon" aria-hidden="true">{exercise.emoji || '🏋️'}</div><div className="exercise-content"><div className="exercise-title-row"><div><h3>{exercise.name}</h3><p className="exercise-muscles">{exercise.muscles.join(' · ')}</p></div><span className="tag">{exercise.equipment}</span></div><p>{exercise.description}</p><div className="variants"><span><b>Plus facile</b>{exercise.easier}</span><span><b>Plus difficile</b>{exercise.harder}</span></div></div>
          </article>)}</div>
          {hasSearched && <p className="safety-note">Le poids seul ne permet pas de calculer une charge fiable. Commencez progressivement et privilégiez la qualité du mouvement.</p>}
        </section>
      </section>
      <footer>Un outil d’inspiration — pas un programme d’entraînement personnalisé.</footer>
    </main>
  )
}

export default App

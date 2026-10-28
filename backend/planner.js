export const objectives = {
  force: { label: 'Force', sets: 4, reps: '4–6', rest: 120 },
  puissance: { label: 'Puissance', sets: 4, reps: '3–5', rest: 120 },
  endurance: { label: 'Endurance musculaire', sets: 3, reps: '12–20', rest: 60 },
  pliometrie: { label: 'Pliométrie', sets: 3, reps: '4–8', rest: 90 },
  general: { label: 'Renforcement général', sets: 3, reps: '8–12', rest: 75 },
}

export function buildWorkout(exercises, { objective, duration = 45, level = 'debutant' }) {
  const prescription = objectives[objective] || objectives.general
  const limit = Math.max(2, Math.min(8, Math.floor((Number(duration) - 10) / 5)))
  return {
    title: `${prescription.label} — ${duration} min`, objective, duration: Number(duration), warmupMinutes: 8,
    exercises: exercises.slice(0, limit).map((exercise, index) => ({ exerciseId: exercise.id, name: exercise.name, orderIndex: index, sets: prescription.sets, reps: prescription.reps, restSeconds: prescription.rest, difficulty: level, cue: exercise.instruction })),
    safety: objective === 'pliometrie' ? 'La pliométrie exige une réception silencieuse et stable. Réduisez le volume si la qualité baisse.' : 'Choisissez une difficulté qui permet de conserver une technique propre. Arrêtez en cas de douleur.',
  }
}

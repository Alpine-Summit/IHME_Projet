# APEX — Assistant de préparation physique

APEX est une application React/Vite qui construit une base de séance de renforcement personnalisée. L’utilisateur choisit son niveau, un objectif et les groupes musculaires à solliciter ; APEX propose 4 à 6 exercices cohérents, avec séries, répétitions, repos, consignes et variantes. La séance reste entièrement modifiable : remplacement, ajout, suppression, réorganisation et saisie des résultats réalisés.

Le moteur est déterministe et local. Il ne dépend d’aucune IA ni d’un service payant pour générer une proposition. L’historique récent sert à varier les mouvements proposés sans écraser les choix manuels.

## Scénario de démonstration

Un étudiant STAPS prépare une séance de renforcement général. Il indique son niveau, sélectionne « Renforcement général », coche « Quadriceps » et « Fessiers », puis lance la génération. Il vérifie les 4 à 6 mouvements proposés, remplace un exercice, réordonne la séance, renseigne ses charges et démarre le mode entraînement. À la fin, ses résultats apparaissent dans l’historique et la séance planifiée reste consultable dans le calendrier.

## Utilisation

```bash
npm install
npm --prefix frontend install
npm run dev
```

L’application est ensuite disponible sur `http://localhost:3000/` et sur le préfixe pédagogique configuré par le déploiement.

## Modèle de données

Le parcours principal conserve les données dans IndexedDB, sous un objet versionné :

- `profile` : `displayName` (texte), `level` (enum), `bodyMass` (nombre facultatif) ;
- `workouts` : `id` (UUID), `title`, `objective`, `muscles`, `scheduledFor`, `status`, dates de suivi et `exercises` ;
- un exercice de séance contient `exerciseId`, `sets`, `reps`, `restSeconds`, `load` et `performance`.

Pour le jalon PostgreSQL, [database/init.sql](./database/init.sql) décrit les tables `users`, `profiles`, `exercises`, `workouts` et `workout_exercises`. La clé primaire de `profiles` est aussi une clé étrangère vers `users`. Une séance est reliée à ses mouvements par `workout_id`.

Exemple de requête :

```sql
SELECT w.id, w.title, w.objective, w.status, w.scheduled_for
FROM workouts AS w
WHERE w.user_id = $1
ORDER BY COALESCE(w.scheduled_for, w.created_at) DESC;
```

Les séries sont des entiers, les répétitions restent un format texte pour accepter `8–12` ou `30 s`, les repos sont exprimés en secondes et les charges en kilogrammes lorsque l’utilisateur les renseigne.

## Règle métier

La règle unique est implémentée dans [frontend/src/engine/workoutEngine.js](./frontend/src/engine/workoutEngine.js) et réutilisée par [backend/planner.js](./backend/planner.js) :

1. filtrer les exercices compatibles avec l’objectif et le niveau ;
2. prioriser les groupes musculaires sélectionnés ;
3. écarter les mouvements récemment utilisés lorsque c’est possible ;
4. prescrire les séries, répétitions et repos selon l’objectif ;
5. renvoyer 4 à 6 exercices éditables.

La masse corporelle ne produit jamais une charge obligatoire. Elle peut seulement afficher une fourchette prudente et modifiable pour certains mouvements avec charge externe.

## Interface et persistance

Les vues React sont : création, séance modifiable, mode entraînement, calendrier, historique et sauvegarde. Les changements sont enregistrés automatiquement dans IndexedDB. Une séance n’est terminée qu’après l’action « Terminer ».

Les exports sont des JSON versionnés. L’import vérifie le format, la version, le profil et les séances avant de demander confirmation lorsque des données existent déjà. Une suppression du stockage du navigateur ou un changement d’appareil peut entraîner une perte : exportez régulièrement vos données.

## Vérifications

```bash
npm test
npm run lint
npm run build
docker build --build-arg BASE_PATH=/projet-ihme-p18/ -t apex .
```

Les tests couvrent le catalogue, la sélection par objectif/niveau/groupes musculaires, la variété liée à l’historique, les prescriptions prudentes, la génération de 4 à 6 exercices, les statuts planifiés et le refus des sauvegardes JSON invalides.

| Cas | Entrée | Résultat attendu |
|---|---|---|
| Normal | Niveau intermédiaire, force, quadriceps | Proposition cohérente de 4 à 6 mouvements éditables |
| Vide | Aucun groupe musculaire coché | Séance générale générée sans erreur |
| Limite | Niveau invalide ou objectif inconnu | Message d’erreur compréhensible, aucune séance incohérente |

## Architecture

```text
frontend/src/
  App.jsx                    interface et navigation
  data/                      catalogue et référentiels
  engine/                    sélection et prescriptions
  storage/                   IndexedDB et JSON
backend/
  server.js                  Express, API et livraison de l’interface
  planner.js                 adaptateur vers la règle métier commune
database/init.sql            schéma PostgreSQL de démonstration
```

Le [Dockerfile](./Dockerfile) compile le frontend puis sert les fichiers statiques avec Express. PostgreSQL est disponible via [docker-compose.yml](./docker-compose.yml) pour le jalon de modèle de données et l’API. Le parcours local n’exige pas de compte pour conserver les données dans le navigateur.

## Limites et suite possible

Le moteur reste une aide à la préparation : il ne remplace pas l’analyse d’un professionnel et ne garantit pas une performance ou l’absence de blessure. La prochaine évolution pertinente serait un test end-to-end du parcours complet et une authentification cloud optionnelle, uniquement avec accord explicite de l’utilisateur.

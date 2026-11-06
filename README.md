# APEX Performance

**Planifier le renforcement musculaire au service des sports d’endurance.**

APEX Performance aide les sportifs et leurs entraîneurs à structurer des séances, suivre leur réalisation et conserver un historique de préparation. L’interface est en français et s’adapte aux écrans mobiles comme aux ordinateurs.

## Le besoin en une minute

- **Utilisateur :** une personne en STAPS qui pratique le cyclisme, la course à pied ou le triathlon, ou qui accompagne un athlète.
- **Problème :** les séances de renforcement, les réglages prévus et les résultats réalisés sont souvent dispersés. Il devient difficile de planifier régulièrement et de comparer les objectifs aux résultats.
- **Entrées :** orientation (force, puissance, endurance musculaire, pliométrie ou renforcement général), groupes musculaires, date, masse corporelle facultative et ajustements des exercices.
- **Résultat :** une séance structurée et datée, visible au calendrier, puis un suivi séparé de la réalisation et des notes de séance.

### Scénario de démonstration

1. Paul choisit « Force », cible les quadriceps, saisit une date et, s’il le souhaite, sa masse corporelle en kilogrammes.
2. APEX propose une sélection d’exercices avec séries, répétitions, récupération et consignes modifiables.
3. La séance est enregistrée avec le statut **Planifiée** et apparaît au calendrier.
4. Le jour de la séance, Paul ouvre celle-ci, démarre la réalisation, saisit ses résultats et ses sensations, puis valide explicitement.
5. Le programme prévu reste conservé comme référence de l’historique.

## Fonctionnalités

- Séances datées avec orientation et sélection de groupes musculaires.
- Bibliothèque d’exercices organisée et recherchable.
- Séries, répétitions, repos, charges indicatives et consignes modifiables.
- Calendrier mensuel, déplacement de séances planifiées et statuts distincts.
- Verrouillage du programme au démarrage ; résultats réels et notes suivis séparément.
- Historique, import et export d’une sauvegarde JSON.
- Interface responsive et données locales conservées dans le navigateur.

## Architecture et circulation des données

```text
React + Vite (frontend/src)
  ├─ formulaire, calendrier, suivi et historique
  ├─ moteur de séances (frontend/src/engine)
  └─ sauvegarde principale du navigateur (IndexedDB)

Node.js + Express (backend/server.js)
  ├─ API REST, comptes et sessions
  ├─ génération d’une séance via le moteur partagé
  └─ requêtes PostgreSQL avec paramètres

PostgreSQL (database/init.sql) ← Docker Compose (app + db)
```

Le parcours React actuel conserve son profil et ses séances dans **IndexedDB** sur l’appareil utilisé. Le serveur Node.js expose séparément des routes API authentifiées qui stockent les comptes, profils et séances de l’API dans PostgreSQL. **La connexion, la synchronisation cloud et la sauvegarde des réalisations depuis l’interface React ne sont pas encore implémentées** : les données créées dans l’interface ne sont donc pas envoyées à PostgreSQL et ne sont pas synchronisées entre appareils. Exportez régulièrement vos données depuis l’onglet **Sauvegarde**.

### Technologies

- **React 19** et **Vite** : interface et développement frontend.
- **Node.js 24** et **Express 5** : serveur web et API.
- **PostgreSQL 16** : données du backend.
- **Docker Compose** : démarrage coordonné du serveur et de la base.

## Modèle de données

Le schéma complet et son initialisation sont dans [`database/init.sql`](./database/init.sql).

| Table | Clé et relation | Données principales |
|---|---|---|
| `users` | `id` clé primaire ; `email` unique | Compte et empreinte du mot de passe |
| `sessions` | `id` clé primaire ; `user_id` référence `users.id` | Empreinte de session et date d’expiration |
| `profiles` | `user_id` clé primaire et référence `users.id` | Prénom, masse et préférences |
| `exercises` | `id` clé primaire ; `name` unique | Groupes musculaires, objectifs et équipement |
| `workouts` | `id` clé primaire ; `user_id` référence `users.id` | Titre, orientation, date, statut et notes |
| `workout_exercises` | Clé composée `(workout_id, order_index)` | Exercices ordonnés reliés à une séance et à `exercises.id` |

Une séance peut contenir plusieurs exercices et un même exercice peut apparaître dans plusieurs séances : `workout_exercises` porte cette relation et l’ordre des mouvements. Les unités sont explicites : `body_mass` en kilogrammes, `sets` en nombre de séries, `reps` en texte pour accepter une plage ou un format, `rest_seconds` en secondes, `load_percentage` en pourcentage, et `scheduled_for` en date.

Exemple : afficher les mouvements d’une séance d’un utilisateur, dans l’ordre prévu. `$1` et `$2` sont transmis comme paramètres par le client PostgreSQL, et non concaténés dans la requête.

```sql
SELECT w.title,
       w.scheduled_for,
       e.name AS exercise,
       we.order_index,
       we.sets,
       we.reps,
       we.rest_seconds
FROM workouts AS w
LEFT JOIN workout_exercises AS we ON we.workout_id = w.id
LEFT JOIN exercises AS e ON e.id = we.exercise_id
WHERE w.user_id = $1 AND w.id = $2
ORDER BY we.order_index;
```

## API et règles métier

Le serveur expose notamment :

| Route | Utilité |
|---|---|
| `GET /api/health` | Vérifier le serveur et l’état de la connexion PostgreSQL |
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` | Créer et gérer une session |
| `GET /api/me`, `PUT /api/profile` | Lire le compte et mettre à jour le profil |
| `GET /api/exercises?objective=force` | Filtrer le catalogue par objectif |
| `POST /api/workouts`, `GET /api/workouts` | Générer, enregistrer et lister les séances de l’API |
| `PATCH /api/workouts/:id/status` | Mettre à jour le statut d’une séance enregistrée |

Le moteur partagé (`frontend/src/engine/workoutEngine.js`) contrôle l’objectif, la date ISO, le titre (100 caractères maximum), le prénom (40 caractères maximum) et la masse (20 à 300 kg si elle est renseignée). Il privilégie les muscles choisis et tient compte des séances récentes. Il propose généralement quatre à six exercices ; il peut en sélectionner davantage pour couvrir tous les groupes demandés. Les suggestions de charge restent indicatives et modifiables.

Exemple reproductible vérifié avec le moteur :

```js
generateWorkout(
  { bodyMass: 70, muscles: ['Quadriceps'] },
  { objective: 'force', scheduledFor: '2026-11-06' }
)
```

Résultat vérifié : titre « Force · séance personnalisée », date `2026-11-06`, statut `planned` (affiché « Planifiée ») et six exercices. Sans groupe musculaire sélectionné, l’objectif général produit quand même une séance. Une date manquante ou impossible et une masse hors limites sont rejetées avec un message explicite.

Dans le schéma PostgreSQL, le statut initial d’une nouvelle séance est également `planned`. Les routes API actuelles enregistrent une programmation simplifiée ; elles ne sauvegardent pas encore l’instantané immuable du programme, les résultats réalisés exercice par exercice ni les notes du carnet de l’interface.

## Installation et lancement

### Lancement complet avec Docker

Prérequis : Docker Desktop avec Docker Compose.

```bash
cp .env.example .env
```

Pour un usage local, remplacez `POSTGRES_PASSWORD` dans `.env` par un mot de passe local. Le fichier `.env` est ignoré par Git et ne doit jamais être publié. Les valeurs d’exemple sont réservées au développement.

```bash
docker compose up --build -d
docker compose ps
```

Ouvrir [http://localhost:3000](http://localhost:3000). Vérifier l’API et PostgreSQL :

```bash
curl http://localhost:3000/api/health
```

Une réponse `{"status":"ok","database":"connected"}` confirme que le serveur communique avec PostgreSQL. Pour arrêter les services sans supprimer les données :

```bash
docker compose down
```

La suppression du volume PostgreSQL efface définitivement les données de cette installation locale ; ne lancez `docker compose down -v` que si cette suppression est voulue.

### Développement frontend

Prérequis : Node.js 24 et npm.

```bash
npm ci
npm ci --prefix frontend
npm run build
npm run dev
```

Le serveur est disponible sur `http://localhost:3000`. Pour le rechargement à chaud du frontend, lancez aussi `npm run dev:frontend` dans un second terminal ; Vite démarre sur `http://localhost:5173`. Les routes `/api` de Vite sont redirigées vers le serveur Node local.

## Vérifications

Commandes automatisées à la racine :

```bash
npm test
npm run lint
npm run build
docker compose --env-file .env.example config -q
```

Résultats de vérification effectués le 6 novembre 2026 :

- **Tests Node.js :** 21 réussis, 0 échec (moteur, cycle de vie, imports/exports et adaptateur de génération).
- **ESLint :** réussi.
- **Build Vite de production :** réussi.
- **Docker Compose :** configuration valide ; les deux conteneurs sont devenus sains.
- **API avec PostgreSQL réel en conteneurs :** health `200`, inscription `200`, profil `200`, création `201`, liste `200` avec le même identifiant PostgreSQL que la création, mise à jour du statut `200`. Une masse de `301 kg` et une date absente ont été rejetées (`400`).

| Essai | Entrée | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| Normal | Force, quadriceps, date `2026-11-06`, masse `70 kg` | Séance datée, statut planifié et exercices proposés | Conforme ; six exercices avec le moteur |
| Vide | Aucun groupe musculaire sélectionné, objectif général et date valide | Une séance générale reste générable | Conforme ; test automatisé réussi |
| Limite | Masse `300 kg` puis `301 kg` | `300 kg` accepté ; `301 kg` refusé | Conforme dans les tests moteur ; l’API a également refusé `301 kg` |
| Date invalide | Date absente ou `2026-02-31` | Erreur compréhensible ; aucune séance ajoutée | Conforme ; tests moteur et API réussis |

Les contrôles UI et la démonstration devant un enseignant restent à rejouer dans le contexte de présentation. Cette évaluation humaine facultative n’est pas calculée à partir des commits ni des tests automatisés.

## Déploiement et démonstration

Le workflow GitHub Actions [`publish.yml`](./.github/workflows/publish.yml) vérifie le code, construit l’image Docker et la publie dans GitHub Container Registry lors d’un push sur `main` ou `master`. Le déploiement vers un hébergeur n’est déclenché que manuellement et nécessite la configuration de `IHME_DEPLOY_URL`, `IHME_DEPLOY_TOKEN` et `IHME_BASE_PATH` dans les paramètres du dépôt. Aucun lien public de production n’est actuellement configuré.

Pour présenter le fonctionnement en deux minutes :

1. Décrire le besoin de Paul et réaliser la planification d’une séance dans React.
2. Expliquer que `generateWorkout` contrôle les entrées puis sélectionne et prescrit les exercices.
3. Montrer que l’interface conserve actuellement les données dans IndexedDB.
4. Montrer séparément l’API Express, la requête paramétrée PostgreSQL et le contrôle `/api/health` sous Docker.
5. Présenter les essais normal, vide et limite ci-dessus, puis signaler la limite de synchronisation entre le frontend et l’API.

**Limite et amélioration prioritaire :** connecter l’interface React à l’authentification et aux routes PostgreSQL, puis étendre le modèle API pour conserver les instantanés programmés, les réalisations détaillées et les notes par exercice. En attendant, l’IndexedDB locale et l’export JSON restent le stockage effectif du parcours web.

Les charges proposées ne constituent pas un avis médical. Interrompez un mouvement en cas de douleur et adaptez la séance à votre situation.

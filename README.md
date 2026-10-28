# Move — préparation physique personnalisée

Move est une application React/Vite qui propose des séances de préparation physique à partir du sport, du niveau, de l’objectif, des groupes musculaires et de la durée souhaitée. Le catalogue considère que l’utilisateur peut disposer du matériel nécessaire ; chaque exercice affiche toutefois son matériel requis.

Le moteur sportif est déterministe et local : aucune API d’IA, aucun compte et aucune connexion ne sont nécessaires pour utiliser l’application.

## Fonctionnalités

- profil local simplifié : nom, sport principal et masse facultative ;
- sélection exhaustive des muscles ciblés directement au moment de la génération ;
- objectifs distincts : force, puissance, endurance musculaire, pliométrie et renforcement général ;
- catalogue d’exercices structuré et extensible dans `frontend/src/data/exercises.js` ;
- moteur de sélection et de prescription dans `frontend/src/engine/workoutEngine.js` ;
- échauffement, consignes, précautions et variantes ;
- édition d’une séance : ajout, suppression, déplacement, séries, répétitions, repos et charge ;
- recalcul de la durée estimée avec alerte si la cible est dépassée ;
- fourchette de charge externe indicative, calculée prudemment selon le poids, le niveau et la famille de mouvement ;
- mode entraînement avec exercice courant et performances réellement réalisées ;
- calendrier mensuel, planification, historique et statuts `generated`, `planned`, `started`, `completed` ;
- sauvegarde persistante dans IndexedDB ;
- export/import JSON versionné avec validation et confirmation ;
- interface responsive et accessible sur mobile et ordinateur.

## Cadrage du besoin — scénario de démonstration

Move s’adresse à un étudiant STAPS, coureur ou cycliste, qui veut préparer une séance de renforcement sans devoir construire seul les séries, répétitions et temps de repos. Il renseigne son nom, son sport, son poids facultatif, un objectif, les muscles ciblés et une durée. L’application propose alors une séance structurée ; l’utilisateur peut la modifier, la planifier, l’effectuer et enregistrer ses résultats.

Scénario à présenter en une minute :

1. Depuis « Créer », renseigner le profil et choisir « Force », « Quadriceps » et « Fessiers » pour 45 minutes.
2. Cliquer sur « Proposer une séance » et vérifier que la date éventuelle crée une entrée dans le calendrier.
3. Modifier les séries, le repos ou l’ordre des exercices ; la durée estimée et l’alerte de dépassement se mettent à jour.
4. Cliquer sur « Commencer », renseigner une performance, puis « Terminer ».
5. Retrouver la séance dans l’historique et l’exporter depuis « Sauvegarde ».

## Modèle de données et unités

Le fonctionnement local utilise un objet versionné sauvegardé dans IndexedDB : `profile` contient le nom, le sport, le niveau et la masse en kg ; `workouts` contient les séances ; chaque séance contient un statut, une date éventuelle, une durée cible en minutes et ses exercices. Les identifiants de séance sont uniques et les exercices du catalogue ont des identifiants stables.

Le schéma PostgreSQL fourni par Docker reprend les mêmes notions pour préparer une évolution serveur : `users` possède la clé primaire de l’utilisateur, `workouts.user_id` référence cet utilisateur, et `workout_exercises.workout_id` référence la séance. Exemple de requête démontrable :

```sql
SELECT id, title, scheduled_for, status, duration_minutes
FROM workouts
WHERE user_id = 1
ORDER BY scheduled_for NULLS LAST, created_at DESC;
```

Les durées sont en minutes, les repos en secondes, les charges en kilogrammes et la masse corporelle en kilogrammes. Les charges proposées restent indicatives : la masse corporelle seule ne permet pas de calculer une charge optimale.

## API et règle métier expliquable

Le moteur principal est local dans `frontend/src/engine/workoutEngine.js`. Il filtre d’abord les exercices compatibles avec l’objectif, le sport, le niveau et les muscles sélectionnés, puis applique une prescription adaptée à l’objectif. La durée estimée additionne le temps de travail, les repos et une marge de transition ; elle est recalculée après chaque modification.

Exemple de cas limite à expliquer : si aucun exercice ne correspond au sport, au niveau ou à l’objectif, le moteur refuse de créer une séance et affiche un message compréhensible au lieu de produire une séance incohérente. Pour la pliométrie débutant, le volume reste limité et les consignes de réception apparaissent dans la séance.

## Trois essais de vérification

| Essai | Entrée | Résultat attendu |
| --- | --- | --- |
| Normal | Force, 45 min, Quadriceps + Fessiers, date choisie | Séance créée, exercices compatibles, durée affichée et séance présente au calendrier |
| Vide | Aucun muscle sélectionné | Séance générale cohérente, sans erreur et sans sélection artificiellement imposée |
| Limite | Modifier plusieurs exercices jusqu’à dépasser 45 min | Alerte de dépassement, durée recalculée, modifications conservées après rafraîchissement |

Les tests automatisés couvrent la sélection par objectif/niveau, la pliométrie débutant, le recalcul de durée et la suggestion de charge. Les essais manuels ci-dessus servent à démontrer le parcours React complet.

La masse corporelle ne suffit jamais à déduire une charge optimale. Les charges externes sont saisies et ajustées par l’utilisateur. Les recommandations sont pédagogiques et ne remplacent pas l’avis d’un professionnel de santé ou d’un entraîneur qualifié.

Les fourchettes de charge sont des points de départ, jamais des prescriptions. Elles sont volontairement prudentes et disparaissent si le poids n’est pas renseigné ou si la charge d’une machine n’est pas comparable. L’utilisateur commence par le bas de la fourchette, garde environ 2 à 3 répétitions en réserve et réduit la charge si la technique se dégrade. Cette logique s’inspire des recommandations relatives à l’intensité de la [NSCA](https://dxpprod.nsca.com/education/articles/nsca-coach/using-intensity-based-on-sets-and-repetitions-over-50-years-of-experience-a-brief-overview/) et du consensus expert sur le choix des exercices chez les débutants ([Delphi study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11873903/)). Les standards exprimés en multiples du poids du corps, comme ceux de [BarBend](https://barbend.com/squat-standards/), servent uniquement de repères de niveau et ne sont pas utilisés comme charges d’entraînement automatiques.

## Architecture

```text
frontend/src/data/          catalogue indépendant de l’interface
frontend/src/engine/        sélection, prescriptions et durée
frontend/src/storage/       IndexedDB et import/export
frontend/src/App.jsx        vues React et interactions
backend/                    Node.js + Express + compatibilité PostgreSQL
database/init.sql           schéma et catalogue SQL pour Docker
Dockerfile                  image production frontend + API
docker-compose.yml          environnement local Node/PostgreSQL
```

Les données personnelles restent dans le navigateur. Le backend Node.js et PostgreSQL sont conservés pour l’exécution Docker, la santé du service et l’évolution future du catalogue ; l’application locale ne dépend pas d’un compte distant. Move est un assistant : sa proposition n’impose jamais la séance finale.

Le backend Node.js réutilise directement le moteur de `frontend/src/engine/workoutEngine.js` : il n’existe plus de seconde règle de génération. Le catalogue React est donc la source commune de la sélection, des prescriptions et du calcul de durée.

## Développement local

Pré-requis : Node.js 24, npm et Docker Desktop si PostgreSQL est utilisé.

Pour lancer le frontend en mode développement :

```sh
cd IHME_Projet
npm ci --prefix frontend
npm run dev:frontend
```

Ouvrir l’URL affichée par Vite, généralement `http://localhost:5173`.

Pour lancer l’API Node.js et PostgreSQL avec Docker :

```sh
cp .env.example .env
docker compose up --build
```

L’application est alors disponible sur `http://localhost:3000`. Le service `db` est PostgreSQL ; le service `app` construit l’interface React puis la sert avec Express. Le volume Docker conserve les données PostgreSQL entre deux arrêts.

Pour arrêter les conteneurs :

```sh
docker compose down
```

Éviter `docker compose down -v` si le volume PostgreSQL doit être conservé.

## Vérifications

```sh
npm test
npm run lint
npm run build
docker compose config
docker build -t move:local .
```

Les tests couvrent la prescription par objectif et niveau, la sélection liée aux muscles, la pliométrie débutant et le recalcul de durée. La CI exécute les tests, le lint, le build et la construction Docker.

## Sauvegarde des données

Utiliser « Exporter » régulièrement. L’export contient le profil local, les séances, les modifications et les performances réellement réalisées. L’import vérifie le format et la version ; si des séances existent déjà, une confirmation est demandée avant remplacement.

La suppression des données du navigateur ou le changement d’appareil peut faire perdre les données locales si elles n’ont pas été exportées. Aucune synchronisation cloud n’est activée.

## Docker et publication GitHub

Le [Dockerfile](./Dockerfile) utilise une étape de build Node.js pour compiler Vite, puis une image runtime plus légère qui exécute Express. PostgreSQL est fourni séparément par [docker-compose.yml](./docker-compose.yml).

Le workflow [`.github/workflows/publish.yml`](./.github/workflows/publish.yml) :

1. installe les dépendances ;
2. lance les tests, le lint et le build ;
3. construit une image Linux avec Docker ;
4. publie l’image dans GHCR ;
5. ne déploie que si le workflow est lancé manuellement avec l’option de déploiement et les secrets du serveur configurés.

Les secrets et les fichiers `.env` ne doivent jamais être commités.

## Limites connues et prochaines évolutions

- Les données personnelles restent propres au navigateur : la suppression du stockage ou le changement d’appareil peut les faire disparaître sans export JSON.
- PostgreSQL est actuellement préparé pour le déploiement et l’évolution future ; le parcours principal local ne nécessite pas de compte.
- Le catalogue et le moteur local sont la source de vérité de la génération. Une prochaine évolution pourra partager ces règles avec l’API pour éviter deux moteurs métier.
- Une prochaine étape recommandée est d’ajouter des tests end-to-end du parcours création → calendrier → entraînement → historique, puis un test de démarrage Docker/PostgreSQL dans la CI.

# Move — préparation physique personnalisée

Move est une application React/Vite qui génère des séances de préparation physique à partir du sport, du niveau, de l’objectif, des groupes musculaires, du matériel et de la durée souhaitée.

Le moteur sportif est déterministe et local : aucune API d’IA, aucun compte et aucune connexion ne sont nécessaires pour utiliser l’application.

## Fonctionnalités

- profil local : sport, niveau, masse facultative, groupes musculaires et matériel ;
- objectifs distincts : force, puissance, endurance musculaire, pliométrie et renforcement général ;
- catalogue d’exercices structuré et extensible dans `frontend/src/data/exercises.js` ;
- moteur de sélection et de prescription dans `frontend/src/engine/workoutEngine.js` ;
- échauffement, consignes, précautions et variantes ;
- édition d’une séance : ajout, suppression, déplacement, séries, répétitions, repos et charge ;
- recalcul de la durée estimée avec alerte si la cible est dépassée ;
- mode entraînement avec exercice courant et performances réellement réalisées ;
- calendrier mensuel, planification, historique et statuts `generated`, `planned`, `started`, `completed` ;
- sauvegarde persistante dans IndexedDB ;
- export/import JSON versionné avec validation et confirmation ;
- interface responsive et accessible sur mobile et ordinateur.

La masse corporelle ne suffit jamais à déduire une charge optimale. Les charges externes sont saisies et ajustées par l’utilisateur. Les recommandations sont pédagogiques et ne remplacent pas l’avis d’un professionnel de santé ou d’un entraîneur qualifié.

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

Les données personnelles restent dans le navigateur. Le backend Node.js et PostgreSQL sont conservés pour l’exécution Docker, la santé du service et l’évolution future du catalogue ; l’application locale ne dépend pas d’un compte distant.

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

Les tests couvrent la prescription par objectif, le niveau et le matériel, la pliométrie débutant et le recalcul de durée. La CI exécute les tests, le lint, le build et la construction Docker.

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

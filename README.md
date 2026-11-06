# APEX Performance

APEX est une plateforme de planification du renforcement conçue pour les sportifs d’endurance et leurs entraîneurs. Elle permet de préparer une séance, de l’inscrire au calendrier, puis de comparer le programme prévu aux performances réellement réalisées.

## Fonctionnalités

- Créer des séances selon une orientation, des groupes musculaires ciblés et une date.
- Composer chaque programme avec un catalogue de plus de 100 exercices, organisé par catégories musculaires et doté d’une recherche.
- Ajuster les séries, répétitions, récupérations, charges et consignes avant la séance.
- Consulter le calendrier mensuel et déplacer une séance planifiée vers une autre date.
- Verrouiller le programme au démarrage, puis saisir séparément les séries, répétitions, charges, récupérations et mouvements non réalisés.
- Tenir un carnet de séance : sensations, fatigue, difficultés, gênes et observations.
- Valider explicitement la séance pour conserver le programme et la réalisation dans l’historique.
- Exporter ou importer une sauvegarde JSON.
- Utiliser une interface responsive sur ordinateur, tablette et smartphone.

## Confidentialité et données

Le parcours web enregistre les données du profil et les séances dans **IndexedDB**, dans le navigateur utilisé. Ces données ne sont pas synchronisées entre appareils et le parcours principal ne les transmet pas au serveur. Exportez régulièrement vos données depuis l’onglet **Sauvegarde**, en particulier avant de changer de navigateur ou d’appareil.

Les anciennes sauvegardes sont migrées lors de leur chargement. Les séances démarrées ou validées gardent un instantané de leur programme et un objet de réalisation indépendant. Les séances validées sont consultables en lecture seule.

Les informations de suivi ne constituent pas un avis médical. Une charge proposée est indicative ; adaptez l’entraînement à votre contexte et interrompez un exercice en cas de douleur.

## Architecture

```text
frontend/                     Interface React construite avec Vite
  src/App.jsx                 Navigation, planification et vues de séance
  src/engine/                 Génération et cycle de vie des séances
  src/storage/                IndexedDB, sauvegarde et import/export
  src/assets/                 Identité visuelle, photos sportives et illustrations
backend/                      Serveur Node.js / Express
  planner.js                  Adaptateur vers le moteur de génération
  server.js                   API et service de l’application
database/init.sql             Schéma PostgreSQL
docker-compose.yml             Services de l’application et de PostgreSQL
```

Le serveur Express et PostgreSQL sont disponibles pour le déploiement et l’évolution des services. L’application web utilise actuellement le stockage local du navigateur pour son parcours de planification.
Les photographies de performance utilisées en arrière-plan sont intégrées localement aux ressources du frontend (Unsplash).

## Prérequis

- Node.js 24 ou version ultérieure
- npm
- Docker et Docker Compose pour un lancement conteneurisé avec PostgreSQL

## Installation locale

À la racine du dépôt :

```bash
npm install
npm --prefix frontend install
```

Lancer l’application et l’API :

```bash
npm run dev
```

L’application est servie sur `http://localhost:3000`. Pour lancer Vite séparément :

```bash
npm run dev:frontend
```

## Vérification

```bash
npm test
npm run lint
npm run build
```

## Conteneurisation

```bash
docker compose up --build
```

Configurer les variables d’environnement locales selon `.env.example`. Ne publiez jamais de fichier `.env`, de mot de passe, de jeton ou de clé privée.

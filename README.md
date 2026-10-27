# Projet IHME

## Présentation

Cette App est une application web qui propose des idées d'exercices de musculation et de renforcement musculaire pour un utilisateur.

L'utilisateur indique :
- sa masse corporelle ;
- son objectif (puissance, force, endurance);
- les muscles qu'il souhaite travailler.

L'application lui propose ensuite plusieurs exercices adaptés à ses choix.

L'objectif n'est pas de créer une séance complète, mais simplement d'aider l'utilisateur à trouver des exercices lorsqu'il manque d'idées.

## Objectifs

- Proposer des exercices adaptés aux muscles sélectionnés.
- Adapter les exercices à l'objectif de l'utilisateur.
- Proposer une estimation de charge adaptée au poids de l'utilisateur lorsque cela est pertinent.
- Présenter les exercices de manière simple et claire.

## Technologies

- React : frontend
- Node.js : backend
- PostgreSQL : base de données
- Docker : environnement de développement

## Fonctionnement

```text
Utilisateur
     ↓
Choix des muscles à travailler
     +
Choix de l'objectif
     +
Masse corporelle
     ↓
Application
     ↓
Exercices proposés
```

## Lancer le prototype

Le frontend peut être lancé seul :

```bash
cd frontend
npm install
npm run dev
```

Pour lancer l’API Express et le frontend compilé :

```bash
npm install
npm run build
npm start
```

L’API répond sur `http://localhost:3000/api/health`.

Avec Docker Compose, PostgreSQL et l’application démarrent ensemble :

```bash
docker compose up --build
```

Les exercices affichés sont encore des données de démonstration. PostgreSQL est préparé avec une première table dans `database/init.sql`; la prochaine étape sera d’y transférer les exercices et de faire lire cette table par l’API.

## Déploiement

Le projet reprend le principe du dépôt du professeur : GitHub Actions construit une image Docker compatible Linux, la publie dans GHCR et le déploiement est déclenché volontairement. Le client `deploy/request.py` transmet ensuite le digest immuable au serveur du cours.

Dans GitHub, configurer dans **Settings → Secrets and variables → Actions** :

- secret `IHME_DEPLOY_TOKEN` : jeton fourni par l’enseignant ;
- variable `IHME_DEPLOY_URL` : URL privée terminée par `/__deploy/pNN` ;
- variable `IHME_BASE_PATH` : chemin web attribué, par exemple `/mon-projet/`.

Ces valeurs ne doivent jamais être écrites dans le dépôt. Après un push, vérifier la construction dans **Actions**, puis lancer manuellement le workflow avec **Déployer cette version après construction**.

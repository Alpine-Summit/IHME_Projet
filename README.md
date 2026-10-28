# Move — préparation physique personnalisée

Application React/Vite de préparation physique avec un mode local sans compte. Le profil, les séances planifiées et l’historique sont enregistrés dans le navigateur de l’utilisateur avec `localStorage`.

## Fonctionnalités

- aucune création de compte obligatoire ;
- profil sportif local : sport, niveau, objectifs, zones et matériel ;
- séances de 30, 45 ou 60 minutes ;
- force, puissance, endurance musculaire, pliométrie et renforcement général ;
- échauffement, séries, répétitions, repos, difficulté et consignes ;
- calendrier local, validation des séances réalisées et suppression ;
- export/import JSON pour sauvegarder ou transférer les données ;
- interface React/Vite responsive.

Les prescriptions sont des règles pédagogiques explicites. Aucune charge n’est déduite de la seule masse corporelle. Pour la pliométrie, la qualité de réception prime sur le volume. L’application n’est pas un dispositif médical.

## Lancement local

Le mode local fonctionne sans PostgreSQL ni backend :

```bash
cd IHME_Projet
npm ci --prefix frontend
npm run dev:frontend
```

Ouvrir l’adresse affichée par Vite, généralement `http://localhost:5173`.

Les données sont propres au navigateur et à l’ordinateur utilisés. Il faut exporter régulièrement le fichier `move-calendrier.json`, car une suppression des données du navigateur peut supprimer le calendrier.

## Vérifications

```bash
npm test
npm run lint
npm run build
```

Le backend Express/PostgreSQL reste présent dans le projet pour une future synchronisation facultative, mais il n’est pas requis par l’interface actuelle.

## Déploiement

Le workflow [.github/workflows/publish.yml](./.github/workflows/publish.yml) conserve la méthode du dépôt pédagogique du professeur : image Docker publiée dans GHCR puis déploiement volontaire avec digest immuable. Les secrets ne sont pas versionnés.

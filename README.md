# APEX Performance — Strength Systems

APEX est un assistant de préparation physique qui transforme un objectif et des groupes musculaires en une proposition de séance de renforcement, structurée et entièrement modifiable. Il s’adresse notamment aux étudiants STAPS et aux sportifs qui veulent préparer leur renforcement sans perdre de temps à bâtir seuls chaque séance.

APEX ne décide pas à la place de l’utilisateur : il propose une base argumentée, puis laisse la personne choisir les mouvements, les séries, les répétitions, les temps de repos et les charges qu’elle souhaite réaliser.

## Le besoin en une minute

Un étudiant STAPS prépare une séance de force pour les jambes. Il indique son prénom, renseigne éventuellement sa masse, sélectionne « Force », cible quadriceps et fessiers, donne un titre à la séance et, s’il le souhaite, choisit sa date. APEX propose quatre à six mouvements adaptés à la programmation de force, avec prescriptions, consignes et variantes. L’étudiant remplace un mouvement, réorganise la séance, ajuste séries et charges, puis l’enregistre au calendrier. Pendant la séance, il note ce qu’il a réellement réalisé ; à la fin, il la marque terminée et la retrouve dans son historique.

## Principes fonctionnels

- Le moteur sélectionne des exercices adaptés à une pratique avancée.
- Le profil garde le prénom et la masse corporelle facultative ; la masse sert à contextualiser une fourchette de charge indicative sur certains exercices.
- L’utilisateur choisit un objectif et, s’il le souhaite, les muscles à cibler.
- La génération propose de quatre à six exercices, sélectionnés dans le catalogue puis ordonnés en priorisant les muscles demandés et en alternant les exercices des séances récentes.
- Le titre peut être saisi librement (100 caractères maximum) pour identifier plus facilement la séance au calendrier.
- L’utilisateur garde la main : il peut remplacer, ajouter, supprimer ou réordonner les exercices et modifier les prescriptions et charges.
- La génération ne marque jamais automatiquement une séance comme terminée.

Les charges proposées ne sont pas des prescriptions optimales ni des consignes médicales. La masse seule ne permet pas de connaître la capacité d’une personne : les valeurs sont indicatives et modifiables, et l’utilisateur peut les laisser vides.

## Parcours de l’application

1. **Créer** : le poids est facultatif ; choisir un objectif, des muscles, un titre et éventuellement une date.
2. **Ajuster** : inspecter l’échauffement, les consignes et les exercices ; remplacer, ajouter, retirer, déplacer ou modifier les prescriptions.
3. **S’entraîner** : démarrer la séance et noter les résultats réalisés au fil des mouvements.
4. **Retrouver** : parcourir le calendrier et l’historique, ouvrir ou supprimer une séance.
5. **Sauvegarder** : exporter ses données en JSON ou réimporter une sauvegarde compatible.

## Architecture

```text
frontend/src/
  App.jsx                    navigation, formulaires et vues React
  App.css, local.css         système visuel responsive
  assets/                    identité APEX et image d’ambiance SVG locale
  data/                      catalogue d’exercices et objectifs
  engine/                    sélection, variation et prescriptions
  storage/                   IndexedDB et import/export JSON
backend/
  server.js                  API Express, auth API et livraison du frontend
  planner.js                 adaptateur vers le moteur métier commun
database/init.sql            schéma et données de démonstration PostgreSQL
Dockerfile                   build Vite et image de service Node.js
docker-compose.yml           environnement application + PostgreSQL
```

React et Vite assurent l’interface. Node.js et Express servent l’application et exposent une API de démonstration. Le moteur utilisé par l’interface est déterministe et local : aucune IA ou API externe n’est nécessaire. PostgreSQL est préparé pour le jalon de modélisation et l’évolution API ; l’application principale n’impose pas de compte et garde ses données dans le navigateur.

### Règle de génération

La règle unique se trouve dans [`frontend/src/engine/workoutEngine.js`](./frontend/src/engine/workoutEngine.js) et est réutilisée côté Node par [`backend/planner.js`](./backend/planner.js) :

1. filtrer les exercices compatibles avec l’objectif ;
2. prioriser ceux qui sollicitent les groupes musculaires choisis ;
3. tenir compte des trois séances récentes pour réduire les répétitions si le catalogue le permet ;
4. appliquer les séries, répétitions et repos configurés pour l’objectif ;
5. renvoyer quatre à six mouvements avec leurs consignes, variantes et précautions.

Le catalogue distingue les exercices accessibles à une pratique avancée. La sélection et les remplacements respectent cette règle.

## Modèle de données

Le stockage courant est IndexedDB, dans un document versionné :

| Donnée | Type / exemple | Rôle |
|---|---|---|
| `profile.firstName` | texte, 40 caractères maximum | Accueil personnalisé |
| `profile.bodyMass` | nombre en kg ou vide | Contexte facultatif des recommandations de charge |
| `workouts[].id` | UUID | Identifiant stable de séance |
| `workouts[].title` | texte, 100 caractères maximum | Repérage dans le calendrier et l’historique |
| `workouts[].objective` | identifiant d’objectif | Règle de prescription appliquée |
| `workouts[].bodyMass` | nombre en kg ou `null` | Masse utilisée pour les recommandations de cette séance |
| `workouts[].muscles` | tableau de libellés | Groupes musculaires ciblés |
| `workouts[].scheduledFor` | date `YYYY-MM-DD` ou `null` | Planification calendrier |
| `workouts[].status` | `generated`, `planned`, `started`, `completed` | État du parcours |
| `workouts[].exercises[]` | identifiant, séries, répétitions, repos, charge, résultats | Proposition et travail réellement effectué |

Dans PostgreSQL, `users.id` est la clé primaire des utilisateurs. `profiles.user_id` référence `users.id` et `profiles.first_name` conserve le prénom. `workouts.id` est la clé primaire des séances et `workout_exercises` relie une séance à ses exercices avec une position (`order_index`). Les repos sont stockés en secondes, les masses et charges en kilogrammes, et les répétitions en texte pour permettre des formats comme `8–12` ou `30 s`.

Exemple de lecture des séances d’un utilisateur :

```sql
SELECT w.id, w.title, w.objective, w.status, w.scheduled_for
FROM workouts AS w
WHERE w.user_id = $1
ORDER BY COALESCE(w.scheduled_for, w.created_at) DESC;
```

`$1` est l’identifiant utilisateur passé comme paramètre SQL, et non concaténé dans la requête. Le schéma complet et les exercices de démonstration sont dans [`database/init.sql`](./database/init.sql).

## Lancer le projet

Prérequis : Node.js 24 ou plus récent et npm.

```bash
npm install
npm --prefix frontend install
npm run dev
```

Le serveur Express démarre sur `http://localhost:3000`. Il sert l’application compilée ; pour développer l’interface Vite directement :

```bash
npm run dev:frontend
```

Pour PostgreSQL, copier `.env.example` vers `.env`, compléter les valeurs locales, puis lancer :

```bash
docker compose up --build
```

Ne jamais publier le fichier `.env` ni ses secrets.

## Sauvegarde et confidentialité

Les séances et le profil facultatif sont enregistrés automatiquement dans IndexedDB, sur l’appareil. Ils ne sont pas envoyés au serveur par le parcours principal. Les sauvegardes JSON comprennent un format et une version ; les anciennes versions prises en charge sont migrées au chargement. Les fichiers mal formés, versions inconnues ou valeurs de masse hors limites sont refusés avec un message explicite. L’import demande confirmation avant de remplacer des données déjà présentes.

Un effacement du stockage du navigateur ou un changement d’appareil peut entraîner une perte des données locales : exporter régulièrement une sauvegarde.

## Vérifications et démonstration

Commandes de contrôle :

```bash
npm test
npm run lint
npm run build
docker build --build-arg BASE_PATH=/projet-ihme-p18/ -t apex .
```

Les tests automatisés portent notamment sur la sélection et la variété, le nombre d’exercices, les prescriptions, la validation du titre et de la masse, les statuts et l’import de sauvegardes.

| Essai manuel | Entrée | Résultat attendu |
|---|---|---|
| Parcours normal | Prénom, masse 72 kg, force, quadriceps/fessiers, titre « Force bas du corps », date choisie | 4 à 6 mouvements pertinents, recommandations indicatives en kg, titre visible dans le calendrier, séance modifiable |
| Cas vide | Aucun muscle sélectionné, aucun poids saisi | Une séance générale pour l’objectif choisi est quand même proposée ; aucune fourchette basée sur la masse |
| Limite / erreur | Masse hors 20–300 kg, titre de plus de 100 caractères ou date impossible | La saisie est refusée ou une erreur compréhensible est affichée, sans séance incohérente |

## Jalons pédagogiques

1. **Cadrage** : l’utilisateur STAPS prépare une séance structurée, la modifie et consigne ses résultats ; le scénario ci-dessus se démontre rapidement.
2. **Modèle de données** : tables, clés, relations, types et unités sont documentés ; la requête `SELECT` montre la consultation des séances d’un utilisateur.
3. **API et règle métier** : le moteur local filtre, priorise et prescrit ; les tests couvrent les critères normaux et les valeurs invalides.
4. **Interface React** : saisie de l’objectif, du titre, des muscles et de la date ; affichage des prescriptions, des erreurs et des confirmations.
5. **Intégration et tests** : génération → édition → calendrier → entraînement → historique, plus les essais normal, vide et limite.
6. **Déploiement et documentation** : Dockerfile, Compose et instructions reproductibles sont fournis ; expliquer que la génération reste locale et que le stockage navigateur n’est pas synchronisé.

Pour une présentation de deux minutes : montrer le formulaire, expliquer comment `selectExercises` trie les mouvements selon l’objectif et les muscles, suivre le tableau `workout` jusqu’à IndexedDB, puis préciser comme limite que les recommandations de charge restent indicatives et ne remplacent pas une évaluation individuelle.

## Limites connues

- La qualité des séances dépend du catalogue et de règles déterministes ; l’outil ne remplace pas l’expertise d’un préparateur physique.
- Le poids corporel ne suffit pas à déduire une charge optimale : l’utilisateur doit calibrer et modifier toute proposition.
- Les données du parcours principal sont locales et ne se synchronisent pas entre appareils.
- L’API PostgreSQL constitue le support technique du jalon ; le parcours de démonstration reste sans compte et repose sur IndexedDB.

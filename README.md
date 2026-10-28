# APEX — préparation de séances de renforcement

APEX est une application web de préparation physique. Elle aide un étudiant STAPS, un coach ou un pratiquant avancé à construire une séance de musculation, à l’ajuster, à la planifier et à consigner ce qui a réellement été réalisé. Le programme propose une base de travail ; l’utilisateur garde le contrôle de ses exercices et de ses charges.

## Le besoin et le scénario

Un étudiant STAPS doit préparer une séance de force pour le bas du corps. Il renseigne son prénom et, s’il le souhaite, son poids corporel, choisit un objectif et des groupes musculaires, donne un titre à la séance et choisit une date obligatoire. APEX sélectionne des exercices dans son catalogue et propose une prescription structurée. Il crée la séance : elle apparaît immédiatement dans le calendrier à la date choisie. Depuis cette vue, l’étudiant peut la rouvrir pour l’ajuster, la supprimer ou valider qu’elle a été réalisée ; une séance validée rejoint l’historique.

En une minute, la démonstration suit donc un parcours complet : **décrire le besoin → générer → ajuster → planifier → valider → retrouver**.

## Fonctionnalités

- Créer une séance à partir d’un objectif, de muscles ciblés, d’un titre et d’une date obligatoire.
- Enregistrer un prénom pour personnaliser l’accueil et un poids corporel facultatif pour contextualiser certaines recommandations de charge.
- Générer au moins quatre exercices, généralement quatre à six ; le moteur en ajoute si nécessaire pour couvrir chaque groupe musculaire sélectionné présent dans le catalogue.
- Modifier librement la proposition : remplacer, ajouter, supprimer et réordonner les exercices, ainsi qu’ajuster les séries, répétitions, repos et charges.
- Retrouver les séances planifiées dans le calendrier, les ouvrir ou les supprimer, puis valider leur réalisation depuis cette vue.
- Consigner les résultats effectués et retrouver les séances terminées dans l’historique.
- Exporter et importer une sauvegarde JSON depuis les paramètres.

Il n’y a ni sélection de sport principal, ni niveau utilisateur, ni estimation de durée de séance. Les recommandations de charge sont indicatives : le poids corporel ne permet pas, à lui seul, de calculer une charge individuelle optimale.

## Parcours de bout en bout

1. **Créer** — choisir une date obligatoire, un objectif et, éventuellement, des muscles ciblés. Le titre (100 caractères maximum) et le prénom sont facultatifs ; un titre est proposé automatiquement s’il reste vide. Le poids est facultatif.
2. **Planifier** — cliquer sur **Créer et planifier ma séance**. La séance est enregistrée et le calendrier s’ouvre sur le mois de la date choisie.
3. **Ajuster** — ouvrir la séance depuis le calendrier pour examiner les mouvements, les consignes et les suggestions, puis personnaliser le contenu.
4. **Réaliser** — enregistrer les résultats dans la séance, ou utiliser **Valider** dans le calendrier pour confirmer directement sa réalisation.
5. **Retrouver** — consulter les séances à venir dans le calendrier et les séances terminées dans l’historique. Une sauvegarde JSON permet de transférer les données manuellement.

## Règle de génération

Le moteur métier partagé se trouve dans [`frontend/src/engine/workoutEngine.js`](./frontend/src/engine/workoutEngine.js) et est appelé côté serveur par [`backend/planner.js`](./backend/planner.js).

1. Il vérifie et normalise les entrées, notamment le titre et la date.
2. Il filtre les mouvements selon l’objectif choisi et le catalogue d’exercices.
3. Il priorise les muscles demandés et tient compte des séances récentes pour limiter les répétitions lorsque le catalogue le permet.
4. Il applique les prescriptions prévues pour l’objectif : séries, répétitions et temps de repos.
5. Il retourne une séance modifiable, avec des consignes, des variantes et, pour certains mouvements, une fourchette de charge indicative fondée sur le poids fourni.

La sélection est déterministe : mêmes entrées et même historique donnent le même résultat. Si aucun muscle n’est sélectionné, le moteur construit une séance générale compatible avec l’objectif. Une entrée invalide, dont une date absente, doit être corrigée avant la création.

## Architecture et données

```text
frontend/                     Interface React, construite avec Vite
  src/App.jsx                 navigation, formulaire et vues
  src/engine/                 règles de génération et tests du moteur
  src/storage/                stockage navigateur, sauvegarde et import/export
  src/assets/                 identité visuelle et illustration locale
backend/                      Serveur Node.js / Express et endpoints API
  planner.js                  adaptateur vers le moteur métier
  server.js                   API, authentification de démonstration et service web
database/init.sql             schéma PostgreSQL et exercices de démonstration
Dockerfile                    construction multi-étape de l’application
docker-compose.yml             services de l’application et de PostgreSQL
```

### Où les données sont-elles enregistrées ?

Le parcours principal, sans compte utilisateur, enregistre le profil et les séances localement dans **IndexedDB**, dans le navigateur. Ces données ne sont donc pas synchronisées entre appareils et ne sont pas automatiquement envoyées à PostgreSQL. Il faut exporter une sauvegarde JSON pour les transférer. Lors du chargement d’anciennes données locales, une séance qui n’avait pas de date reçoit sa date de création afin de rester accessible dans le calendrier.

Le projet fournit aussi un backend Express et un schéma PostgreSQL pour démontrer et faire évoluer la couche API. Docker démarre PostgreSQL et le serveur Node.js. Le frontend de démonstration actuel utilise toutefois son stockage local ; le branchement complet du parcours React sur une API authentifiée et la synchronisation multi-appareils constituent une évolution future, et non une capacité à supposer déjà présente.

### Modèle relationnel PostgreSQL

- `users.id` est la clé primaire d’un compte.
- `profiles.user_id` est à la fois clé primaire et clé étrangère vers `users.id` : un profil au plus par compte. `body_mass` est en kilogrammes.
- `workouts.id` est la clé primaire d’une séance ; `user_id` référence son propriétaire. `scheduled_for` est une date obligatoire, et `status` décrit l’état de la séance.
- `exercises.id` est la clé primaire du catalogue.
- `workout_exercises` relie séances et exercices ; sa clé primaire composée (`workout_id`, `order_index`) conserve la position d’un mouvement dans une séance. Les charges sont en kilogrammes, les repos en secondes et les répétitions sont du texte pour autoriser des formats comme `8–12`.

Exemple : retrouver les séances prévues d’un utilisateur, de la plus proche à la plus éloignée.

```sql
SELECT id, title, objective, status, scheduled_for
FROM workouts
WHERE user_id = $1
  AND scheduled_for >= CURRENT_DATE
ORDER BY scheduled_for, id;
```

`$1` est un paramètre lié par le pilote PostgreSQL ; il ne faut pas concaténer une entrée utilisateur à la requête. Le schéma complet et les exercices d’exemple figurent dans [`database/init.sql`](./database/init.sql). Lors de l’initialisation d’une base existante, les anciennes séances sans date reçoivent leur date de création avant que la colonne ne devienne obligatoire.

## Installer et lancer

Prérequis : **Node.js 24 ou plus récent**, npm et, pour le déploiement complet conteneurisé, Docker avec Docker Compose.

### Lancement local du frontend et de l’API

```bash
npm install
npm --prefix frontend install
npm run dev
```

Le serveur Express démarre sur `http://localhost:3000`. Pour lancer directement le serveur de développement Vite dans un autre terminal :

```bash
npm run dev:frontend
```

### Lancement avec Docker et PostgreSQL

```bash
cp .env.example .env
docker compose up --build
```

Ouvrir ensuite `http://localhost:3000`. Les paramètres de `.env.example` sont destinés au développement local : choisir des secrets dédiés et une configuration sécurisée avant toute exposition publique. Le script SQL initialise le volume PostgreSQL lors de sa première création ; une base déjà initialisée n’exécute pas automatiquement de nouveau les scripts du dossier d’initialisation.

## Tests et essais reproductibles

Depuis la racine du projet :

```bash
npm test
npm run lint
npm run build
node --check backend/server.js
```

Les tests automatisés couvrent notamment les prescriptions, le nombre d’exercices, la validation des entrées, la date obligatoire, les statuts, le catalogue et les sauvegardes.

| Essai | Entrée | Résultat attendu | Résultat vérifié |
|---|---|---|---|
| Parcours normal | Prénom « Paul », poids 72 kg, objectif Force, quadriceps et fessiers, titre « Force bas du corps », date choisie | La séance est créée, modifiable et visible immédiatement dans le bon mois du calendrier. | Vérifié dans le navigateur : affichage immédiat sur le mois choisi, puis validation et présence dans l’historique. |
| Entrée vide | Ne choisir aucun muscle et ne pas renseigner le poids, tout en complétant le titre, la date et l’objectif | Une séance générale est proposée ; aucune recommandation fondée sur le poids n’est affichée. | Vérifié par le test automatisé `empty muscle selection still produces a general session`. |
| Valeur invalide / limite | Omettre la date, ou saisir un poids en dehors de la plage acceptée, ou un titre trop long | La création est bloquée avec un message explicite ; aucune séance incohérente n’est ajoutée. | Vérifié : date vide bloquée par le formulaire ; moteur testé aux bornes de 20 et 300 kg et contre les valeurs invalides ainsi qu’un titre de plus de 100 caractères. |
| Validation | Depuis le calendrier, ouvrir une séance non terminée puis choisir **Valider** | Après confirmation, son statut devient terminée et elle apparaît dans l’historique. | Vérifié dans le navigateur avec confirmation ; le statut terminé est affiché dans l’historique. |

Pour rejouer le parcours complet, vérifier l’apparition dans le calendrier avant de valider la séance, puis vérifier sa présence dans l’historique. Une date future permet aussi de vérifier que le calendrier s’ouvre directement sur le mois planifié.

## Jalons pédagogiques

1. **Cadrage du besoin** — utilisateur : étudiant STAPS ou pratiquant avancé ; problème : structurer une séance ajustable ; résultat : proposition planifiée et traçable.
2. **Modèle de données** — expliquer les clés primaires et étrangères, l’ordre des exercices, les unités, puis présenter la requête `SELECT` ci-dessus.
3. **API et règles métier** — suivre un objectif et des muscles jusqu’au filtrage et à la prescription ; expliquer un cas normal, aucun muscle choisi et une date absente.
4. **Interface React** — montrer les entrées, les contrôles, les erreurs, les changements d’exercices et le retour immédiat au calendrier.
5. **Intégration et tests** — démontrer génération → édition → calendrier → validation → historique ; rejouer les essais normal, vide et invalide.
6. **Déploiement et documentation** — démarrer l’application avec Docker, expliquer la limite du stockage local et présenter une amélioration future.

Pour commenter le trajet des données : le formulaire React passe les entrées à `generateWorkout`, le moteur commun sélectionne et prescrit les mouvements, puis l’application ajoute l’objet de séance au stockage IndexedDB. La navigation ouvre ensuite le calendrier à partir de la date choisie. La validation change son statut et l’historique filtre les séances terminées.

## Limites et améliorations possibles

- La qualité dépend du catalogue et de règles déterministes ; APEX ne remplace ni un préparateur physique ni une évaluation médicale.
- Le poids seul ne permet pas de déduire une charge sûre ou optimale ; toutes les suggestions doivent être ajustées par l’utilisateur.
- Les données du parcours principal sont locales et peuvent être perdues si le stockage du navigateur est effacé.
- Le frontend n’est pas encore synchronisé avec le backend PostgreSQL ; une authentification, une synchronisation inter-appareils et des sauvegardes automatiques seraient les prochaines améliorations structurantes.
- Une évolution premium pourrait ajouter des confirmations de progression, des indicateurs de volume par groupe musculaire, une recherche dans l’historique et une meilleure accessibilité clavier, sans automatiser les décisions d’entraînement.

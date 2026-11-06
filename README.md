# APEX Performance

**Planifier le renforcement musculaire au service des sports d’endurance.**

APEX Performance est une application web en français destinée aux sportifs d’endurance et à leurs entraîneurs. Elle aide à préparer des séances de renforcement musculaire, à les retrouver dans un calendrier et à noter les résultats après l’entraînement.

## En bref

Un sportif choisit une orientation de séance, les groupes musculaires à travailler et une date. L’application lui propose des exercices, des séries, des répétitions et des temps de récupération. Il peut ajuster le programme, l’enregistrer et le consulter dans son calendrier. Après avoir effectué la séance, il renseigne ses résultats et ses notes pour les garder dans son historique.

## À qui s’adresse l’application ?

Par exemple, Paul est étudiant en STAPS et pratique le cyclisme. Il souhaite organiser son renforcement en complément des sorties à vélo, sans perdre de vue les exercices prévus ni ses résultats passés. Son entraîneur peut aussi l’aider à préparer et à relire ses séances.

## Utiliser l’application

1. Depuis **Créer**, choisir une orientation : force, puissance, endurance musculaire, pliométrie ou renforcement général.
2. Choisir les groupes musculaires, une date et, si souhaité, un titre et une masse corporelle.
3. Créer la séance. APEX propose une sélection d’exercices avec des consignes, des séries, des répétitions et des récupérations que l’on peut modifier.
4. Retrouver la séance **Planifiée** dans le **Calendrier**. Une séance planifiée peut être déplacée à une autre date ou modifiée.
5. Le jour de l’entraînement, ouvrir la séance et démarrer sa réalisation. Le programme prévu est alors conservé comme référence ; les résultats réellement effectués sont saisis séparément.
6. Noter ses sensations et valider la séance explicitement. La séance réalisée est ensuite consultable dans l’**Historique**.
7. Dans **Sauvegarde**, exporter ou importer un fichier JSON pour conserver ou transférer ses données.
8. Facultativement, ouvrir **Se connecter** à côté d’**Exporter** pour créer un compte ou ouvrir une session.

## Ce que propose APEX

- Création de séances selon un objectif sportif et des groupes musculaires.
- Bibliothèque d’exercices classée par catégories et dotée d’une recherche.
- Réglage des séries, répétitions, charges indicatives, récupérations et consignes.
- Calendrier mensuel, déplacement de séances planifiées et statuts **Planifiée**, **En cours**, **Réalisée**, **Reportée** et **Annulée**.
- Séparation entre le programme prévu et les résultats réellement effectués.
- Notes de séance, historique, import et export JSON.
- Interface adaptée aux téléphones, aux tablettes et aux ordinateurs.

## Comment les données sont-elles conservées ?

### Dans l’interface web

Le parcours principal de l’application conserve le profil et les séances dans **IndexedDB**, une base de données du navigateur. Les données restent sur l’appareil et dans le navigateur utilisés : elles ne sont pas envoyées automatiquement vers PostgreSQL. Depuis **Sauvegarde**, après connexion, on peut déclencher manuellement l’envoi d’une copie des séances locales vers son compte. Le travail de création, de planification et de réalisation continue de fonctionner localement et hors connexion.

La synchronisation est un envoi de sauvegarde, pas une fusion entre appareils : elle ne télécharge pas dans l’interface les séances déjà présentes sur le compte. Pour transférer ses données vers un autre navigateur, utiliser **Exporter** puis **Importer une sauvegarde**. Effacer les données du navigateur peut supprimer la copie locale ; exporter une sauvegarde avant de changer d’appareil ou de nettoyer les données du navigateur.

### Côté serveur

Le bouton **Se connecter** permet de créer un compte ou d’ouvrir une session auprès de l’API Node.js/Express. L’inscription nécessite une adresse e-mail valide et un mot de passe d’au moins 10 caractères. Après connexion, le serveur conserve une session temporaire (8 heures) dans un cookie HTTP-only.

La connexion est facultative et **ne change pas le mode local de l’application** : le profil reste dans IndexedDB. Depuis **Sauvegarde**, l’utilisateur peut envoyer manuellement les séances de cet appareil au compte. Le serveur en conserve une copie complète, comprenant le programme, les résultats réalisés et les notes. Une nouvelle synchronisation met à jour une séance portant le même identifiant au lieu d’en créer un doublon. Une séance déjà marquée comme réalisée sur le serveur n’est pas remplacée par une version antérieure non réalisée. La déconnexion ferme la session serveur, sans effacer ni la copie locale ni les séances déjà synchronisées.

Le projet comprend également une API Node.js/Express avec des routes de comptes et de séances, ainsi qu’une base PostgreSQL. Les séances créées dans l’interface restent séparées des séances envoyées directement aux routes API, sauf lorsqu’on lance explicitement la synchronisation depuis **Sauvegarde**.

## Technologies et organisation du projet

- **React 19** et **Vite** : interface web et serveur de développement.
- **Node.js 24** et **Express 5** : serveur web et API.
- **PostgreSQL 16** : stockage utilisé par les routes API du backend.
- **Docker Compose** : lancement de l’application et de PostgreSQL.

```text
frontend/src/
  App.jsx                 Pages, calendrier et parcours de séance
  engine/                 Génération et cycle de vie des séances
  storage/                IndexedDB, import/export JSON et envoi au compte
  data/                   Bibliothèque d’exercices

backend/
  server.js               Serveur Express et routes API
  planner.js              Génération des séances côté serveur

database/init.sql         Schéma et données initiales PostgreSQL
database/migrations/      Migrations appliquées par le serveur au démarrage
docker-compose.yml        Services app et db
```

Le moteur de séances s’appuie sur l’orientation, les muscles choisis, le profil et les séances récentes. Il essaie de proposer quatre à six exercices, et peut en ajouter pour couvrir tous les groupes demandés. Les suggestions de charge sont des repères indicatifs, modifiables par l’utilisateur.

## Le serveur et ses règles

L’API est un service complémentaire du site. L’interface l’utilise pour l’inscription, la connexion et, sur demande, l’envoi des séances locales au compte. Le profil de l’application reste local.

| Route API | Fonction |
|---|---|
| `GET /api/health` | Vérifier si le serveur et PostgreSQL répondent |
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` | Créer un compte API, ouvrir ou fermer une session |
| `GET /api/me`, `PUT /api/profile` | Lire ou mettre à jour le profil associé au compte API |
| `GET /api/exercises?objective=force` | Consulter les exercices correspondant à une orientation |
| `POST /api/workouts`, `GET /api/workouts` | Générer, enregistrer ou lister des séances API |
| `POST /api/workouts/:clientId/sync` | Sauvegarder ou mettre à jour une séance locale dans le compte connecté |
| `PATCH /api/workouts/:id/status` | Modifier le statut d’une séance API |

Lorsqu’une demande de création de séance arrive à l’API, le serveur vérifie l’orientation et le titre, demande au moteur de préparer une séance à partir des exercices enregistrés dans PostgreSQL, puis écrit la séance et ses exercices en base. La date de programmation est obligatoire. Une masse corporelle renseignée doit être comprise entre 20 et 300 kg. Les requêtes SQL utilisent des paramètres plutôt que d’insérer directement les valeurs dans le texte de la requête.

Une séance créée hors connexion reste dans IndexedDB. Une fois la connexion internet rétablie et l’utilisateur connecté, le bouton **Synchroniser avec mon compte** envoie les séances une par une à `POST /api/workouts/:clientId/sync`. L’identifiant UUID de chaque séance rend les tentatives répétées idempotentes. Si le réseau tombe au milieu, l’interface indique combien de séances ont été envoyées et l’utilisateur peut relancer l’action ; les séances déjà reçues sont reconnues et mises à jour sans doublon.

## Modèle de données PostgreSQL

Le schéma est défini dans [`database/init.sql`](./database/init.sql).

| Table | Clé principale et relations | Rôle |
|---|---|---|
| `users` | `id` ; adresse e-mail unique | Comptes utilisés par l’API |
| `sessions` | `id` ; `user_id` référence `users.id` | Sessions de connexion de l’API |
| `profiles` | `user_id` référence `users.id` | Profil associé à un compte API |
| `exercises` | `id` ; nom unique | Catalogue d’exercices du backend |
| `workouts` | `id` ; `user_id` référence `users.id` ; `(user_id, client_workout_id)` unique | Séances API et copies JSONB complètes des séances synchronisées |
| `workout_exercises` | Clé composée `(workout_id, order_index)` | Exercices ordonnés d’une séance API |

Une séance peut contenir plusieurs exercices, et un exercice peut être utilisé dans plusieurs séances. La table `workout_exercises` enregistre cette association et l’ordre des exercices. Les champs prévus par le schéma utilisent notamment les kilogrammes pour la masse corporelle et les secondes pour la récupération.

Exemple de requête : afficher les exercices d’une séance API dans l’ordre prévu. `$1` et `$2` sont des paramètres transmis séparément à PostgreSQL.

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

## Lancer l’application avec Docker

Prérequis : Docker Desktop avec Docker Compose.

À la racine du dépôt :

```bash
cp .env.example .env
```

Les valeurs de `.env.example` sont destinées au développement local. Pour une installation locale, modifier `POSTGRES_PASSWORD` dans `.env`. Ne pas publier ce fichier ni réutiliser ces valeurs en production.

```bash
docker compose up --build -d
docker compose ps
```

Ouvrir [http://localhost:3000](http://localhost:3000). Vérifier que le serveur communique avec PostgreSQL :

```bash
curl http://localhost:3000/api/health
```

Une réponse `{"status":"ok","database":"connected"}` confirme la connexion. Pour arrêter les services sans effacer le volume de la base :

```bash
docker compose down
```

`docker compose down -v` supprime également le volume PostgreSQL et les données qu’il contient. Ne l’utiliser que si cet effacement est volontaire.

## Développement sans Docker

Prérequis : Node.js 24 et npm. Pour lancer le serveur web et le frontend :

```bash
npm ci
npm ci --prefix frontend
npm run build
```

Le backend a besoin de PostgreSQL. Pour le développement, on peut lancer la base avec Docker Compose, puis lancer les serveurs Node et Vite dans deux terminaux :

```bash
docker compose up -d db
npm run dev
npm run dev:frontend
```

Le serveur Express démarre sur `http://localhost:3000` et Vite sur `http://localhost:5173`. Le proxy Vite transmet les appels `/api` à Express. Le parcours principal de l’interface reste néanmoins stocké dans IndexedDB, et non dans PostgreSQL.

## Vérifications

Depuis la racine du dépôt :

```bash
npm test
npm run lint
npm run build
docker compose --env-file .env.example config -q
```

Les tests automatisés portent sur le moteur de génération, les règles de réalisation des séances, la validation des séances à synchroniser et l’import/export. Ils ne remplacent pas une démonstration de l’interface avec une autre personne.

| Essai | Entrée | Résultat attendu |
|---|---|---|
| Parcours normal | Créer une séance de force avec une date et des quadriceps sélectionnés | Une séance datée, avec des exercices et le statut **Planifiée** |
| Sélection vide | Renforcement général, date valide, aucun muscle choisi | Une séance générale peut quand même être créée |
| Limite de profil | Masse corporelle de 300 kg, puis 301 kg | 300 kg est accepté ; 301 kg est refusé avec une erreur |
| Date invalide | Date absente ou date impossible | La création est refusée et l’utilisateur reçoit une erreur |
| Réalisation | Démarrer une séance, modifier les résultats réellement effectués, puis valider | Le programme initial reste conservé et les résultats apparaissent dans l’historique |
| Synchronisation | Se connecter, synchroniser deux fois une séance locale, puis vérifier `GET /api/workouts` | Une seule copie existe sur le compte et contient programme, réalisation et notes |
| Hors connexion / reprise | Créer des séances sans réseau, se reconnecter, puis synchroniser | Les séances restent disponibles localement et sont envoyées à la reprise du réseau |

Au dernier contrôle, les 27 tests automatisés passent, ESLint et le build de production réussissent, et la configuration Docker Compose est valide. Un test de bout en bout avec une instance PostgreSQL Docker isolée a vérifié l’inscription, l’envoi d’une séance, la mise à jour sans doublon, la conservation de la réalisation complète, le refus d’une ancienne version non réalisée et la relecture du contenu synchronisé. La démonstration complète de l’interface à un autre utilisateur et l’évaluation par l’enseignant restent à effectuer.

Pour la présentation, expliquer le besoin de Paul, réaliser le parcours principal, montrer comment le moteur propose les exercices, puis décrire où les données sont sauvegardées. Il est également utile de montrer une sauvegarde JSON et un test avec une entrée invalide.

## Limites connues

- Les données du parcours React restent locales au navigateur par défaut. La synchronisation vers le compte est manuelle et envoie les séances de cet appareil vers le serveur.
- La synchronisation ne télécharge pas les données du compte dans un autre navigateur et ne fusionne pas plusieurs appareils ; utiliser Exporter/Importer pour transférer une sauvegarde.
- Le profil utilisateur de l’interface n’est pas synchronisé avec le compte.
- Aucune instance publique de production n’est actuellement configurée. Le workflow GitHub Actions peut construire et publier une image ; le déploiement vers un hébergeur nécessite une configuration supplémentaire.
Les charges proposées ne constituent pas un avis médical. Interrompre un mouvement en cas de douleur et adapter la séance à sa situation.

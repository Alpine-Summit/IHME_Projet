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

Le parcours principal de l’application conserve le profil et les séances dans **IndexedDB**, une base de données du navigateur. Les données restent sur l’appareil et dans le navigateur utilisés : elles ne sont pas automatiquement envoyées vers PostgreSQL. Pour les transférer vers un autre appareil ou les sauvegarder à part, utiliser **Exporter** ou l’onglet **Sauvegarde**, puis conserver le fichier JSON dans un endroit sûr.

Effacer les données du navigateur peut supprimer cette copie locale. Exporter une sauvegarde avant de changer d’appareil ou de nettoyer les données du navigateur.

### Côté serveur

Le projet comprend également une API Node.js/Express avec des routes de comptes et de séances, ainsi qu’une base PostgreSQL. **Cette API est distincte du parcours de l’interface React : l’application web ne propose pas de connexion utilisateur et ne synchronise pas ses séances locales avec l’API.** Les séances enregistrées depuis l’interface et celles enregistrées directement par les routes API ne constituent donc pas une seule sauvegarde partagée.

En particulier, l’API PostgreSQL enregistre une programmation simplifiée. Elle ne conserve pas encore l’intégralité du programme verrouillé, les performances réelles détaillées pour chaque exercice ni le carnet de notes de l’interface.

## Technologies et organisation du projet

- **React 19** et **Vite** : interface web et serveur de développement.
- **Node.js 24** et **Express 5** : serveur web et API.
- **PostgreSQL 16** : stockage utilisé par les routes API du backend.
- **Docker Compose** : lancement de l’application et de PostgreSQL.

```text
frontend/src/
  App.jsx                 Pages, calendrier et parcours de séance
  engine/                 Génération et cycle de vie des séances
  storage/                Sauvegarde IndexedDB et import/export JSON
  data/                   Bibliothèque d’exercices

backend/
  server.js               Serveur Express et routes API
  planner.js              Génération des séances côté serveur

database/init.sql         Schéma et données initiales PostgreSQL
docker-compose.yml        Services app et db
```

Le moteur de séances s’appuie sur l’orientation, les muscles choisis, le profil et les séances récentes. Il essaie de proposer quatre à six exercices, et peut en ajouter pour couvrir tous les groupes demandés. Les suggestions de charge sont des repères indicatifs, modifiables par l’utilisateur.

## Le serveur et ses règles

L’API est un service complémentaire du site. Elle est disponible pour les tests ou les intégrations qui l’appellent directement, mais l’interface React ne l’utilise pas pour sauvegarder le profil ou les séances.

| Route API | Fonction |
|---|---|
| `GET /api/health` | Vérifier si le serveur et PostgreSQL répondent |
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` | Créer un compte API, ouvrir ou fermer une session |
| `GET /api/me`, `PUT /api/profile` | Lire ou mettre à jour le profil associé au compte API |
| `GET /api/exercises?objective=force` | Consulter les exercices correspondant à une orientation |
| `POST /api/workouts`, `GET /api/workouts` | Générer, enregistrer ou lister des séances API |
| `PATCH /api/workouts/:id/status` | Modifier le statut d’une séance API |

Lorsqu’une demande de création de séance arrive à l’API, le serveur vérifie l’orientation et le titre, demande au moteur de préparer une séance à partir des exercices enregistrés dans PostgreSQL, puis écrit la séance et ses exercices en base. La date de programmation est obligatoire. Une masse corporelle renseignée doit être comprise entre 20 et 300 kg. Les requêtes SQL utilisent des paramètres plutôt que d’insérer directement les valeurs dans le texte de la requête.

Ces routes ne remplacent pas IndexedDB pour l’interface : créer une séance dans le site ne déclenche pas actuellement `POST /api/workouts`.

## Modèle de données PostgreSQL

Le schéma est défini dans [`database/init.sql`](./database/init.sql).

| Table | Clé principale et relations | Rôle |
|---|---|---|
| `users` | `id` ; adresse e-mail unique | Comptes utilisés par l’API |
| `sessions` | `id` ; `user_id` référence `users.id` | Sessions de connexion de l’API |
| `profiles` | `user_id` référence `users.id` | Profil associé à un compte API |
| `exercises` | `id` ; nom unique | Catalogue d’exercices du backend |
| `workouts` | `id` ; `user_id` référence `users.id` | Séances enregistrées par l’API |
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

Les tests automatisés portent sur le moteur de génération, les règles de réalisation des séances et l’import/export des sauvegardes. Ils ne remplacent pas une démonstration de l’interface avec une autre personne.

| Essai | Entrée | Résultat attendu |
|---|---|---|
| Parcours normal | Créer une séance de force avec une date et des quadriceps sélectionnés | Une séance datée, avec des exercices et le statut **Planifiée** |
| Sélection vide | Renforcement général, date valide, aucun muscle choisi | Une séance générale peut quand même être créée |
| Limite de profil | Masse corporelle de 300 kg, puis 301 kg | 300 kg est accepté ; 301 kg est refusé avec une erreur |
| Date invalide | Date absente ou date impossible | La création est refusée et l’utilisateur reçoit une erreur |
| Réalisation | Démarrer une séance, modifier les résultats réellement effectués, puis valider | Le programme initial reste conservé et les résultats apparaissent dans l’historique |

Au dernier contrôle, les 21 tests automatisés passent, ESLint et le build de production réussissent, et la configuration Docker Compose est valide. Le parcours API PostgreSQL a également été vérifié : health check, inscription, lecture du profil, création et liste d’une séance. Les entrées invalides testées (masse de 301 kg et date manquante) sont refusées. La démonstration complète de l’interface à un autre utilisateur et l’évaluation par l’enseignant restent à effectuer.

Pour la présentation, expliquer le besoin de Paul, réaliser le parcours principal, montrer comment le moteur propose les exercices, puis décrire où les données sont sauvegardées. Il est également utile de montrer une sauvegarde JSON et un test avec une entrée invalide.

## Limites connues

- Les données du parcours React sont locales au navigateur. Il n’y a pas de synchronisation entre appareils.
- Les routes API et leur stockage PostgreSQL existent, mais ils ne sont pas reliés au parcours principal de l’interface.
- Les détails complets de la réalisation d’une séance et les notes de l’interface ne sont pas persistés dans PostgreSQL.
- Aucune instance publique de production n’est actuellement configurée. Le workflow GitHub Actions peut construire et publier une image ; le déploiement vers un hébergeur nécessite une configuration supplémentaire.
- La démonstration et l’évaluation facultative par un enseignant doivent être effectuées par une personne ; elles ne peuvent pas être évaluées automatiquement par ce dépôt.

Les charges proposées ne constituent pas un avis médical. Interrompre un mouvement en cas de douleur et adapter la séance à sa situation.

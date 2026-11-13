# CLAUDE.md : guide pour Claude Code

Tu travailles sur **Griotoon**, une application web de création de manga, manhua et webtoon pour les créateurs francophones et africains. Lis ce fichier en entier avant de coder. Lis ensuite `docs/05-roadmap.md` pour savoir où on en est, puis la spec de la phase en cours.

## Contexte en bref

- **Produit** : l'IA génère un brouillon de planches à partir d'une histoire, puis l'utilisateur retouche dans un éditeur (cases, bulles, images). Les personnages restent cohérents grâce à des fiches personnages.
- **Différenciation** : public francophone et africain, cohérence des personnages, contrôle humain de la mise en page. Les générateurs IA existants sont des « boîtes noires ». Les plateformes africaines existantes (Afrocomix, Zebra Comics, Vortex247) sont des outils de **lecture**. Griotoon est un outil de **création**.
- **Porteur du projet** : profil data science, à l'aise en Python, SQL, Postgres et Docker. Il est moins expert en front-end : explique les choix front quand ils ne sont pas évidents.

## Stack (décidée, voir `docs/decisions.md`)

| Couche | Techno |
|---|---|
| Front | Next.js (App Router) + TypeScript + Tailwind CSS |
| Éditeur canvas | Konva.js via `react-konva` |
| État de l'éditeur | Zustand (avec historique annuler/rétablir) |
| Backend | FastAPI (Python 3.11+) + SQLAlchemy 2 + Alembic |
| Base de données | PostgreSQL 16 |
| Stockage fichiers | MinIO en dev (API compatible S3), S3 ou équivalent en production |
| Tâches asynchrones | Redis + Celery (génération d'images, exports lourds) |
| IA texte | API Claude (découpage du script en cases) |
| IA image | Modèle de diffusion via API hébergée (Replicate ou fal.ai) en début de projet |
| Dev local | Docker Compose |

Ne change pas de stack sans le proposer d'abord et sans ajouter une entrée dans `docs/decisions.md`.

## Règles de travail

1. **Respecte la phase en cours.** Ne code pas les phases suivantes en avance. Prévois juste des points d'extension propres (par exemple un champ `image` dans une case, qui servira plus tard à l'IA).
2. **Interface bilingue : français ou anglais.** Le français est la langue par défaut, et l'utilisateur peut passer à l'anglais. Aucun texte d'interface (libellés, messages d'erreur, textes d'aide) n'est écrit en dur dans les composants : tout passe par les dictionnaires de traduction (`src/i18n/fr.ts` et `src/i18n/en.ts`). Toute nouvelle clé est ajoutée dans les deux langues. Le code (variables, fonctions, commentaires techniques) reste en anglais.
3. **Le texte des bulles n'est jamais généré dans l'image.** Les bulles sont des objets vectoriels de l'éditeur : toujours lisibles, modifiables, traduisibles.
4. **Une page est un document JSON** (format dans `docs/04-modele-donnees.md`). Le canvas n'est qu'un rendu de ce JSON. Toute modification passe par le store, jamais par une mutation directe des objets Konva.
5. **Connexion faible** : images compressées (WebP), chargement progressif, sauvegarde locale (IndexedDB) avant synchronisation.
6. **Petites étapes vérifiables.** Après chaque fonctionnalité : l'app compile, les tests passent, et tu indiques comment tester à la main.
7. **Tests** : Vitest pour la logique front (store, gabarits, export JSON), Pytest pour le backend.
8. **Secrets** : uniquement dans `.env` (jamais commité). Ajoute toute nouvelle variable dans `.env.example`.
9. Mets à jour `docs/05-roadmap.md` (cocher les tâches) et `docs/decisions.md` quand c'est pertinent.

## Commandes utiles

```bash
docker compose up -d                 # services (Postgres :5432, Redis :6379, MinIO :9000/:9001)
cd frontend && npm run dev           # front sur :3000
cd frontend && npm test              # tests front
cd backend && uvicorn app.main:app --reload   # API sur :8000 (docs auto sur /docs)
cd backend && pytest                 # tests back
cd backend && alembic upgrade head   # migrations
```

## Par où commencer

Si `frontend/` ne contient encore que son README, c'est le tout début :
1. Initialise le front en suivant `frontend/README.md`.
2. Implémente la **phase 1** selon `docs/06-spec-editeur.md`, dans l'ordre des étapes indiqué.
3. Le backend n'est nécessaire qu'à la fin de la phase 1 (sauvegarde serveur). Avant ça, la sauvegarde se fait en local (IndexedDB ou localStorage).

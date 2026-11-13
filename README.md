# Griotoon

> **Raconte tes histoires en manga.**
> Griotoon est une application web de création de manga / manhua / webtoon pensée pour les créateurs francophones et africains. L'IA produit un premier jet des planches à partir d'une histoire, puis le créateur garde la main dans un vrai éditeur de planches. Les personnages restent cohérents d'une case à l'autre.

Le nom vient du **griot**, le conteur, historien et gardien de la tradition orale en Afrique de l'Ouest. Griotoon, c'est le griot à l'ère de la BD numérique.

---

## Les 3 piliers du projet

1. **Public mal servi** : les francophones et l'Afrique. Interface en français, styles, décors et histoires locales, fonctionnement avec une connexion faible.
2. **Cohérence des personnages** : une fiche personnage créée une fois, puis réutilisée à chaque génération.
3. **Hybride IA + éditeur** : l'IA fait le brouillon, l'humain retouche (cases, bulles, régénération case par case).

## Structure du dossier

```
griotoon/
├── README.md              ← ce fichier
├── CLAUDE.md              ← instructions pour Claude Code (à lire en premier)
├── docker-compose.yml     ← Postgres, Redis, MinIO (services de dev)
├── .env.example           ← variables d'environnement à copier dans .env
├── .gitignore
├── docs/
│   ├── 01-vision.md            ← concept, marché, positionnement, public
│   ├── 02-fonctionnalites.md   ← fonctionnalités par pilier + périmètre du MVP
│   ├── 03-architecture.md      ← stack, services, flux de données
│   ├── 04-modele-donnees.md    ← schéma SQL + format JSON d'une page
│   ├── 05-roadmap.md           ← phases 1 à 5 et critères de validation
│   ├── 06-spec-editeur.md      ← spec détaillée de la phase 1 (l'éditeur)
│   ├── 07-pipeline-ia.md       ← découpage du script par LLM, génération d'images, cohérence
│   └── decisions.md            ← journal des décisions (ADR)
├── frontend/              ← app Next.js (à initialiser, voir frontend/README.md)
└── backend/               ← API FastAPI (à initialiser, voir backend/README.md)
```

## Démarrage rapide (développement)

```bash
cp .env.example .env
docker compose up -d          # Postgres, Redis et MinIO

# Frontend (après initialisation, voir frontend/README.md)
cd frontend && npm install && npm run dev      # http://localhost:3000

# Backend (après initialisation, voir backend/README.md)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload   # http://localhost:8000
```

## Statut

**Phase actuelle : Phase 1, l'éditeur de planches sans IA.** Voir `docs/05-roadmap.md`.

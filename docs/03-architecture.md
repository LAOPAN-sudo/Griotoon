# 03 · Architecture

## Vue d'ensemble

```
┌──────────────────────────────┐
│  Navigateur (Next.js + React) │
│  ┌────────────┐ ┌──────────┐ │
│  │ Éditeur    │ │ Projets, │ │
│  │ react-konva│ │ persos,  │ │
│  │ + Zustand  │ │ script   │ │
│  └─────┬──────┘ └────┬─────┘ │
│        │ IndexedDB (brouillons hors ligne)
└────────┼─────────────┼───────┘
         │  REST/JSON  │
┌────────▼─────────────▼───────┐        ┌──────────────┐
│        API FastAPI           │───────▶│ PostgreSQL   │
│  /projects /pages /characters│        └──────────────┘
│  /scripts/breakdown          │        ┌──────────────┐
│  /generations                │───────▶│ MinIO / S3   │ images, exports
└────────┬─────────────────────┘        └──────────────┘
         │ tâches                ┌──────────────┐
         ▼                       │ Redis        │ broker et résultats
┌──────────────────────┐         └──────────────┘
│ Worker Celery        │──▶ API Claude (découpage du script)
│ - generate_panel     │──▶ API image (Replicate / fal.ai)
│ - export_pdf         │
└──────────────────────┘
```

## Services

| Service | Rôle | Port en dev |
|---|---|---|
| `frontend` | UI Next.js | 3000 |
| `backend` | API REST FastAPI | 8000 |
| `worker` | Celery : générations IA, exports | n/a |
| `postgres` | Données | 5432 |
| `redis` | File de tâches | 6379 |
| `minio` | Fichiers (console sur 9001) | 9000 / 9001 |

## Organisation du code

### Frontend (`frontend/`)
```
src/
├── app/                    # routes Next.js (App Router)
│   ├── page.tsx            # accueil / liste des projets
│   └── editeur/[pageId]/   # éditeur de planche
├── components/
│   ├── editor/             # Canvas, Panel, Bubble, Toolbar, LayersPanel…
│   └── ui/                 # boutons, modales…
├── store/                  # Zustand : editorStore (page courante + historique)
├── lib/
│   ├── templates.ts        # gabarits de découpage de cases
│   ├── export.ts           # export PNG/PDF
│   └── api.ts              # client de l'API
└── types/                  # types partagés (Page, Panel, Bubble…)
```

### Backend (`backend/`)
```
app/
├── main.py           # création de l'app FastAPI, CORS, routeurs
├── config.py         # paramètres (pydantic-settings, lus depuis .env)
├── db.py             # moteur et session SQLAlchemy
├── models/           # modèles ORM
├── schemas/          # schémas Pydantic (entrée et sortie)
├── routers/          # projects, pages, characters, generations
├── services/
│   ├── storage.py    # client S3/MinIO
│   ├── llm.py        # appels à l'API Claude
│   └── image_gen.py  # appels au modèle image
└── worker/
    ├── celery_app.py
    └── tasks.py
alembic/              # migrations
tests/
```

## Principes
- **La page en JSON est la source de vérité.** Le front l'édite, le back la stocke (JSONB), et l'export la rend.
- **Toute génération IA est asynchrone** : l'API crée un `generation_job`, le worker le traite, et le front interroge son statut (ou utilise du SSE plus tard).
- **Images** : téléversées sur MinIO, avec une miniature WebP générée côté serveur.
- **Fournisseurs IA interchangeables** : `services/image_gen.py` expose une interface simple (`generate(prompt, refs, style) -> image_url`) pour pouvoir changer de fournisseur sans toucher au reste.

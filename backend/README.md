# Backend Griotoon (FastAPI)

À initialiser à la **fin de la phase 1 ou au début de la phase 2** (voir `../docs/05-roadmap.md`).

## Initialisation

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" "sqlalchemy>=2" alembic "psycopg[binary]" \
            pydantic-settings boto3 celery redis anthropic httpx pillow pytest
pip freeze > requirements.txt
alembic init alembic
```

## Organisation cible

Voir `../docs/03-architecture.md` (section Backend). Modèles et schémas dans `../docs/04-modele-donnees.md`.

## Premiers endpoints (phase 2)

| Méthode | Route | Rôle |
|---|---|---|
| GET/POST | `/projects` | lister et créer des projets |
| GET/PATCH/DELETE | `/projects/{id}` | détail, modification, suppression |
| POST | `/projects/{id}/chapters` | créer un chapitre |
| GET/PUT | `/pages/{id}` | lire et enregistrer le JSON d'une page |
| POST | `/uploads` | téléverser une image (renvoie une URL MinIO) |
| POST | `/chapters/{id}/breakdown` | découper le script avec le LLM |
| POST | `/pages/{id}/panels/{panel_id}/generate` | lancer une génération (phase 3) |
| GET | `/generations/{job_id}` | statut d'une génération |

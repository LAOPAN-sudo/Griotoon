# Journal des décisions (ADR)

Format : date · décision · raison. Ajoute une entrée pour tout choix structurant.

| # | Date | Décision | Raison |
|---|---|---|---|
| 1 | 2026-11-13 | Nom : **Griotoon** (griot + toon) | Porte les 3 piliers (Afrique, BD numérique, récit). Aucune app ni marque existante trouvée à ce nom. Disponibilité OAPI et domaines encore à vérifier. |
| 2 | 2026-11-13 | Positionnement : public francophone et africain + cohérence des personnages + hybride IA/éditeur | Le marché des générateurs IA génériques et des logiciels de dessin est saturé. Les plateformes africaines existantes font de la lecture, pas de la création. |
| 3 | 2026-11-13 | **Application web** d'abord (pas de mobile natif) | Prototypage plus rapide, accessible partout, y compris sur le navigateur mobile. |
| 4 | 2026-11-13 | Front : Next.js + TypeScript + react-konva + Zustand | Écosystème standard. Konva est adapté aux objets déplaçables et redimensionnables sur un canvas. |
| 5 | 2026-11-13 | Back : FastAPI + PostgreSQL + Redis/Celery + MinIO | Python, c'est le terrain du porteur du projet. Générations asynchrones. Stockage compatible S3. |
| 6 | 2026-11-13 | Le texte des bulles n'est jamais généré dans l'image | Lisibilité, édition, traduction. Les modèles image gèrent mal le texte. |
| 7 | 2026-11-13 | Phase 1 = éditeur sans IA | C'est le cœur de la différenciation, et il ne coûte rien en API. |

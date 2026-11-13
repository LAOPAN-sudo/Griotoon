# 05 · Feuille de route

Coche les cases au fur et à mesure (`[x]`).

---

## Phase 1 : éditeur de planches sans IA ← **EN COURS**
Objectif : un éditeur utilisable pour monter une planche avec ses propres images. Spec détaillée dans `06-spec-editeur.md`.

- [ ] Initialiser le front (Next.js, TypeScript, Tailwind, react-konva, Zustand, Vitest)
- [ ] Types `Page`, `Panel`, `Bubble`, `Sfx` + store Zustand avec annuler/rétablir
- [ ] Canvas : affichage d'une page A4 à l'échelle, zoom et déplacement de la vue
- [ ] Gabarits de découpage (au moins 6) appliqués à une page vide
- [ ] Sélection, déplacement et redimensionnement des cases (Transformer de Konva)
- [ ] Import d'une image dans une case (glisser-déposer ou bouton) + recadrage
- [ ] Bulles : 4 types, texte éditable, pointe déplaçable
- [ ] Onomatopées (texte stylisé, rotation)
- [ ] Panneau des calques (ordre z, suppression)
- [ ] Sauvegarde locale automatique (IndexedDB) et restauration
- [ ] Export PNG de la page
- [ ] Export PDF (plusieurs pages)
- [ ] Gestion de plusieurs pages dans un chapitre (miniatures, ajout, réordonnancement)

**Validé quand** : on crée une page de 5 cases, on y met des images et 4 bulles, on recharge le navigateur sans rien perdre, et on exporte en PNG et en PDF lisibles.

## Phase 2 : backend et découpage du script par l'IA
- [ ] Initialiser le backend FastAPI + Alembic + modèles (`04-modele-donnees.md`)
- [ ] CRUD projets, chapitres, pages ; synchronisation de l'éditeur avec l'API
- [ ] Stockage des images sur MinIO
- [ ] Écran « Script » : l'utilisateur écrit son histoire
- [ ] `POST /chapters/{id}/breakdown` : le LLM renvoie le découpage en JSON (voir `07-pipeline-ia.md`)
- [ ] Conversion du découpage en pages (gabarits choisis automatiquement, description et dialogues pré-remplis dans les bulles)

**Validé quand** : une histoire d'environ 300 mots produit 1 à 2 pages pré-découpées, avec des bulles pré-remplies et éditables.

## Phase 3 : génération d'images par case
- [ ] Worker Celery + `generation_jobs`
- [ ] `services/image_gen.py` : interface générique + 1 fournisseur (Replicate ou fal.ai)
- [ ] Construction du prompt : style + description de la case + cadrage
- [ ] Bouton « Générer » et « Régénérer » par case, 2 à 4 variantes au choix
- [ ] Indicateurs de progression et gestion des erreurs

## Phase 4 : cohérence des personnages
- [ ] Écran de fiches personnages (description, tenue, palette, références)
- [ ] Génération d'une feuille de personnage
- [ ] Injection des références dans la génération (IP-Adapter ou équivalent chez le fournisseur)
- [ ] Mesure de la cohérence (test manuel sur 10 cases ; plus tard, similarité d'embeddings de visages)

## Phase 5 : contenu local et finitions
- [ ] Styles « afro » et bibliothèque de décors
- [ ] Modèles d'histoires (conte, légende, sensibilisation)
- [ ] Mode connexion faible complet (hors ligne et synchronisation)
- [ ] Export webtoon vertical
- [ ] Comptes utilisateurs, authentification
- [ ] (Plus tard) crédits et paiement mobile money

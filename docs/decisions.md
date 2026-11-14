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
| 8 | 2026-11-13 | Interface **bilingue français / anglais** dès la phase 1, français par défaut | Ouvre l'outil aux créateurs anglophones (Nigeria, Ghana…) sans perdre le public francophone. Mise en place : dictionnaires typés `fr` / `en` et un hook `useT()`, sans bibliothèque ni changement d'URL. La langue choisie est mémorisée localement. À revoir (par exemple avec next-intl) si on ajoute d'autres langues ou des URL par langue. |
| 9 | 2026-11-14 | Phase 1 : les images des cases sont stockées dans le JSON de la page, en **dataURL WebP** (2000 px max par côté, compressées dans le navigateur). `PanelImage` gagne `width` et `height` (taille réelle) | La page reste un document autonome : la sauvegarde locale (IndexedDB) et l'export l'emportent sans gestion de fichiers à part. Le poids reste raisonnable grâce au WebP. En phase 2, `src` deviendra l'URL de l'image sur MinIO, sans changer le reste du format. La taille réelle sert au recadrage (l'image doit toujours couvrir la case). |
| 10 | 2026-11-14 | Calques en **deux groupes** : bulles et onomatopées toujours au-dessus des cases ; `z` ordonne chaque groupe. Champ `hidden` pour masquer un élément | En BD, le texte n'est jamais caché par une case. Avec un seul ordre global, une case tracée après coup recouvrirait les bulles. Un élément masqué n'est ni dessiné ni exporté mais reste dans la liste des calques. |
| 11 | 2026-11-14 | Choix de couleur libre avec **react-colorful**, affiché dans le panneau des propriétés, au lieu du sélecteur natif `<input type="color">` | Le sélecteur natif est placé par le système : sous Linux, il sortait de l'écran à côté de la colonne de droite. react-colorful pèse environ 3 Ko, sans dépendance, et se règle au clavier ; il reste toujours dans la colonne. |

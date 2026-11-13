# 06 · Spec de la phase 1 : l'éditeur de planches

## Disposition de l'écran

```
┌───────────────────────────────────────────────────────────────┐
│ Griotoon  │ Projet › Chapitre 1 › Page 2   [Annuler][Rétablir]│ [Exporter ▾]
├──────────┬───────────────────────────────────────┬────────────┤
│ OUTILS   │                                       │ PROPRIÉTÉS │
│ ▢ Gabarit│                                       │ (élément   │
│ ▭ Case   │          CANVAS (page A4)             │ sélectionné│
│ 💬 Bulle │          zoom / déplacement de la vue │ : taille,  │
│ ✸ Onomat.│                                       │ bordure,   │
│ 🖼 Image │                                       │ police…)   │
│          │                                       ├────────────┤
│          │                                       │ CALQUES    │
├──────────┴───────────────────────────────────────┴────────────┤
│ PAGES : [1] [2] [3] [+]                                       │
└───────────────────────────────────────────────────────────────┘
```

## Ordre d'implémentation conseillé

### Étape 1 : fondations
- Types (`04-modele-donnees.md`) dans `src/types/page.ts`.
- `editorStore` (Zustand) :
  - `page: Page`, `selectedIds: string[]`
  - actions : `addPanel`, `updatePanel`, `removeElement`, `addBubble`, `updateBubble`, `addSfx`, `applyTemplate`, `reorder`, `select`
  - historique : piles `past` et `future` (limite de 100), `undo()` et `redo()`. Utiliser `immer` ou des copies immuables.
- Tests Vitest du store : ajout, modification, annuler, rétablir.

### Étape 2 : canvas
- `Stage` react-konva qui remplit la zone centrale. La page est un `Rect` blanc avec une ombre.
- Échelle « ajuster à l'écran » par défaut. Zoom avec la molette et Ctrl, déplacement de la vue avec Espace + glisser.
- Calques Konva : `panelsLayer`, `bubblesLayer`, `uiLayer` (Transformer).

### Étape 3 : gabarits de cases
Dans `src/lib/templates.ts`, des fonctions pures `(page) => Panel[]` qui respectent `margin` et `gutter`. Au minimum :
1. **Pleine page** (1 case)
2. **2 bandes horizontales**
3. **3 bandes horizontales**
4. **Grille 2 × 2**
5. **Classique manga** : 1 grande case en haut, 2 au milieu, 1 en bas
6. **Action** : 5 cases avec une case diagonale (option `rotation` ou forme polygonale plus tard)
7. **Webtoon** : cases pleine largeur empilées (pour le format vertical)

Le choix d'un gabarit remplace les cases existantes après confirmation (« Remplacer les cases actuelles ? »).

### Étape 4 : manipulation des cases
- Clic pour sélectionner, Maj + clic pour en sélectionner plusieurs.
- `Transformer` Konva pour déplacer et redimensionner, avec aimantation sur les bords de la page et des autres cases (tolérance de 8 px).
- Outil « Case » : tracer un rectangle à la souris pour créer une case.
- Touche Suppr pour supprimer, Ctrl+Z / Ctrl+Y pour annuler et rétablir, Ctrl+D pour dupliquer.

### Étape 5 : images dans les cases
- Glisser-déposer un fichier image sur une case, ou bouton « Importer une image » dans les propriétés.
- Image **découpée** à la forme de la case (`clipFunc` ou `Group` avec `clip`).
- Double-clic sur la case : mode recadrage (déplacer et zoomer l'image dans la case), puis Échap pour sortir.
- Phase 1 : image stockée en `dataURL` ou dans IndexedDB (blob). Phase 2 : téléversement sur MinIO.
- Compression côté client en WebP, avec un côté maximal de 2000 px.

### Étape 6 : bulles
- 4 types, avec un rendu `Konva.Shape` personnalisé :
  - **speech** : ellipse avec une pointe triangulaire vers `tail`
  - **thought** : nuage (cercles) avec 2 ou 3 petits cercles vers `tail`
  - **shout** : contour en étoile ou en pointes
  - **narration** : rectangle, sans pointe
- Texte centré, retour à la ligne automatique dans la bulle. Double-clic pour éditer (textarea HTML superposée au canvas).
- Poignée sur la pointe pour la déplacer.
- Polices libres de droits : **Comic Neue** pour les bulles, **Bangers** pour les onomatopées (Google Fonts, chargées via `next/font`).

### Étape 7 : onomatopées
- Texte en grand, avec contour (`stroke`), couleur et rotation libres.

### Étape 8 : calques et propriétés
- Liste de tous les éléments triés par `z`, avec glisser pour réordonner, une icône œil (masquer) et une corbeille.
- Panneau des propriétés contextuel : bordure de la case, police et taille de la bulle, couleur de l'onomatopée…

### Étape 9 : sauvegarde locale
- Sauvegarde automatique avec un délai de 1 s après chaque modification, dans IndexedDB (`idb-keyval`).
- Au chargement : restaurer le dernier état. Indicateur « Enregistré ✓ / Enregistrement… ».

### Étape 10 : export
- **PNG** : `stage.toDataURL({ pixelRatio })` sur la page seule (sans l'interface ni le Transformer), à la taille réelle 1240 × 1754.
- **PDF** : `jspdf`, une page PDF par planche.

### Étape 11 : plusieurs pages
- Barre de miniatures en bas : ajouter, dupliquer, supprimer, réordonner par glisser-déposer.
- Le store gère `chapter.pages[]` et l'index de la page courante.

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| Ctrl+Z / Ctrl+Y | Annuler / Rétablir |
| Suppr | Supprimer la sélection |
| Ctrl+D | Dupliquer |
| Flèches (Maj = ×10) | Déplacer la sélection de 1 px (10 px) |
| Espace + glisser | Déplacer la vue |
| Ctrl + molette | Zoom |
| B / C / O | Outil Bulle / Case / Onomatopée |

## Critères d'acceptation
Voir la phase 1 dans `05-roadmap.md`. En plus : aucune erreur dans la console, et l'interface reste fluide avec 10 cases et 20 bulles sur un ordinateur portable moyen.

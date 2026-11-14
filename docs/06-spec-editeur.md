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
- Traductions : `src/i18n/fr.ts` (référence) et `src/i18n/en.ts`, typé pour que TypeScript signale toute clé manquante en anglais. Un hook `useT()` renvoie le texte dans la langue courante, et un sélecteur **FR / EN** est placé dans la barre du haut. La langue choisie est mémorisée dans `localStorage`, avec le français par défaut.
- Test Vitest : les dictionnaires `fr` et `en` ont exactement les mêmes clés.

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
- Glisser-déposer un fichier image sur une case, ou bouton « Importer une image » dans les propriétés. En attendant le panneau des propriétés (étape 8) : bouton **Image** dans la colonne d'outils (case sélectionnée) et double-clic sur une case vide.
- Image **découpée** à la forme de la case (`clipFunc` ou `Group` avec `clip`).
- Double-clic sur la case : mode recadrage (déplacer et zoomer l'image dans la case), puis Échap pour sortir.
- Phase 1 : image stockée en `dataURL` dans le JSON de la page (décision n° 9). Phase 2 : téléversement sur MinIO.
- Compression côté client en WebP, avec un côté maximal de 2000 px.

### Étape 6 : bulles
- 4 types, avec un rendu `Konva.Shape` personnalisé :
  - **speech** : ellipse avec une pointe triangulaire vers `tail`
  - **thought** : nuage (cercles) avec 2 ou 3 petits cercles vers `tail`
  - **shout** : contour en étoile ou en pointes
  - **narration** : rectangle, sans pointe
- Texte centré, retour à la ligne automatique dans la bulle. Double-clic pour éditer (textarea HTML superposée au canvas).
- Poignée sur la pointe pour la déplacer.
- Les bulles pivotent comme les cases et les onomatopées (poignée de rotation). La pointe reste en coordonnées de page : elle est convertie dans le repère de la bulle pour le dessin.
- Polices libres de droits : **Comic Neue** pour les bulles, **Bangers** pour les onomatopées (Google Fonts, chargées via `next/font`).

### Étape 7 : onomatopées
- Texte en grand (police Bangers), avec contour (`strokeColor`, épaisseur proportionnelle à la taille), couleur et rotation libres.
- Outil Onomatopée (touche O) : un clic place « BAM ! » et ouvre la saisie (le texte est sélectionné, on tape directement le sien). Une onomatopée vidée de son texte est supprimée.
- Redimensionnement par les coins uniquement (proportions gardées) : la taille de police suit.

### Étape 8 : calques et propriétés
- Liste de tous les éléments triés par `z`, avec glisser pour réordonner, une icône œil (masquer) et une corbeille.
- Panneau des propriétés contextuel : bordure de la case, police et taille de la bulle, couleur de l'onomatopée…
- Calques en deux groupes (bulles et onomatopées au-dessus, cases en dessous, décision n° 10), réordonnables à l'intérieur de chaque groupe (glisser, ou Alt + flèches au clavier).
- Sans sélection, le panneau affiche les réglages de la page (fond, marge, gouttière). Les barres flottantes des bulles et des onomatopées sont remplacées par ce panneau ; seule la barre de recadrage reste flottante.
- Couleur de fond propre à chaque case (champ `fill`, blanc par défaut), dessinée sous l'image : flashback en sépia, case noire pour un moment dramatique, bleu nuit, etc. Pas de dégradés ni de trames en phase 1.

### Étape 9 : sauvegarde locale
- Sauvegarde automatique avec un délai de 1 s après chaque modification, dans IndexedDB (`idb-keyval`).
- Au chargement : restaurer le dernier état. Indicateur « Enregistré ✓ / Enregistrement… ».
- Mise en œuvre : clé unique `griotoon:current-page` (une seule page en phase 1 ; l'étape 11 passera au chapitre). Les données sont vérifiées avant restauration (sinon page vide). Le canvas n'apparaît qu'après la restauration. Écriture immédiate quand l'onglet est caché ou fermé. En cas d'échec (stockage plein…), l'indicateur affiche « Non enregistré », un message explique la cause et la fermeture de l'onglet demande confirmation.

### Étape 10 : export
- **PNG** : `stage.toDataURL({ pixelRatio })` sur la page seule (sans l'interface ni le Transformer), à la taille réelle 1240 × 1754.
- **PDF** : `jspdf`, une page PDF par planche.
- Mise en œuvre : bouton « Exporter » dans l'en-tête (Image PNG / Document PDF). Les calques de contenu (cases, bulles et onomatopées) sont copiés dans un canvas caché de la taille de la page : ni sélection, ni poignées, ni ombre de la feuille, ni éléments masqués. PNG à la taille réelle ; PDF au format A4 à 300 dpi (image JPEG, quelques centaines de Ko). Fichier nommé `griotoon-planche-AAAA-MM-JJ`. `jspdf` (version 4, sans les failles des versions ≤ 4.2.0) n'est chargé qu'au premier export PDF.

### Étape 11 : plusieurs pages
- Barre de miniatures en bas : ajouter, dupliquer, supprimer, réordonner par glisser-déposer.
- Le store gère `chapter.pages[]` et l'index de la page courante.
- Mise en œuvre : le store garde `pages`, `currentPage` et `page` (= `pages[currentPage]`, la page modifiée par toutes les actions existantes). Une étape d'annulation contient toutes les pages : on peut annuler un ajout, une suppression ou un déplacement de page, et annuler / rétablir réaffiche la page concernée. Changer de page n'est pas une étape (sélection vidée, recadrage en cours enregistré).
- « Réinitialiser la page » (panneau Page, sans sélection) : retire toutes les cases, images, bulles et onomatopées de la page affichée, après confirmation ; le fond, la marge et la gouttière restent. Une seule étape d'annulation.
- Nouvelle page : vide, avec le format, le fond, la marge et la gouttière de la page courante. Duplication : copie juste après l'original. Suppression : confirmation ; la dernière page ne peut pas être supprimée.
- Barre des pages : clic pour ouvrir, glisser ou Alt + ←/→ pour déplacer, boutons Dupliquer et Supprimer au survol (toujours visibles sur la page courante). Raccourcis Page préc. / Page suiv.
- Miniatures et export dessinés par la même fonction (`renderPage.tsx`) : la page est rendue depuis son JSON dans un canvas caché, avec les composants de l'éditeur. Miniatures redessinées 0,4 s après la dernière modification, seulement pour la page qui a changé.
- Export : PNG = page affichée ; PDF = tout le chapitre, une page A4 par planche, dessinées une à une pour limiter la mémoire.

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

# Frontend Griotoon (Next.js)

Éditeur de planches de Griotoon : Next.js (App Router) + TypeScript + Tailwind CSS, canvas avec `react-konva`, état avec Zustand.

## Commandes

```bash
npm install          # première fois
npm run dev          # http://localhost:3000
npm test             # tests Vitest (une passe)
npm run test:watch   # tests en continu
npm run typecheck    # vérification TypeScript
npm run lint         # ESLint
npm run build        # build de production
```

## Organisation

```
src/
├── app/                 # routes Next.js (App Router) : / et /editeur
├── components/
│   ├── editor/          # éditeur : Editor, EditorCanvas (Konva), PanelNode, BubbleNode, SfxNode, TextEditor, CropBar…
│   │   └── sidebar/     # colonne de droite : propriétés, calques, champs de formulaire
│   ├── LocaleSync.tsx   # restaure la langue choisie, met à jour <html lang>
│   └── ui/              # boutons, sélecteur de langue…
├── i18n/                # traductions : fr.ts (référence), en.ts, useT()
├── lib/pageStorage.ts   # sauvegarde locale dans IndexedDB (idb-keyval), vérification avant restauration
├── lib/autosave.ts      # sauvegarde automatique : délai de 1 s, écriture immédiate quand l'onglet est caché
├── lib/page.ts          # page vide et éléments par défaut (case, bulle, onomatopée)
├── lib/bubbles.ts       # formes des bulles (fonctions pures → tracé), zone de texte
├── lib/sfx.ts           # onomatopées : tailles, contour, couleurs
├── lib/layers.ts        # groupes de calques (textes au-dessus des cases), réordonnancement
├── lib/properties.ts    # modifications depuis le panneau (la pointe suit, l'image se réajuste)
├── lib/geometry.ts      # boîtes englobantes, rectangle tracé, case sous un point
├── lib/image.ts         # compression WebP à l'import, calculs de recadrage
├── lib/snapping.ts      # aimantation (bords de page, marges, autres cases, gouttière)
├── lib/shortcuts.ts     # raccourcis clavier (touche → action)
├── lib/templates.ts     # gabarits de cases (fonctions pures page → cases)
├── lib/viewport.ts      # calculs de zoom et d'ajustement à l'écran (fonctions pures)
├── store/editorStore.ts # store Zustand de l'éditeur + annuler/rétablir
├── store/viewStore.ts   # zoom et position de la vue (hors historique)
├── store/uiStore.ts     # état de l'interface (fenêtres ouvertes…)
└── types/page.ts        # format JSON d'une page (docs/04-modele-donnees.md)
```

Organisation cible complète : `../docs/03-architecture.md`.

## Règles

- **Traductions** : aucun texte d'interface en dur dans les composants. On ajoute la clé dans `src/i18n/fr.ts` **et** dans `src/i18n/en.ts` (sinon TypeScript refuse de compiler), puis on l'utilise avec `const t = useT(); t("ma.cle")`. Paramètres : `t("home.phase", { phase: 1 })` pour `"Phase {phase}"`.
- **Store** : toute modification de la page passe par les actions de `editorStore` (jamais de mutation directe des objets Konva). Chaque action crée une étape d'historique ; la sélection n'en crée pas.
- **Sauvegarde locale** : la page est enregistrée dans IndexedDB 1 s après chaque modification (`useLocalSave`). Le canvas n'apparaît qu'une fois la dernière page restaurée, pour qu'une page vide n'écrase jamais une sauvegarde. Pour repartir de zéro en dev : outils de développement du navigateur → Application → IndexedDB → supprimer `keyval-store`.
- **Raccourcis clavier** : un nouveau raccourci s'ajoute à deux endroits de `src/lib/shortcuts.ts` : dans `matchShortcut` (ce qu'il fait) et dans `SHORTCUT_GROUPS` (la fenêtre « Raccourcis clavier », touche `?`). Un test vérifie que chaque raccourci affiché existe vraiment.
- **Images** : compressées dans le navigateur (WebP, 2000 px max) puis stockées en dataURL dans le JSON de la page (phase 1, décision n° 9). Une image couvre toujours sa case : `clampCrop` corrige le recadrage après chaque déplacement, zoom ou redimensionnement.
- **Bulles** : le contour vient de `bubblePath` (liste de tracés, testable), rejoué par Konva. Les bulles pivotent comme les cases. La pointe (`tail`) est en coordonnées de page : `tailToLocal` la ramène dans le repère tourné de la bulle pour le dessin, et `transformTail` la recalcule après un déplacement, une rotation ou un redimensionnement. Le texte s'édite dans un `<textarea>` HTML posé sur la bulle (`BubbleTextEditor`), à la même police et au même zoom. Le JSON garde le nom de police (« Comic Neue ») ; `canvasFontFamily` le traduit en police réelle chargée par next/font.
- **Onomatopées** : texte Bangers avec contour dessiné derrière le remplissage. Redimensionnées par les coins seulement ; l'échelle est convertie en `fontSize` à la fin du geste (l'épaisseur du contour suit). Le même `TextEditor` sert à la saisie des bulles et des onomatopées.
- **Calques** : deux groupes dessinés dans cet ordre, cases puis bulles et onomatopées (décision n° 10) ; `z` ordonne chaque groupe. Un élément `hidden` n'est ni dessiné ni exporté.
- **Canvas** : react-konva utilise le canvas du navigateur. Les composants de l'éditeur sont des composants client (`'use client'`) chargés via `next/dynamic` avec `{ ssr: false }`.
- **Polices** : Geist (interface), Comic Neue (bulles, classe `font-comic`), Bangers (onomatopées, classe `font-bangers`), chargées via `next/font/google` dans `src/app/layout.tsx`.
- Cette version de Next.js (16) diffère des anciennes : consulter `node_modules/next/dist/docs/` en cas de doute (voir `AGENTS.md`).

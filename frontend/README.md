# Frontend Griotoon (Next.js)

Ce dossier est vide pour l'instant. À initialiser par Claude Code au début de la phase 1.

## Initialisation

Depuis la racine du projet :

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd frontend
npm install konva react-konva zustand immer idb-keyval jspdf nanoid
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

> ⚠️ `create-next-app` refuse un dossier non vide : déplace temporairement ce README, puis remets-le (ou fusionne son contenu dans le README généré).

Notes :
- react-konva utilise le canvas du navigateur, donc les composants de l'éditeur sont des **composants client** (`'use client'`), chargés via `next/dynamic` avec `{ ssr: false }`.
- Ajoute un script `"test": "vitest"` dans `package.json`.
- Polices : Comic Neue (bulles) et Bangers (onomatopées), via `next/font/google`.

## Organisation cible

Voir `../docs/03-architecture.md` (section Frontend) et `../docs/06-spec-editeur.md`.

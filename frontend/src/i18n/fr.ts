// Reference dictionary. Every key added here must also be added to en.ts
// (TypeScript will refuse to compile otherwise).
// Placeholders use {name} syntax.

export const fr = {
  "app.name": "Griotoon",
  "app.tagline": "Raconte tes histoires en manga.",
  "app.description":
    "Crée des mangas, manhuas et webtoons : l'IA propose un brouillon, tu gardes la main sur chaque case.",

  "home.phase": "Phase {phase} en cours : éditeur de planches",
  "home.openEditor": "Ouvrir l'éditeur",

  "editor.title": "Éditeur de planches",
  "editor.backHome": "Retour à l'accueil",
  "editor.loading": "Chargement de l'éditeur…",
  "editor.canvasLabel": "Planche",
  "editor.zoomIn": "Zoom avant",
  "editor.zoomOut": "Zoom arrière",
  "editor.zoomLevel": "Niveau de zoom",
  "editor.fit": "Ajuster à l'écran",
  "editor.navigationHint": "Ctrl + molette : zoomer · Molette : défiler · Espace + glisser : déplacer la vue",

  "language.label": "Langue",
  "language.fr": "Français",
  "language.en": "English",
};

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;

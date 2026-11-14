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

  "toolbar.label": "Outils",
  "toolbar.templates": "Gabarit",
  "toolbar.select": "Sélection",
  "toolbar.panel": "Case",

  "templates.title": "Gabarits de cases",
  "templates.help": "Choisis un découpage de départ. Tu pourras ensuite déplacer et redimensionner chaque case.",
  "templates.full": "Pleine page",
  "templates.twoStrips": "2 bandes",
  "templates.threeStrips": "3 bandes",
  "templates.grid2x2": "Grille 2 × 2",
  "templates.mangaClassic": "Classique manga",
  "templates.action": "Action",
  "templates.webtoon": "Webtoon",
  "templates.confirmTitle": "Remplacer les cases actuelles ?",
  "templates.confirmMessage": "Les cases de la page seront remplacées par celles du gabarit. Les bulles et les onomatopées sont conservées. Tu pourras annuler avec Ctrl + Z.",
  "templates.confirmReplace": "Remplacer",

  "history.undo": "Annuler",
  "history.redo": "Rétablir",

  "shortcuts.title": "Raccourcis clavier",
  "shortcuts.button": "Raccourcis",
  "shortcuts.or": "ou",
  "shortcuts.groupGeneral": "Général",
  "shortcuts.groupTools": "Outils",
  "shortcuts.groupSelection": "Sélection et cases",
  "shortcuts.groupView": "Vue",
  "shortcuts.undo": "Annuler",
  "shortcuts.redo": "Rétablir",
  "shortcuts.escape": "Revenir à la sélection, puis tout désélectionner",
  "shortcuts.help": "Afficher ces raccourcis",
  "shortcuts.toolSelect": "Outil Sélection",
  "shortcuts.toolPanel": "Outil Case (tracer une case)",
  "shortcuts.select": "Sélectionner un élément",
  "shortcuts.selectAdd": "Ajouter ou retirer de la sélection",
  "shortcuts.delete": "Supprimer la sélection",
  "shortcuts.duplicate": "Dupliquer la sélection",
  "shortcuts.nudge": "Déplacer de 1 px",
  "shortcuts.nudgeFast": "Déplacer de 10 px",
  "shortcuts.zoom": "Zoomer vers le curseur",
  "shortcuts.scroll": "Faire défiler la vue",
  "shortcuts.scrollHorizontal": "Défiler horizontalement",
  "shortcuts.pan": "Déplacer la vue",

  "keys.ctrl": "Ctrl",
  "keys.shift": "Maj",
  "keys.escape": "Échap",
  "keys.delete": "Suppr",
  "keys.backspace": "Retour arrière",
  "keys.space": "Espace",
  "keys.arrows": "Flèches",
  "keys.click": "Clic",
  "keys.drag": "Glisser",
  "keys.wheel": "Molette",

  "common.cancel": "Annuler",
  "common.close": "Fermer",

  "language.label": "Langue",
  "language.fr": "Français",
  "language.en": "English",
};

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;

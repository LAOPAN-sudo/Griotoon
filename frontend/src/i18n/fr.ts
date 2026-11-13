// Reference dictionary. Every key added here must also be added to en.ts
// (TypeScript will refuse to compile otherwise).
// Placeholders use {name} syntax.

export const fr = {
  "app.name": "Griotoon",
  "app.tagline": "Raconte tes histoires en manga.",
  "app.description":
    "Crée des mangas, manhuas et webtoons : l'IA propose un brouillon, tu gardes la main sur chaque case.",

  "home.status": "L'éditeur de planches arrive bientôt.",
  "home.phase": "Phase {phase} en cours : éditeur de planches",

  "language.label": "Langue",
  "language.fr": "Français",
  "language.en": "English",
};

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;

# 04 · Modèle de données

## Hiérarchie

```
User ─┬─ Project ─┬─ Chapter ── Page (contenu en JSONB)
      │           └─ Character ── CharacterReference (images)
      └─ GenerationJob (lié à une page et à une case)
```

## Schéma SQL (brouillon, à implémenter avec SQLAlchemy et Alembic)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'manga',      -- manga | manhua | webtoon
  style TEXT,                                -- id du style visuel par défaut
  reading_direction TEXT DEFAULT 'ltr',      -- ltr (occidental) | rtl (manga japonais)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  number INT NOT NULL,
  title TEXT,
  script TEXT,                 -- l'histoire écrite par l'utilisateur
  breakdown JSONB,             -- découpage proposé par le LLM (voir 07-pipeline-ia.md)
  UNIQUE (project_id, number)
);

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  number INT NOT NULL,
  content JSONB NOT NULL,      -- document Page (format ci-dessous)
  thumbnail_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (chapter_id, number)
);

CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,            -- apparence physique, âge, coiffure…
  outfit TEXT,
  palette JSONB,               -- ["#3B2A1A", "#E8B04A", …]
  prompt_tokens TEXT           -- formulation fixe injectée dans chaque prompt
);

CREATE TABLE character_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  kind TEXT DEFAULT 'face'     -- face | full_body | expression | sheet
);

CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  panel_id TEXT NOT NULL,      -- id de la case dans pages.content
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | done | error
  prompt TEXT,
  params JSONB,
  result_urls JSONB,           -- variantes générées
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Format JSON d'une page (`pages.content`)

Coordonnées en **pixels de la page** (origine en haut à gauche). Le canvas met l'affichage à l'échelle.

```jsonc
{
  "version": 1,
  "width": 1240,              // A4 à 150 dpi : 1240 × 1754
  "height": 1754,
  "background": "#FFFFFF",
  "gutter": 20,               // espace entre les cases
  "margin": 60,
  "panels": [
    {
      "id": "p1",
      "x": 60, "y": 60, "w": 1120, "h": 500,
      "rotation": 0,
      "border": { "width": 4, "color": "#000000" },
      "image": {                         // null si la case est vide
        "src": "https://…/img.webp",     // phase 1 : dataURL WebP ; phase 2 : URL MinIO
        "width": 1600, "height": 1200,   // taille réelle de l'image stockée, en pixels
        "offsetX": 0, "offsetY": 0,      // recadrage : position du coin haut gauche de l'image dans la case
        "scale": 1                       // taille affichée = width × scale, height × scale
      },
      "characters": ["char_uuid_1"],     // utilisé par la génération IA (phases 3 et 4)
      "description": "Plan large : Awa arrive au marché de Ouaga au lever du soleil",
      "z": 0
    }
  ],
  "bubbles": [
    {
      "id": "b1",
      "type": "speech",                  // speech | thought | shout | narration
      "x": 700, "y": 100, "w": 300, "h": 140,
      "tail": { "x": 640, "y": 320 },    // pointe de la bulle (absente pour narration)
      "text": "Vite, le marché ouvre déjà !",
      "fontFamily": "Comic Neue",
      "fontSize": 28,
      "align": "center",
      "panelId": "p1",                   // case de rattachement (facultatif)
      "z": 10
    }
  ],
  "sfx": [                               // onomatopées (phase 1, en option)
    { "id": "s1", "text": "BAM !", "x": 200, "y": 900, "fontSize": 72, "rotation": -12, "color": "#C0392B", "z": 11 }
  ]
}
```

### Types TypeScript correspondants

À placer dans `frontend/src/types/page.ts` et à garder synchronisés avec les schémas Pydantic.

```ts
export type BubbleType = 'speech' | 'thought' | 'shout' | 'narration';

export interface PanelImage {
  src: string; width: number; height: number;   // taille réelle de l'image stockée
  offsetX: number; offsetY: number; scale: number;
}
export interface Panel {
  id: string; x: number; y: number; w: number; h: number; rotation: number;
  border: { width: number; color: string };
  image: PanelImage | null;
  characters: string[]; description?: string; z: number;
}
export interface Bubble {
  id: string; type: BubbleType; x: number; y: number; w: number; h: number;
  tail?: { x: number; y: number }; text: string;
  fontFamily: string; fontSize: number; align: 'left' | 'center' | 'right';
  panelId?: string; z: number;
}
export interface Sfx { id: string; text: string; x: number; y: number; fontSize: number; rotation: number; color: string; z: number; }
export interface Page {
  version: 1; width: number; height: number; background: string;
  gutter: number; margin: number;
  panels: Panel[]; bubbles: Bubble[]; sfx: Sfx[];
}
```

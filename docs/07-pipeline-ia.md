# 07 · Pipeline IA (phases 2 à 4)

## Vue d'ensemble

```
Histoire (texte)
   │  ① LLM (API Claude) : découpage
   ▼
Découpage JSON (pages → cases → description, cadrage, personnages, dialogues)
   │  ② conversion en documents Page (gabarit choisi selon le nombre de cases)
   ▼
Pages pré-remplies (cases vides + bulles avec les dialogues)
   │  ③ génération d'image par case (asynchrone, worker Celery)
   │     prompt = style + cadrage + description + fiches personnages (+ images de référence)
   ▼
Images dans les cases → retouche dans l'éditeur
```

## ① Découpage du script par le LLM

### Prompt système (base à affiner)

```
Tu es un storyboarder professionnel de manga. On te donne une histoire en français.
Découpe-la en pages et en cases pour une BD au format {format} ({nb_pages_max} pages maximum, 3 à 6 cases par page).
Pour chaque case, décris uniquement ce qu'on VOIT (pas les pensées), le cadrage, les personnages présents et les dialogues.
Utilise uniquement les personnages fournis, avec leur id exact. Situe l'action dans le contexte culturel décrit dans l'histoire.
Réponds UNIQUEMENT avec un JSON valide qui respecte ce schéma : {schema}
```

Données passées dans le message utilisateur : l'histoire, la liste des personnages (`id`, `name`, `description`), le format et le style.

### Schéma de sortie

```jsonc
{
  "title": "Awa et le marché",
  "pages": [
    {
      "number": 1,
      "panels": [
        {
          "shot": "wide",               // extreme_wide | wide | medium | close_up | extreme_close_up
          "angle": "eye_level",         // eye_level | high | low | dutch
          "description": "Le grand marché de Ouagadougou au lever du soleil, étals colorés, poussière dorée.",
          "characters": ["char_awa"],
          "dialogues": [
            { "character": "char_awa", "type": "speech", "text": "Vite, le marché ouvre déjà !" }
          ],
          "narration": "Ce matin-là, tout allait changer…",
          "sfx": null
        }
      ]
    }
  ]
}
```

- Valider la réponse avec Pydantic. Si elle est invalide, relancer une fois en renvoyant l'erreur au LLM.
- Choix du gabarit : correspondance entre le nombre de cases et un gabarit (1 → pleine page, 4 → grille 2 × 2, etc.). Les cases `wide` ou `extreme_wide` reçoivent de préférence les grandes cases.

## ③ Génération d'images

### Construction du prompt image

```
{style_prompt}, {shot} shot, {angle} angle,
{description},
{pour chaque personnage : character.prompt_tokens},
no text, no speech bubbles, no letters
```

- `style_prompt` vient de la bibliothèque de styles. Exemples :
  - `manga_bw` : *"black and white manga illustration, clean ink lines, screentone shading"*
  - `manhua_color` : *"full color manhua illustration, soft cel shading, vibrant colors"*
  - `afro_warm` : *"vibrant comic illustration, warm earthy palette, West African setting, bogolan-inspired patterns"*
- **Toujours** ajouter « no text, no speech bubbles » : le texte est géré par l'éditeur.
- Prompt négatif (si le modèle le gère) : textes, filigranes, mains déformées.
- Format de l'image : calculé à partir du ratio largeur/hauteur de la case, arrondi au format pris en charge le plus proche.

### Interface du service (à respecter)

```python
class ImageGenerator(Protocol):
    def generate(
        self,
        prompt: str,
        negative_prompt: str | None,
        width: int,
        height: int,
        reference_images: list[str],  # URLs des références des personnages
        num_variants: int = 2,
        seed: int | None = None,
    ) -> list[str]:                   # URLs des images (téléversées sur MinIO)
        ...
```

Commencer par **un seul fournisseur hébergé** (Replicate ou fal.ai) avec un modèle de diffusion récent (famille Flux ou SDXL). Vérifier au moment de l'implémentation les modèles disponibles et leurs prix : ça évolue vite.

## ④ Cohérence des personnages

Stratégies, de la plus simple à la plus robuste :
1. **Prompt fixe** (`prompt_tokens`) : description très précise et identique à chaque fois (« jeune femme de 20 ans, peau ébène, tresses courtes ornées de perles jaunes, pagne wax bleu et orange »). C'est gratuit mais insuffisant à lui seul.
2. **Images de référence** (IP-Adapter, ou les fonctionnalités « personnage de référence » proposées par certains fournisseurs) : on injecte 1 à 4 images de la fiche. C'est **la cible du MVP**.
3. **LoRA par personnage** : entraîné sur environ 10 à 20 images. C'est le plus fidèle, mais ça coûte plus cher et prend plus de temps. Ce sera une option « premium » plus tard.

Mesure : avec un modèle d'embedding de visages (par exemple InsightFace), calculer la similarité entre la référence et chaque case générée. Afficher un avertissement en dessous d'un seuil. Profil data science : c'est un bon terrain d'expérimentation.

## Coûts et garde-fous
- Journaliser chaque appel (fournisseur, modèle, coût estimé, durée) dans `generation_jobs.params`.
- Limite de générations par utilisateur et par jour, configurable dans `.env`.
- Filtrer les prompts : refuser les personnages protégés connus et les contenus interdits.

## Assistant conversationnel (phase 2, après le découpage simple)

Le découpage simple est un aller simple (histoire → JSON → pages). L'assistant ajoute une discussion par-dessus, pour les créateurs qui ont une idée mais pas encore l'habitude du découpage BD.

### Ce qu'il fait
- **Écrire l'histoire** : poser des questions (lieu, époque, personnages, ton, public), proposer une suite ou une fin, corriger et reformuler en français (ou en anglais selon la langue de l'interface).
- **Retoucher le découpage** : « rends la page 3 plus dramatique », « coupe cette scène en deux cases », « ajoute une case de réaction », « traduis les bulles en anglais ».
- **Ne jamais modifier sans accord** : chaque proposition s'affiche en aperçu (texte modifié, pages et cases touchées) avec « Appliquer » et « Ignorer ». Appliquer = une seule étape d'annulation dans l'éditeur.

### Fonctionnement
- API Claude avec **outils** (tool use) plutôt que du texte libre : l'assistant appelle `propose_story_edit`, `propose_breakdown`, `propose_breakdown_patch` (opérations sur pages et cases : ajouter, retirer, modifier une description, un dialogue, un cadrage). Les arguments sont validés par Pydantic côté backend, avec le même schéma que le découpage.
- Contexte envoyé à chaque message : l'histoire, le découpage courant, les fiches personnages (phase 4), la langue de l'interface. Les images ne sont pas envoyées.
- Réponses en continu (streaming, SSE) pour que la connexion lente reste supportable ; historique de la discussion stocké par chapitre (table `assistant_messages` à ajouter au modèle de données).
- Le texte des bulles reste du texte (règle n° 3) : l'assistant modifie des dialogues, jamais des images.
- Coût maîtrisé : limite de messages par chapitre, historique résumé au-delà d'une certaine longueur.


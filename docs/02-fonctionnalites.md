# 02 · Fonctionnalités

## Par pilier

### Pilier 1 : public francophone et africain
- Interface entièrement en français (i18n prévue pour l'anglais, puis le mooré, le dioula, le wolof…).
- Bibliothèque de **styles visuels** : manga noir et blanc, manhua couleur, webtoon, plus des styles « afro » (couleurs chaudes, motifs inspirés du bogolan et du wax…).
- **Décors et références** : village sahélien, marché, maquis, ville (Ouaga, Abidjan, Dakar), savane, cour familiale…
- **Modèles d'histoires** : conte traditionnel, légende, vie de quartier, histoire d'école, sensibilisation (santé, environnement).
- **Mode connexion faible** : brouillons hors ligne, images WebP compressées, synchronisation différée.

### Pilier 2 : cohérence des personnages
- **Fiche personnage** : nom, description physique, tenue, palette de couleurs, 1 à 4 images de référence.
- Chaque case connaît la liste des personnages présents. La génération injecte automatiquement leurs références.
- **Feuille de personnage** générée (face, profil, expressions) pour valider l'apparence avant de produire les pages.

### Pilier 3 : hybride IA + éditeur
- **Script → découpage** : le LLM transforme l'histoire en pages et en cases (cadrage, action, personnages, dialogues).
- **Génération par case**, avec bouton « régénérer cette case » et choix entre plusieurs variantes.
- **Éditeur de planches** : gabarits de cases, déplacement et redimensionnement, bulles (parole, pensée, cri, narration), onomatopées, calques, annuler/rétablir.
- **Export** : PNG par page, PDF (format A4/B5), bande verticale webtoon.

## Périmètre du MVP (phases 1 à 4)

L'utilisateur peut :
1. Créer un projet et un chapitre.
2. Créer 1 à 3 personnages avec une fiche.
3. Écrire une courte histoire (environ 1 page de texte).
4. Obtenir un découpage en planches de 4 à 6 cases.
5. Générer les images des cases avec des personnages cohérents.
6. Éditer : cases, bulles, régénération d'une case.
7. Exporter en PNG ou en PDF.

## Hors MVP (plus tard)
- Comptes multiples et collaboration en temps réel.
- Publication et lecture publique, communauté.
- Paiement mobile money et crédits.
- Animation (motion comic).
- App mobile native.

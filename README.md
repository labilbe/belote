# Belote

Jeu de **belote classique** à quatre joueurs (deux équipes), jouable directement dans le navigateur
contre trois adversaires gérés par l'ordinateur. Aucun serveur, aucune dépendance : du HTML, du CSS
et des modules JavaScript natifs.

▶️ **Jouer : https://labilbe.github.io/belote/**

## Règles appliquées

- Jeu de 32 cartes, équipes Sud & Nord contre Ouest & Est.
- Distribution 3 + 2, une carte retournée.
  - **Premier tour** : prendre à la couleur retournée, ou passer.
  - **Second tour** : nommer une autre couleur, ou passer. Quatre passes : on redonne.
  - Le preneur reçoit la retournée et deux cartes, les autres trois cartes.
- Ordre et valeurs à l'atout : V (20) · 9 (14) · A (11) · 10 (10) · R (4) · D (3) · 8 · 7.
- Ordre et valeurs à la couleur : A (11) · 10 (10) · R (4) · D (3) · V (2) · 9 · 8 · 7.
- Obligation de fournir, de couper, de surcouper et de monter à l'atout ; le partenaire maître
  dispense de couper.
- **Belote & rebelote** (Roi + Dame d'atout) : 20 points, annoncés au moment où les cartes tombent.
- **Dix de der** : 10 points pour le dernier pli.
- Décompte : le preneur doit totaliser plus de points que la défense.
  - Contrat réussi : chaque camp marque ses points.
  - **Dedans** : la défense marque 162 (le preneur ne garde que sa belote).
  - **Capot** : 252 points.
  - **Litige** (81 – 81) : les points du preneur sont mis en cagnotte pour la donne suivante.
- La partie s'arrête à 1000 points.

## Jouer en local

Les modules ES imposent de servir les fichiers par HTTP (un simple `file://` ne suffit pas) :

```bash
npx serve .          # ou : python -m http.server 8000
```

puis ouvrir `http://localhost:3000`.

## Tests

Le moteur est vérifié par auto-parties : 500 donnes jouées par l'IA, en contrôlant la légalité de
chaque carte posée et le total de 162 points par donne.

```bash
npm test
```

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `src/cards.js` | Jeu de 32 cartes, ordres, valeurs, tri des mains. |
| `src/rules.js` | Cartes jouables, maître du pli, décompte d'une donne. |
| `src/game.js` | Machine à états : distribution, enchères, plis, scores. |
| `src/ai.js` | Décisions d'enchère et choix de carte des adversaires. |
| `src/faces.js` | Faces des cartes : figures du portrait français, chiffrées composées. |
| `src/pips.js` | Symboles d'enseigne (pique, cœur, carreau, trèfle). |
| `src/ui.js` | Rendu du tapis et interactions du joueur. |

## Cartes

Les figures sont les vraies cartes du **portrait officiel français** (jeu SVG de David Bellot,
récupérées sur Wikimedia Commons) ; les cartes chiffrées sont composées dans la même géométrie
et avec les mêmes symboles d'enseigne, pour que le jeu reste cohérent.
En dessous de 860 px de large, les cartes rétrécissent et les figures illustrées cèdent la place
à une face sobre (index et grande enseigne), plus lisible — les images ne sont alors pas chargées.
Crédits et licence (LGPL 2.1 ou ultérieure) : `assets/figures/CREDITS.md`.

Publié via GitHub Pages depuis la branche `main` (fichier `.nojekyll` pour servir le dossier tel quel).

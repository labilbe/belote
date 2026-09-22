// Intelligence artificielle des trois joueurs non humains.

import { RANKS, cardOrder, cardPoints, isAtout } from './cards.js';
import { PARTNER_OF, TEAM_OF, winningIndex } from './rules.js';

// ---------------------------------------------------------------- Enchères

const FORCE_ATOUT = { V: 9, 9: 7, A: 6, 10: 4, R: 3, D: 3, 8: 1, 7: 1 };
const FORCE_NORMAL = { A: 5, 10: 2, R: 2, D: 1, V: 1, 9: 0, 8: 0, 7: 0 };

/** Estimation de la force d'une main pour un atout donné. */
export function forceMain(main, atout) {
  let score = 0;
  let nbAtouts = 0;
  const parCouleur = {};
  for (const c of main) {
    if (isAtout(c, atout)) {
      score += FORCE_ATOUT[c.rank];
      nbAtouts += 1;
    } else {
      score += FORCE_NORMAL[c.rank];
      parCouleur[c.suit] = (parCouleur[c.suit] || 0) + 1;
    }
  }
  if (nbAtouts >= 4) score += 4;
  if (nbAtouts >= 5) score += 4;
  if (nbAtouts <= 1) score -= 5;
  // Une couleur absente est une possibilité de couper.
  const absentes = 3 - Object.keys(parCouleur).length;
  score += absentes * 2;
  return score;
}

/**
 * Décision d'enchère d'un joueur automatique.
 * @returns {'passe'|string} 'passe' ou la couleur choisie.
 */
export function deciderEnchere(game, joueur) {
  const main = game.mains[joueur];
  const estDonneur = joueur === game.donneur;

  if (game.phase === 'encheres1') {
    const atout = game.retournee.suit;
    const mainAvec = main.concat([game.retournee]);
    let score = forceMain(mainAvec, atout);
    // Le donneur reçoit la retournée si un adversaire la prend : il est plus prudent.
    if (estDonneur) score += 2;
    const partenairePrendrait = PARTNER_OF[joueur] === game.donneur;
    if (partenairePrendrait) score += 1;
    return score >= 18 ? atout : 'passe';
  }

  let meilleure = null;
  let meilleurScore = -Infinity;
  for (const couleur of game.couleursSecondTour()) {
    const s = forceMain(main, couleur);
    if (s > meilleurScore) {
      meilleurScore = s;
      meilleure = couleur;
    }
  }
  const seuil = estDonneur ? 15 : 18;
  return meilleurScore >= seuil ? meilleure : 'passe';
}

// ------------------------------------------------------------------- Jeu

/** Cartes d'une couleur encore invisibles pour `joueur`. */
function cartesRestantes(game, joueur, couleur) {
  const vues = new Set();
  for (const c of game.cartesJouees) if (c.suit === couleur) vues.add(c.rank);
  for (const t of game.pli) if (t.card.suit === couleur) vues.add(t.card.rank);
  for (const c of game.mains[joueur]) if (c.suit === couleur) vues.add(c.rank);
  return RANKS.filter((r) => !vues.has(r)).map((r) => ({ suit: couleur, rank: r }));
}

/** La carte est-elle la plus forte encore en circulation dans sa couleur ? */
function estMaitre(game, joueur, carte) {
  const reste = cartesRestantes(game, joueur, carte.suit);
  return reste.every((c) => cardOrder(c, game.atout) < cardOrder(carte, game.atout));
}

const parPoints = (atout) => (a, b) => cardPoints(a, atout) - cardPoints(b, atout);

function plusPetite(cartes, atout) {
  return cartes.slice().sort((a, b) => cardPoints(a, atout) - cardPoints(b, atout) || cardOrder(a, atout) - cardOrder(b, atout))[0];
}

function plusForte(cartes, atout) {
  return cartes.slice().sort((a, b) => cardOrder(b, atout) - cardOrder(a, atout))[0];
}

function entame(game, joueur, jouables) {
  const atout = game.atout;
  const monEquipe = TEAM_OF[joueur];
  const atouts = jouables.filter((c) => isAtout(c, atout));
  const autres = jouables.filter((c) => !isAtout(c, atout));

  // Le preneur tire les atouts tant qu'il est maître.
  if (TEAM_OF[game.preneur] === monEquipe && atouts.length >= 2) {
    const maitre = atouts.filter((c) => estMaitre(game, joueur, c));
    if (maitre.length) return plusForte(maitre, atout);
  }

  // Sinon, on encaisse une couleur maîtresse.
  const maitres = autres.filter((c) => estMaitre(game, joueur, c));
  if (maitres.length) return maitres.sort(parPoints(atout)).pop();

  // À défaut, une petite carte dans une couleur peu fournie.
  if (autres.length) {
    const compte = {};
    for (const c of autres) compte[c.suit] = (compte[c.suit] || 0) + 1;
    const courtes = autres.filter((c) => compte[c.suit] === Math.min(...Object.values(compte)));
    return plusPetite(courtes, atout);
  }
  return plusPetite(jouables, atout);
}

/** Carte jouée par un joueur automatique. */
export function choisirCarte(game, joueur) {
  const atout = game.atout;
  const jouables = game.cartesJouables(joueur);
  if (jouables.length === 1) return jouables[0];
  if (!game.pli.length) return entame(game, joueur, jouables);

  const idxMaitre = winningIndex(game.pli, atout);
  const maitreActuel = game.pli[idxMaitre];
  const partenaireMaitre = PARTNER_OF[joueur] === maitreActuel.player;
  const pointsAuTapis = game.pli.reduce((s, t) => s + cardPoints(t.card, atout), 0);
  const dernierAParler = game.pli.length === 3;

  const gagnantes = jouables.filter((c) => {
    const essai = game.pli.concat([{ player: joueur, card: c }]);
    return winningIndex(essai, atout) === essai.length - 1;
  });

  if (partenaireMaitre) {
    const sur = dernierAParler || estMaitre(game, joueur, maitreActuel.card);
    if (sur) {
      // On charge le pli du partenaire.
      const nonAtout = jouables.filter((c) => !isAtout(c, atout));
      const source = nonAtout.length ? nonAtout : jouables;
      return source.sort(parPoints(atout)).pop();
    }
    // Pli incertain : on le prend soi-même si c'est peu coûteux.
    if (gagnantes.length && pointsAuTapis >= 10) return plusPetite(gagnantes, atout);
    return plusPetite(jouables, atout);
  }

  if (gagnantes.length) {
    const nonAtout = gagnantes.filter((c) => !isAtout(c, atout));
    // Couper cher n'a de sens que si le pli le mérite.
    if (nonAtout.length) return plusPetite(nonAtout, atout);
    if (dernierAParler || pointsAuTapis >= 7 || TEAM_OF[game.preneur] === TEAM_OF[joueur]) {
      return plusPetite(gagnantes, atout);
    }
    return plusPetite(jouables, atout);
  }

  // Pli perdu : on se défausse au meilleur compte.
  const nonAtout = jouables.filter((c) => !isAtout(c, atout));
  return plusPetite(nonAtout.length ? nonAtout : jouables, atout);
}

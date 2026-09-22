// Règles de la belote classique : cartes jouables, maître du pli, décompte.

import { cardOrder, cardPoints, isAtout } from './cards.js';

export const TEAM_OF = [0, 1, 0, 1]; // Sud/Nord contre Ouest/Est
export const PARTNER_OF = [2, 3, 0, 1];

export function teamOf(player) {
  return TEAM_OF[player];
}

/** Index dans `trick` de la carte maîtresse. */
export function winningIndex(trick, atout) {
  if (!trick.length) return -1;
  const led = trick[0].card.suit;
  const hasAtout = trick.some((t) => isAtout(t.card, atout));
  let best = -1;
  for (let i = 0; i < trick.length; i++) {
    const { card } = trick[i];
    if (hasAtout ? !isAtout(card, atout) : card.suit !== led) continue;
    if (best === -1 || cardOrder(card, atout) > cardOrder(trick[best].card, atout)) best = i;
  }
  return best;
}

export function trickWinner(trick, atout) {
  const i = winningIndex(trick, atout);
  return i === -1 ? null : trick[i].player;
}

export function trickPoints(trick, atout) {
  return trick.reduce((sum, t) => sum + cardPoints(t.card, atout), 0);
}

function highestAtoutOrder(trick, atout) {
  let best = 0;
  for (const t of trick) {
    if (isAtout(t.card, atout)) best = Math.max(best, cardOrder(t.card, atout));
  }
  return best;
}

/**
 * Cartes jouables par `player` compte tenu du pli en cours.
 * Applique l'obligation de fournir, de couper, de surcouper et de monter à l'atout.
 */
export function legalPlays(hand, trick, atout, player) {
  if (!trick.length) return hand.slice();

  const led = trick[0].card.suit;
  const topAtout = highestAtoutOrder(trick, atout);
  const myAtouts = hand.filter((c) => isAtout(c, atout));
  const higher = myAtouts.filter((c) => cardOrder(c, atout) > topAtout);

  if (led === atout) {
    // On fournit l'atout et on monte si possible.
    if (!myAtouts.length) return hand.slice();
    return higher.length ? higher : myAtouts;
  }

  const sameSuit = hand.filter((c) => c.suit === led);
  if (sameSuit.length) return sameSuit;

  // Pas la couleur : le partenaire maître libère de l'obligation de couper.
  const master = trick[winningIndex(trick, atout)].player;
  if (PARTNER_OF[player] === master) return hand.slice();

  if (!myAtouts.length) return hand.slice();
  return higher.length ? higher : myAtouts;
}

export function canPlay(hand, trick, atout, player, card) {
  return legalPlays(hand, trick, atout, player).some(
    (c) => c.suit === card.suit && c.rank === card.rank,
  );
}

/** Le joueur possède-t-il Roi + Dame d'atout (belote / rebelote) ? */
export function hasBelote(hand, atout) {
  return (
    hand.some((c) => c.suit === atout && c.rank === 'R') &&
    hand.some((c) => c.suit === atout && c.rank === 'D')
  );
}

/** La carte déclenche-t-elle l'annonce belote/rebelote ? */
export function isBeloteCard(card, atout) {
  return card.suit === atout && (card.rank === 'R' || card.rank === 'D');
}

export const CAPOT_BONUS = 90; // 162 + 90 = 252
export const DIX_DE_DER = 10;

/**
 * Décompte final d'une donne.
 * @param {{preneur:number, points:number[], plis:number[], belote:number|null, cagnotte:number}} d
 */
export function scoreDeal({ preneur, points, plis, belote, cagnotte = 0 }) {
  const teamPreneur = teamOf(preneur);
  const teamDefense = 1 - teamPreneur;
  const beloteTeam = belote === null ? null : teamOf(belote);

  const brut = [points[0], points[1]];
  const capot = plis[teamPreneur] === 8 ? teamPreneur : plis[teamDefense] === 8 ? teamDefense : null;

  const total = [0, 0];
  const addBelote = (team) => {
    if (beloteTeam === team) total[team] += 20;
  };

  let issue;
  if (capot === teamPreneur) {
    total[teamPreneur] = 162 + CAPOT_BONUS;
    addBelote(teamPreneur);
    addBelote(teamDefense);
    issue = 'capot';
  } else if (capot === teamDefense) {
    total[teamDefense] = 162 + CAPOT_BONUS;
    addBelote(teamPreneur);
    addBelote(teamDefense);
    issue = 'capot-defense';
  } else {
    const avecBelote = [brut[0], brut[1]];
    if (beloteTeam !== null) avecBelote[beloteTeam] += 20;

    if (avecBelote[teamPreneur] > avecBelote[teamDefense]) {
      total[teamPreneur] = avecBelote[teamPreneur];
      total[teamDefense] = avecBelote[teamDefense];
      issue = 'contrat';
    } else if (avecBelote[teamPreneur] === avecBelote[teamDefense]) {
      // Litige : les points du preneur sont mis de côté pour la donne suivante.
      total[teamDefense] = avecBelote[teamDefense];
      issue = 'litige';
    } else {
      total[teamDefense] = 162;
      addBelote(teamDefense);
      addBelote(teamPreneur); // le preneur ne conserve que sa belote
      issue = 'dedans';
    }
  }

  // La cagnotte d'un litige précédent revient à celui qui remporte la donne suivante.
  const gagnant = total[0] >= total[1] ? 0 : 1;
  if (cagnotte > 0 && issue !== 'litige') total[gagnant] += cagnotte;

  return {
    issue,
    total,
    brut,
    cagnotteSuivante: issue === 'litige' ? cagnotte + brut[teamPreneur] + (beloteTeam === teamPreneur ? 20 : 0) : 0,
  };
}

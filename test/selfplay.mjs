// Vérification du moteur par auto-parties : 500 donnes jouées par l'IA.
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { choisirCarte, deciderEnchere } from '../src/ai.js';
import { legalPlays } from '../src/rules.js';

let graine = 12345;
const rng = () => {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
};

const g = new Game({ objectif: 100000, rng });
let donnes = 0;
let redonnes = 0;
const issues = {};

for (let i = 0; i < 60000 && donnes < 500; i++) {
  if (g.phase === 'encheres1' || g.phase === 'encheres2') {
    g.encherir(g.parleur, deciderEnchere(g, g.parleur));
  } else if (g.phase === 'redonne') {
    redonnes++;
    g.nouvelleDonne();
  } else if (g.phase === 'jeu') {
    const j = g.tour;
    assert.equal(g.mains.reduce((s, m) => s + m.length, 0) + g.pli.length, 32 - g.cartesJouees.length + g.pli.length);
    const carte = choisirCarte(g, j);
    assert.ok(legalPlays(g.mains[j], g.pli, g.atout, j).some((c) => c.suit === carte.suit && c.rank === carte.rank), 'carte illégale');
    assert.ok(g.jouer(j, carte), 'coup refusé');
  } else if (g.phase === 'finPli') {
    g.ramasser();
  } else if (g.phase === 'finDonne') {
    const total = g.pointsDonne[0] + g.pointsDonne[1];
    assert.equal(total, 162, `total de la donne = ${total}`);
    assert.equal(g.plisGagnes[0] + g.plisGagnes[1], 8);
    issues[g.resultat.issue] = (issues[g.resultat.issue] || 0) + 1;
    donnes++;
    g.nouvelleDonne();
  } else {
    throw new Error(`phase inattendue : ${g.phase}`);
  }
}

assert.equal(donnes, 500, 'toutes les donnes doivent aboutir');
console.log(`OK — ${donnes} donnes jouées, ${redonnes} redonnes.`);
console.log('Issues :', issues);
console.log('Scores cumulés :', g.scores);

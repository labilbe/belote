// Interface : rendu du tapis, interactions du joueur humain, rythme des adversaires.

import { SUIT_COLOR, SUIT_LABEL, SUIT_SYMBOL, RANK_LABEL } from './cards.js';
import { figureSVG } from './figures.js';
import { Game, PLAYER_NAMES, TEAM_NAMES } from './game.js';
import { choisirCarte, deciderEnchere } from './ai.js';
import { TEAM_OF } from './rules.js';

const DELAIS = { enchere: 650, carte: 750, pli: 1300, redonne: 1200 };
const SIEGES = ['sud', 'ouest', 'nord', 'est'];

const $ = (id) => document.getElementById(id);
let game = new Game();
let attenteJoueur = false;

// ------------------------------------------------------------ Fabrication

function elCarte(carte, { dos = false, sens = 'sud' } = {}) {
  const el = document.createElement('div');
  el.className = `carte carte-${sens}`;
  if (dos) {
    el.classList.add('dos');
    return el;
  }
  el.classList.add(SUIT_COLOR[carte.suit]);
  const figure = figureSVG(carte);
  if (figure) el.classList.add('carte-figure');
  el.innerHTML = `
    <span class="coin haut">${RANK_LABEL[carte.rank]}<i>${SUIT_SYMBOL[carte.suit]}</i></span>
    ${figure || `<span class="pip">${SUIT_SYMBOL[carte.suit]}</span>`}
    <span class="coin bas">${RANK_LABEL[carte.rank]}<i>${SUIT_SYMBOL[carte.suit]}</i></span>`;
  el.setAttribute('aria-label', `${RANK_LABEL[carte.rank]} de ${SUIT_LABEL[carte.suit]}`);
  return el;
}

function bouton(texte, onClick, classe = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `bouton ${classe}`.trim();
  b.textContent = texte;
  b.addEventListener('click', onClick);
  return b;
}

// ----------------------------------------------------------------- Rendu

function rendreMainJoueur() {
  const zone = $('main-0');
  zone.innerHTML = '';
  const jouables = game.phase === 'jeu' && game.tour === 0 ? game.cartesJouables(0) : [];
  const estJouable = (c) => jouables.some((j) => j.suit === c.suit && j.rank === c.rank);

  game.mains[0].forEach((carte) => {
    const el = elCarte(carte);
    if (game.atout && carte.suit === game.atout) el.classList.add('est-atout');
    if (attenteJoueur && estJouable(carte)) {
      el.classList.add('jouable');
      el.tabIndex = 0;
      const jouer = () => tenterJouer(carte);
      el.addEventListener('click', jouer);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          jouer();
        }
      });
    } else if (attenteJoueur) {
      el.classList.add('interdite');
    }
    zone.appendChild(el);
  });
}

function rendreMainsAdverses() {
  for (const p of [1, 2, 3]) {
    const zone = $(`main-${p}`);
    zone.innerHTML = '';
    for (let i = 0; i < game.mains[p].length; i++) {
      zone.appendChild(elCarte(null, { dos: true, sens: SIEGES[p] }));
    }
  }
}

function rendrePli() {
  const zone = $('pli');
  zone.innerHTML = '';
  for (const { player, card } of game.pli) {
    const el = elCarte(card);
    el.classList.add('posee', `posee-${SIEGES[player]}`);
    zone.appendChild(el);
  }
}

function rendreTalon() {
  const enchere = game.phase === 'encheres1' || game.phase === 'encheres2';
  $('talon').hidden = !enchere;
  if (!enchere) return;
  const zone = $('retournee');
  zone.innerHTML = '';
  const el = elCarte(game.retournee);
  if (game.phase === 'encheres2') el.classList.add('fanee');
  zone.appendChild(el);
}

function estSonTour(p) {
  if (game.phase === 'jeu') return game.tour === p;
  if (game.phase === 'encheres1' || game.phase === 'encheres2') return game.parleur === p;
  return false;
}

function rendreEntetes() {
  $('nom-equipe-0').textContent = TEAM_NAMES[0];
  $('nom-equipe-1').textContent = TEAM_NAMES[1];
  $('score-0').textContent = game.scores[0];
  $('score-1').textContent = game.scores[1];
  $('info-donne').textContent = `Donne ${game.manche}`;

  const pastille = $('info-atout');
  if (game.atout) {
    pastille.hidden = false;
    pastille.textContent = `Atout ${SUIT_SYMBOL[game.atout]}`;
    pastille.className = `atout-pastille ${SUIT_COLOR[game.atout]}`;
  } else {
    pastille.hidden = true;
  }

  const contrat = $('info-contrat');
  if (game.preneur !== null && game.phase !== 'finPartie') {
    contrat.textContent = `Preneur : ${PLAYER_NAMES[game.preneur]} — ${game.pointsDonne[0]} / ${game.pointsDonne[1]}`;
  } else {
    contrat.textContent = game.cagnotte ? `Cagnotte : ${game.cagnotte}` : '';
  }

  for (let p = 0; p < 4; p++) {
    const etiq = $(`etiq-${p}`);
    etiq.textContent = PLAYER_NAMES[p];
    etiq.classList.toggle('actif', estSonTour(p));
    etiq.classList.toggle('donneur', p === game.donneur);
    etiq.classList.toggle('preneur', p === game.preneur);
  }
}

function rendreJournal() {
  const zone = $('journal');
  zone.innerHTML = game.journal
    .slice(-9)
    .map((l) => `<p>${l}</p>`)
    .join('');
  zone.scrollTop = zone.scrollHeight;
}

function rendre() {
  rendreEntetes();
  rendreMainJoueur();
  rendreMainsAdverses();
  rendrePli();
  rendreTalon();
  rendreJournal();
}

// ------------------------------------------------------------- Panneaux

function cacherPanneaux() {
  for (const id of ['panneau-encheres', 'panneau-donne', 'panneau-fin']) $(id).hidden = true;
}

function panneauEncheres() {
  const actions = $('encheres-actions');
  actions.innerHTML = '';
  if (game.phase === 'encheres1') {
    const s = game.retournee.suit;
    $('encheres-titre').textContent = `Prenez-vous à ${SUIT_LABEL[s].toLowerCase()} ${SUIT_SYMBOL[s]} ?`;
    actions.appendChild(bouton('Je prends', () => repondreEnchere(s), 'principal'));
  } else {
    $('encheres-titre').textContent = 'Second tour : choisissez une couleur.';
    for (const s of game.couleursSecondTour()) {
      actions.appendChild(
        bouton(`${SUIT_LABEL[s]} ${SUIT_SYMBOL[s]}`, () => repondreEnchere(s), `couleur ${SUIT_COLOR[s]}`),
      );
    }
  }
  actions.appendChild(bouton('Passe', () => repondreEnchere('passe')));
  $('panneau-encheres').hidden = false;
}

function panneauDonne() {
  const r = game.resultat;
  const equipePreneur = TEAM_OF[game.preneur];
  const libelles = {
    contrat: 'Contrat réussi',
    dedans: 'Le preneur est dedans',
    litige: 'Litige, 81 partout',
    capot: 'Capot du preneur !',
    'capot-defense': 'Capot contre le preneur !',
  };
  $('donne-titre').textContent =
    `${libelles[r.issue]} — preneur : ${PLAYER_NAMES[game.preneur]} à ${SUIT_LABEL[game.atout].toLowerCase()} ${SUIT_SYMBOL[game.atout]}`;

  const belote = game.beloteJoueur !== null && game.beloteEtapes === 2 ? PLAYER_NAMES[game.beloteJoueur] : '—';
  const marque = (i) => (i === equipePreneur ? ' (preneur)' : '');
  $('feuille').innerHTML = `
    <tr><th></th><th>${TEAM_NAMES[0]}${marque(0)}</th><th>${TEAM_NAMES[1]}${marque(1)}</th></tr>
    <tr><td>Points des plis</td><td>${r.brut[0]}</td><td>${r.brut[1]}</td></tr>
    <tr><td>Plis remportés</td><td>${game.plisGagnes[0]}</td><td>${game.plisGagnes[1]}</td></tr>
    <tr class="ligne-forte"><td>Marqué</td><td>${r.total[0]}</td><td>${r.total[1]}</td></tr>
    <tr><td>Total</td><td>${game.scores[0]}</td><td>${game.scores[1]}</td></tr>
    <tr><td>Belote</td><td colspan="2">${belote}</td></tr>
    ${game.cagnotte ? `<tr><td>Cagnotte</td><td colspan="2">${game.cagnotte} points en attente</td></tr>` : ''}`;
  $('panneau-donne').hidden = false;
}

function panneauFin() {
  $('fin-titre').textContent = `${TEAM_NAMES[game.vainqueur]} remporte la partie !`;
  $('fin-detail').textContent = `Score final : ${game.scores[0]} — ${game.scores[1]} en ${game.manche} donnes.`;
  $('panneau-fin').hidden = false;
}

// --------------------------------------------------------------- Boucle

function repondreEnchere(choix) {
  cacherPanneaux();
  game.encherir(0, choix);
  boucle();
}

function tenterJouer(carte) {
  if (!attenteJoueur) return;
  if (!game.jouer(0, carte)) return;
  attenteJoueur = false;
  boucle();
}

function plusTard(fn, delai) {
  setTimeout(() => {
    fn();
    boucle();
  }, delai);
}

function boucle() {
  attenteJoueur = game.phase === 'jeu' && game.tour === 0;
  cacherPanneaux();
  rendre();

  switch (game.phase) {
    case 'encheres1':
    case 'encheres2':
      if (game.parleur === 0) panneauEncheres();
      else plusTard(() => game.encherir(game.parleur, deciderEnchere(game, game.parleur)), DELAIS.enchere);
      break;
    case 'redonne':
      plusTard(() => game.nouvelleDonne(), DELAIS.redonne);
      break;
    case 'jeu':
      if (game.tour !== 0) plusTard(() => game.jouer(game.tour, choisirCarte(game, game.tour)), DELAIS.carte);
      break;
    case 'finPli':
      plusTard(() => game.ramasser(), DELAIS.pli);
      break;
    case 'finDonne':
      panneauDonne();
      break;
    case 'finPartie':
      panneauFin();
      break;
  }
}

$('btn-suivante').addEventListener('click', () => {
  game.nouvelleDonne();
  boucle();
});
$('btn-rejouer').addEventListener('click', () => {
  game = new Game();
  boucle();
});
$('btn-regles').addEventListener('click', () => $('dlg-regles').showModal());
$('btn-fermer-regles').addEventListener('click', () => $('dlg-regles').close());

boucle();

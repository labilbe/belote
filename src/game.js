// Moteur de partie : distribution, enchères, déroulement des plis, scores.

import { newDeck, shuffle, sortHand, SUITS, SUIT_LABEL, SUIT_SYMBOL } from './cards.js';
import {
  DIX_DE_DER, PARTNER_OF, TEAM_OF, hasBelote, isBeloteCard, legalPlays,
  scoreDeal, trickPoints, trickWinner,
} from './rules.js';

export const PLAYER_NAMES = ['Vous', 'Ouest', 'Nord', 'Est'];
export const TEAM_NAMES = ['Vous & Nord', 'Ouest & Est'];

const sujet = (j) => (j === 0 ? `Vous` : PLAYER_NAMES[j]);
const accorde = (j, sing, vous) => `${sujet(j)} ${j === 0 ? vous : sing}`;
const nomCouleur = (c) => `${SUIT_LABEL[c].toLowerCase()} ${SUIT_SYMBOL[c]}`;

export class Game {
  constructor({ objectif = 1000, rng = Math.random } = {}) {
    this.objectif = objectif;
    this.rng = rng;
    this.scores = [0, 0];
    this.cagnotte = 0;
    this.donneur = Math.floor(rng() * 4);
    this.manche = 0;
    this.journal = [];
    this.nouvelleDonne();
  }

  log(texte) {
    this.journal.push(texte);
    if (this.journal.length > 60) this.journal.shift();
  }

  nouvelleDonne() {
    this.manche += 1;
    this.donneur = (this.donneur + 1) % 4;
    const deck = shuffle(newDeck(), this.rng);
    this.talon = deck;
    this.mains = [[], [], [], []];
    // Distribution 3 puis 2, en commençant à gauche du donneur.
    for (const paquet of [3, 2]) {
      for (let i = 1; i <= 4; i++) {
        const p = (this.donneur + i) % 4;
        this.mains[p].push(...this.talon.splice(0, paquet));
      }
    }
    this.retournee = this.talon.shift();

    this.phase = 'encheres1';
    this.parleur = (this.donneur + 1) % 4;
    this.passes = 0;
    this.preneur = null;
    this.atout = null;
    this.pli = [];
    this.plisGagnes = [0, 0];
    this.pointsDonne = [0, 0];
    this.dernierPli = null;
    this.beloteJoueur = null;
    this.beloteEtapes = 0;
    this.cartesJouees = [];
    this.resultat = null;
    this.trier();
    this.log(`— Donne ${this.manche} — donneur : ${PLAYER_NAMES[this.donneur]}`);
  }

  trier() {
    this.mains = this.mains.map((m) => sortHand(m, this.atout));
  }

  /** Couleurs proposables au second tour (toutes sauf celle de la retournée). */
  couleursSecondTour() {
    return SUITS.filter((s) => s !== this.retournee.suit);
  }

  encherir(joueur, choix) {
    if (this.phase !== 'encheres1' && this.phase !== 'encheres2') return false;
    if (joueur !== this.parleur) return false;

    if (choix === 'passe') {
      this.log(`${accorde(joueur, 'passe', 'passez')}.`);
      this.passes += 1;
      this.parleur = (this.parleur + 1) % 4;
      if (this.passes === 4) {
        if (this.phase === 'encheres1') {
          this.phase = 'encheres2';
          this.passes = 0;
          this.parleur = (this.donneur + 1) % 4;
          this.log('Second tour : chacun peut nommer une autre couleur.');
        } else {
          this.log('Personne ne prend : on redonne.');
          this.phase = 'redonne';
        }
      }
      return true;
    }

    const couleur = this.phase === 'encheres1' ? this.retournee.suit : choix;
    if (this.phase === 'encheres2' && couleur === this.retournee.suit) return false;
    this.preneur = joueur;
    this.atout = couleur;
    this.log(`${accorde(joueur, 'prend', 'prenez')} à ${nomCouleur(couleur)}.`);
    this.completerDistribution();
    return true;
  }

  completerDistribution() {
    this.mains[this.preneur].push(this.retournee);
    for (let i = 1; i <= 4; i++) {
      const p = (this.donneur + i) % 4;
      const n = p === this.preneur ? 2 : 3;
      this.mains[p].push(...this.talon.splice(0, n));
    }
    this.trier();
    this.beloteJoueur = [0, 1, 2, 3].find((p) => hasBelote(this.mains[p], this.atout)) ?? null;
    this.phase = 'jeu';
    this.tour = (this.donneur + 1) % 4;
    this.pli = [];
  }

  cartesJouables(joueur) {
    return legalPlays(this.mains[joueur], this.pli, this.atout, joueur);
  }

  jouer(joueur, carte) {
    if (this.phase !== 'jeu' || joueur !== this.tour) return false;
    const jouables = this.cartesJouables(joueur);
    const choisie = jouables.find((c) => c.suit === carte.suit && c.rank === carte.rank);
    if (!choisie) return false;

    this.mains[joueur] = this.mains[joueur].filter((c) => c !== choisie);
    this.pli.push({ player: joueur, card: choisie });
    this.cartesJouees.push(choisie);

    if (joueur === this.beloteJoueur && isBeloteCard(choisie, this.atout)) {
      this.beloteEtapes += 1;
      this.log(`${PLAYER_NAMES[joueur]} : ${this.beloteEtapes === 1 ? 'Belote !' : 'Rebelote !'}`);
    }

    if (this.pli.length === 4) {
      this.phase = 'finPli';
    } else {
      this.tour = (this.tour + 1) % 4;
    }
    return true;
  }

  /** Ramasse le pli terminé ; à appeler après la pause d'affichage. */
  ramasser() {
    if (this.phase !== 'finPli') return null;
    const gagnant = trickWinner(this.pli, this.atout);
    const equipe = TEAM_OF[gagnant];
    const dernier = this.mains.every((m) => m.length === 0);
    const pts = trickPoints(this.pli, this.atout) + (dernier ? DIX_DE_DER : 0);

    this.pointsDonne[equipe] += pts;
    this.plisGagnes[equipe] += 1;
    this.dernierPli = { cartes: this.pli, gagnant, points: pts };
    this.log(`${accorde(gagnant, 'remporte', 'remportez')} le pli (${pts} pts).`);
    this.pli = [];
    this.tour = gagnant;

    if (dernier) this.terminerDonne();
    else this.phase = 'jeu';
    return { gagnant, points: pts };
  }

  terminerDonne() {
    const beloteValide = this.beloteJoueur !== null && this.beloteEtapes === 2 ? this.beloteJoueur : null;
    const r = scoreDeal({
      preneur: this.preneur,
      points: this.pointsDonne,
      plis: this.plisGagnes,
      belote: beloteValide,
      cagnotte: this.cagnotte,
    });
    this.scores[0] += r.total[0];
    this.scores[1] += r.total[1];
    this.cagnotte = r.cagnotteSuivante;
    this.resultat = r;
    this.phase = 'finDonne';

    const messages = {
      contrat: `Contrat réussi par ${TEAM_NAMES[TEAM_OF[this.preneur]]}.`,
      dedans: `${TEAM_NAMES[TEAM_OF[this.preneur]]} est dedans !`,
      litige: 'Litige : 81 partout, les points du preneur sont mis en cagnotte.',
      capot: `Capot de ${TEAM_NAMES[TEAM_OF[this.preneur]]} !`,
      'capot-defense': `Capot contre le preneur : ${TEAM_NAMES[1 - TEAM_OF[this.preneur]]} rafle tout !`,
    };
    this.log(messages[r.issue]);
    this.log(`Score : ${TEAM_NAMES[0]} ${this.scores[0]} — ${TEAM_NAMES[1]} ${this.scores[1]}`);

    if (Math.max(...this.scores) >= this.objectif && this.scores[0] !== this.scores[1]) {
      this.phase = 'finPartie';
      this.vainqueur = this.scores[0] > this.scores[1] ? 0 : 1;
      this.log(`Partie terminée : ${TEAM_NAMES[this.vainqueur]} l'emporte.`);
    }
  }

  partenaire(joueur) {
    return PARTNER_OF[joueur];
  }
}

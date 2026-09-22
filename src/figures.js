// Illustrations des figures (valet, dame, roi), dessinées en SVG inline.
// La couleur de l'enseigne est héritée via `currentColor`.

import { SUIT_SYMBOL } from './cards.js';

const PEAU = '#f7e3cf';
const TRAIT = 'rgba(0, 0, 0, 0.6)';

const visage = (cy, rx = 8, ry = 8.5) => `
  <ellipse cx="24" cy="${cy}" rx="${rx}" ry="${ry}" fill="${PEAU}" stroke="${TRAIT}" stroke-width="1"/>
  <circle cx="${24 - rx * 0.36}" cy="${cy - 1}" r="1.15" fill="${TRAIT}"/>
  <circle cx="${24 + rx * 0.36}" cy="${cy - 1}" r="1.15" fill="${TRAIT}"/>
  <path d="M${24 - 2.6} ${cy + 4} q2.6 2.2 5.2 0" fill="none" stroke="${TRAIT}" stroke-width="1" stroke-linecap="round"/>`;

const buste = (haut) => `
  <path d="M5 68 V${haut} q19 -10 38 0 V68 Z" fill="currentColor"/>`;

const embleme = (suit) => `
  <text x="24" y="65" text-anchor="middle" font-size="9" font-weight="700" fill="#fdfbf5">${SUIT_SYMBOL[suit]}</text>`;

const roi = (suit) => `
  <path d="M11 24 V13 l6.5 5.5 L24 8 l6.5 10.5 L37 13 v11 Z" fill="currentColor"/>
  <rect x="9.5" y="23.5" width="29" height="4.5" rx="2" fill="currentColor"/>
  <circle cx="24" cy="5.5" r="2.4" fill="currentColor"/>
  ${visage(36)}
  <path d="M17 39.5 q7 4.5 14 0 q-1 10.5 -7 10.5 T17 39.5 Z" fill="currentColor"/>
  <path d="M19.5 38.5 q4.5 2.5 9 0" fill="none" stroke="${TRAIT}" stroke-width="1" stroke-linecap="round"/>
  ${buste(55)}
  <path d="M24 49 l4.5 5 -4.5 6 -4.5 -6 Z" fill="#fdfbf5"/>
  ${embleme(suit)}`;

const dame = (suit) => `
  <path d="M12.5 25 L14.5 14 L20 20 L24 10 L28 20 L33.5 14 L35.5 25 Z" fill="currentColor"/>
  <circle cx="24" cy="7.5" r="2" fill="currentColor"/>
  <path d="M13 31 q0 -9 11 -9 t11 9 v12 q-2.5 4 -5 1.5 V33 q-6 3 -12 0 v10.5 Q15.5 47 13 43 Z" fill="currentColor"/>
  ${visage(35, 7.5, 8)}
  ${buste(56)}
  <path d="M24 50 q5 3 5 6 h-10 q0 -3 5 -6 Z" fill="#fdfbf5"/>
  ${embleme(suit)}`;

const valet = (suit) => `
  <path d="M35 17 q9 -7 10.5 -13 Q37 5 32.5 13 Z" fill="currentColor" opacity="0.65"/>
  <path d="M11 26 q0.5 -13 13 -13 t13 13 Z" fill="currentColor"/>
  <rect x="9.5" y="25" width="29" height="4" rx="2" fill="currentColor"/>
  ${visage(36, 7.5, 8)}
  <path d="M16 42 q8 5 16 0 l2 5 q-10 5 -20 0 Z" fill="#fdfbf5" stroke="${TRAIT}" stroke-width="0.8"/>
  ${buste(56)}
  ${embleme(suit)}`;

const FIGURES = { R: roi, D: dame, V: valet };

/** Renvoie le SVG de la figure, ou null si la carte n'en est pas une. */
export function figureSVG(carte) {
  const dessin = FIGURES[carte.rank];
  if (!dessin) return null;
  return `<svg class="figure" viewBox="0 0 48 68" aria-hidden="true">${dessin(carte.suit)}</svg>`;
}

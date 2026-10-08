// Geometria parametrica della nave (pura matematica, nessuna dipendenza da three.js).
// La usano sia il modello 3D sia i piani ponte, così le due viste coincidono sempre.

import { SHIP, deckY } from '../data/world-europa.js';

export const LH = SHIP.length / 2; // semi-lunghezza: la prua estrema è a +LH
export const BH = SHIP.beam / 2; // semi-larghezza massima
export const Y_KEEL = -SHIP.draft;
export const X_TRANSOM = -LH + 2.0; // specchio di poppa
export const BALCONY = 1.4; // profondità dei balconi
export const CANYON_HALF = 8.5; // semi-larghezza della World Promenade (filo ringhiere)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

function interp(table, y) {
  if (y <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [y1, x1] = table[i];
    const [y0, x0] = table[i - 1];
    if (y <= y1) return lerp(x0, x1, (y - y0) / (y1 - y0));
  }
  return table[table.length - 1][1];
}

// Profilo della ruota di prua (senza bulbo): x della prua alla quota y.
const STEM = [
  [-9, 147],
  [-5, 154],
  [0, 158.2],
  [8, 161.2],
  [19, 164.8],
  [26, 166],
];
export const stemX = (y) => interp(STEM, y);

// Chiglia: piatta, risale verso poppa (zona eliche/pod).
export function bottomY(x) {
  if (x > -118) return Y_KEEL;
  const t = clamp((-118 - x) / (-118 - X_TRANSOM), 0, 1);
  return Y_KEEL + Math.pow(t, 1.5) * 7.4;
}

// Cinta dello scafo: ponte 8 a poppa, ponte 7 a centro nave (zona scialuppe), ponte 9 a prua.
export function hullTop(x) {
  const y7 = deckY(7);
  const y8 = deckY(8);
  const y9 = deckY(9);
  if (x < -55) return y8;
  if (x < -50) return lerp(y8, y7, smooth((x + 55) / 5));
  if (x < 106) return y7;
  if (x < 112) return lerp(y7, y9, smooth((x - 106) / 6));
  return y9 + Math.max(0, x - 140) * 0.035;
}

function hullBody(x, y) {
  const yb = bottomY(x);
  if (y < yb - 1e-6) return 0;
  let b = BH;

  // Avviamento di prua: più fine in basso, più pieno (svasato) in alto.
  const xs = 82;
  const xe = stemX(y);
  if (x > xs) {
    if (x >= xe) return 0;
    const t = (x - xs) / (xe - xs);
    const p = 1.8 + 0.055 * (y - Y_KEEL);
    b = BH * Math.pow(1 - Math.pow(t, p), 0.62);
  }

  // Poppa: leggero restringimento, più marcato sotto la linea d'acqua.
  if (x < -140) {
    const t = clamp((-140 - x) / (-140 - X_TRANSOM), 0, 1);
    b *= 1 - t * t * (0.05 + 0.12 * clamp(-y / 9, 0, 1));
  }

  // Ginocchio (raggio di sentina).
  const R = 3.0;
  const yc = yb + R;
  if (y < yc) {
    const d = yc - y;
    b = b - R + Math.sqrt(Math.max(0, R * R - d * d));
  }
  return Math.max(0, b);
}

function bulb(x, y) {
  if (x < 140) return 0;
  const cx = 157.5;
  const ax = LH - cx;
  const u = x < cx ? 0 : (x - cx) / ax;
  const v = (y + 4.6) / 2.9;
  const s = 1 - u * u - v * v;
  return s > 0 ? 3.3 * Math.sqrt(s) : 0;
}

// Semi-larghezza dello scafo alla sezione x e quota y.
export const halfBreadth = (x, y) => Math.max(hullBody(x, y), bulb(x, y));

// ---------------------------------------------------------------------------
// Sovrastrutture. Ogni blocco ha estensione in x, quote y e un'impronta in pianta:
// half(x) per blocchi simmetrici, oppure inner/outer + side per le ali.
// Le misure sono al filo parete; i balconi sporgono di BALCONY.

const W = BH - BALCONY; // filo parete delle facciate con balconi

const frontEllipse = (xa, tip, half) => (x) => {
  if (x <= xa) return half;
  const t = (x - xa) / (tip - xa);
  return t >= 1 ? 0 : half * Math.sqrt(1 - t * t);
};

const armOuter = (x) => Math.min(W, halfBreadth(x, deckY(8)) - BALCONY);

export const STRUCTURES = [
  {
    id: 'recess', label: 'Ponti 7-8, zona scialuppe',
    x: [-55, 113], y: [deckY(7), deckY(9)], half: () => 20.0, facade: 'public',
  },
  {
    id: 'armS', side: 1, label: 'Ala di dritta',
    x: [-161, -55], y: [deckY(8), deckY(18)],
    inner: () => CANYON_HALF + BALCONY, outer: armOuter,
    facade: 'balcony', balconyOuter: true, balconyInner: true,
  },
  {
    id: 'armP', side: -1, label: 'Ala di babordo',
    x: [-161, -55], y: [deckY(8), deckY(18)],
    inner: () => CANYON_HALF + BALCONY, outer: armOuter,
    facade: 'balcony', balconyOuter: true, balconyInner: true,
  },
  {
    id: 'blockA', label: 'Blocco cabine',
    x: [-55, 126], y: [deckY(9), deckY(18)], half: frontEllipse(96, 126, W),
    facade: 'balcony', balconyOuter: true, straight: [-55, 96],
  },
  {
    id: 'upperAft', label: 'Buffet, kids club, palestra',
    x: [-55, -5], y: [deckY(18), deckY(22)], half: () => 20.0, facade: 'public',
  },
  {
    id: 'wingS', side: 1, label: 'Terrazze piscina (dritta)',
    x: [-5, 55], y: [deckY(18), deckY(20)], inner: () => 16.5, outer: () => W,
    facade: 'balcony', balconyOuter: true,
  },
  {
    id: 'wingP', side: -1, label: 'Terrazze piscina (babordo)',
    x: [-5, 55], y: [deckY(18), deckY(20)], inner: () => 16.5, outer: () => W,
    facade: 'balcony', balconyOuter: true,
  },
  { id: 'yc18', label: 'Yacht Club', x: [55, 121], y: [deckY(18), deckY(19)], half: frontEllipse(88, 121, 20.5), facade: 'glass' },
  { id: 'yc19', label: 'Yacht Club', x: [55, 118], y: [deckY(19), deckY(20)], half: frontEllipse(88, 118, 20.5), facade: 'glass' },
  { id: 'yc20', label: 'Yacht Club', x: [57, 114], y: [deckY(20), deckY(21)], half: frontEllipse(86, 114, 20.0), facade: 'glass' },
  { id: 'yc21', label: 'Yacht Club', x: [60, 109], y: [deckY(21), deckY(22)], half: frontEllipse(84, 109, 19.0), facade: 'glass' },
];

// Intervalli [zmin, zmax] occupati da una struttura alla sezione x (filo parete o filo balconi).
export function footprintAt(s, x, withBalconies = false) {
  if (x < s.x[0] || x > s.x[1]) return [];
  if (s.half) {
    const h = s.half(x) + (withBalconies && s.balconyOuter && (!s.straight || x <= s.straight[1]) ? BALCONY : 0);
    return h > 0.01 ? [[-h, h]] : [];
  }
  const inner = s.inner(x) - (withBalconies && s.balconyInner ? BALCONY : 0);
  const outer = s.outer(x) + (withBalconies && s.balconyOuter ? BALCONY : 0);
  return s.side > 0 ? [[inner, outer]] : [[-outer, -inner]];
}

// Poligono chiuso (in pianta x,z) di una struttura.
export function outlinePolygon(s, step = 1.5, withBalconies = false) {
  const xs = sampleRange(s.x[0], s.x[1], step);
  const lo = [];
  const hi = [];
  for (const x of xs) {
    const f = footprintAt(s, x, withBalconies)[0];
    if (!f) continue;
    lo.push([x, f[0]]);
    hi.push([x, f[1]]);
  }
  return lo.concat(hi.reverse());
}

// Impronta dello scafo alla quota y (solo dove lo scafo arriva almeno a quella quota).
export function hullOutlineAt(y, step = 1.5) {
  const xs = sampleRange(X_TRANSOM, LH, step);
  const top = [];
  for (const x of xs) {
    if (hullTop(x) < y - 0.05) continue;
    const b = halfBreadth(x, y);
    if (b > 0.05) top.push([x, b]);
  }
  if (!top.length) return [];
  // Spezza in tratti contigui.
  const parts = [];
  let cur = [top[0]];
  for (let i = 1; i < top.length; i++) {
    if (top[i][0] - top[i - 1][0] > step * 1.5) {
      parts.push(cur);
      cur = [];
    }
    cur.push(top[i]);
  }
  parts.push(cur);
  return parts.map((p) => p.map(([x, b]) => [x, -b]).concat(p.slice().reverse().map(([x, b]) => [x, b])));
}

export function sampleRange(a, b, step) {
  const n = Math.max(2, Math.ceil((b - a) / step) + 1);
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

// Strutture presenti a un ponte: chiuse (il ponte è al loro interno) o scoperte (il ponte è il loro tetto).
export function structuresAtDeck(y) {
  return STRUCTURES.filter((s) => (y >= s.y[0] - 0.05 && y < s.y[1] - 0.05) || Math.abs(s.y[1] - y) < 0.05);
}

// ---------------------------------------------------------------------------
// Elementi caratteristici.

export const LIFEBOATS = Array.from({ length: 12 }, (_, i) => -44 + i * 12.6);

export const SPIRAL = { x: -68, z: 0, radius: 5.2, yTop: deckY(22) + 3.2, yBottom: deckY(8) + 1.0, turns: 8.5 };

export const FUNNEL = { x0: -42, x1: -18, halfWidth: 4.6, base: deckY(22), height: 12.5 };

export const POOLS = [
  { id: 'botanic', x: [1, 15], z: [-5.5, 5.5], y: deckY(18) },
  { id: 'plage', x: [28, 47], z: [-7.5, 7.5], y: deckY(18) },
  { id: 'zenS', x: [-152, -138], z: [12.5, 19.5], y: deckY(18) },
  { id: 'zenP', x: [-152, -138], z: [-19.5, -12.5], y: deckY(18) },
  { id: 'yc', x: [88, 97], z: [-4, 4], y: deckY(22) },
  { id: 'aqua', x: [4, 22], z: [17.5, 21.2], y: deckY(20) },
];

export const JACUZZIS = [
  [51, 10, deckY(18)], [51, -10, deckY(18)], [23, 10.5, deckY(18)], [23, -10.5, deckY(18)],
  [-121, 18.5, deckY(18)], [-121, -18.5, deckY(18)], [100, 6, deckY(22)], [100, -6, deckY(22)],
];

export const BOTANIC_ROOF = { x: [-5, 22], half: 16.5, spring: deckY(20), crown: deckY(20) + 4.4 };

// Piani ponte in SVG, generati dalla stessa geometria del modello 3D (proporzioni reali).
import { DECKS, ZONES, TOUR_NODES } from '../data/world-europa.js';
import { hullOutlineAt, structuresAtDeck, outlinePolygon, LH } from '../ship/geometry.js';

export const ZONE_COLORS = {
  public: ['#2f6c9e', 'Spazi comuni'],
  dining: ['#9a6a35', 'Ristoranti'],
  bar: ['#7a4f9e', 'Bar e lounge'],
  pool: ['#1f9fcf', 'Piscine e acqua'],
  cabins: ['#29507a', 'Cabine'],
  crew: ['#46525f', 'Equipaggio'],
  outdoor: ['#3b7a57', 'All’aperto'],
  yc: ['#a8842f', 'MSC Yacht Club'],
};

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const pts = (poly) => poly.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`).join(' ');

export function deckPolygons(n) {
  const d = DECKS.find((k) => k.n === n);
  return [...hullOutlineAt(d.y), ...structuresAtDeck(d.y).map((s) => outlinePolygon(s, 1.5, true))];
}

/**
 * Disegna il ponte n. Opzioni:
 * - zones: mostra le aree (con numero e nome dove c'è spazio)
 * - nodes: punti del tour cliccabili; current: id del nodo attuale; yaw: direzione di vista
 * - onNode(id): callback al click su un nodo; zoneHref(zone): link per le aree con tour
 */
export function deckPlanSVG(n, { zones = true, labels = true, nodes = true, current = null, yaw = 0, onNode, zoneHref } = {}) {
  const svg = el('svg', { viewBox: `${-LH - 6} -30 ${2 * LH + 12} 60`, class: 'plan-svg', role: 'img' });
  const d = DECKS.find((k) => k.n === n);
  el('title', {}, svg).textContent = `Pianta del ponte ${n} (${d.city}): prua a destra`;

  const polys = deckPolygons(n);
  const gOutline = el('g', { fill: 'none', stroke: '#6f86a6', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, svg);
  const gFill = el('g', { fill: '#13294a' }, svg);
  for (const p of polys) {
    el('polygon', { points: pts(p) }, gOutline);
    el('polygon', { points: pts(p) }, gFill);
  }

  const legend = [];
  if (zones) {
    const g = el('g', {}, svg);
    (ZONES[n] || []).forEach((z) => {
      const [x0, x1] = z.x;
      const [z0, z1] = z.z;
      const href = zoneHref?.(z);
      const parent = href ? el('a', { href, 'aria-label': `${z.name}: apri il tour 360°` }, g) : g;
      el('rect', { x: x0, y: z0, width: x1 - x0, height: z1 - z0, rx: 1.2, fill: ZONE_COLORS[z.kind][0], 'fill-opacity': 0.85, stroke: '#0a1a2f', 'stroke-width': 0.4 }, parent);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      if (!labels) return;
      const num = legend.length + 1;
      legend.push({ num, ...z, href });
      el('circle', { cx, cy: cz, r: 3.3, fill: '#0a1a2f', stroke: '#ffffff', 'stroke-width': 0.4 }, parent);
      const t = el('text', { x: cx, y: cz + 1.3, 'text-anchor': 'middle', 'font-size': 3.6, 'font-weight': 700, fill: '#f2b544', 'font-family': 'JetBrains Mono, monospace' }, parent);
      t.textContent = num;
    });
  }

  const dir = el('g', { 'font-family': 'JetBrains Mono, monospace', 'font-size': 3.6, fill: '#b8c4d6' }, svg);
  el('text', { x: LH + 4, y: -26, 'text-anchor': 'end' }, dir).textContent = 'PRUA →';
  el('text', { x: -LH - 4, y: -26 }, dir).textContent = '← POPPA';

  if (nodes) {
    const g = el('g', {}, svg);
    for (const node of TOUR_NODES.filter((k) => k.deck === n)) {
      const [x, z] = node.pos;
      const isCur = node.id === current;
      if (isCur) {
        const a = yaw;
        const r = 16;
        const s = 0.5;
        const p1 = [x + r * Math.cos(a - s), z + r * Math.sin(a - s)];
        const p2 = [x + r * Math.cos(a + s), z + r * Math.sin(a + s)];
        el('path', { d: `M${x},${z} L${p1[0]},${p1[1]} A${r},${r} 0 0 1 ${p2[0]},${p2[1]} Z`, fill: '#f2b544', 'fill-opacity': 0.35, class: 'view-cone' }, g);
      }
      const btn = el('a', { href: `tour.html#${node.id}`, 'aria-label': isCur ? `Sei qui: ${node.name}` : `Vai a ${node.name}` }, g);
      if (onNode) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          onNode(node.id);
        });
      }
      el('circle', { cx: x, cy: z, r: 5, fill: 'transparent' }, btn);
      el('circle', { cx: x, cy: z, r: isCur ? 2.6 : 1.9, fill: isCur ? '#f2b544' : '#ffffff', stroke: isCur ? '#ffffff' : '#0a1a2f', 'stroke-width': 0.7 }, btn);
    }
  }
  return { svg, legend };
}

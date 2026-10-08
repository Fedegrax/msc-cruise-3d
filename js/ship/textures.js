// Texture generate al volo su canvas: niente immagini da scaricare, risoluzione controllata.
import * as THREE from 'three';
import { SHIP, deckY } from '../data/world-europa.js';
import { LH, Y_KEEL } from './geometry.js';

export const HULL_TEX_TOP = 21; // quota (m) che corrisponde al bordo alto della texture dello scafo

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { srgb = true, repeat = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// Scafo: bianco, fascia blu al galleggiamento, antivegetativa, file di finestre per ponte.
export function hullTextures() {
  const W = 8192;
  const H = 1024;
  const [c, g] = canvas(W, H);
  const [rc, rg] = canvas(W / 4, H / 4);
  const px = (x) => ((x + LH) / SHIP.length) * W;
  const py = (y) => (1 - (y - Y_KEEL) / (HULL_TEX_TOP - Y_KEEL)) * H;

  g.fillStyle = '#f2f4f6';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#7a2c27';
  g.fillRect(0, py(-0.9), W, H);
  g.fillStyle = '#132a48';
  g.fillRect(0, py(0.45), W, py(-0.9) - py(0.45));

  const row = (x0, x1, y0, y1, pitch, width, color = '#22364d', radius = 0) => {
    g.fillStyle = color;
    for (let x = x0; x <= x1 - width; x += pitch) {
      const X = px(x);
      const Y = py(y1);
      const w = px(x + width) - X;
      const h = py(y0) - Y;
      if (radius) {
        g.beginPath();
        g.roundRect(X, Y, w, h, radius);
        g.fill();
      } else g.fillRect(X, Y, w, h);
    }
  };

  // Ponte 3-4: oblò equipaggio. Ponte 5: finestre cabine. Ponti 6-7: sale pubbliche.
  row(-130, 125, deckY(5) - 4.4, deckY(5) - 3.8, 3.0, 0.6, '#2a3d52', 4);
  row(-150, 132, deckY(5) - 1.6, deckY(5) - 0.9, 3.6, 1.0, '#2a3d52', 3);
  row(-104, 140, deckY(5) + 1.1, deckY(5) + 2.1, 3.6, 1.5, '#25384e', 3);
  row(-160, -112, deckY(5) + 0.8, deckY(5) + 2.5, 3.5, 3.0);
  row(-161, -58, deckY(6) + 0.7, deckY(6) + 2.6, 3.5, 3.0);
  row(22, 92, deckY(6) + 0.7, deckY(6) + 2.6, 3.5, 3.0);
  row(-161, -58, deckY(7) + 0.7, deckY(7) + 2.6, 3.5, 3.0);
  row(113, 150, deckY(7) + 1.2, deckY(7) + 2.0, 3.0, 1.0, '#2a3d52', 3);
  row(113, 145, deckY(8) + 1.2, deckY(8) + 2.0, 3.0, 1.0, '#2a3d52', 3);

  // Occhi di cubia (ancore) e portelloni.
  g.fillStyle = '#3a4047';
  g.beginPath();
  g.ellipse(px(149.5), py(10.5), px(151.2) - px(149.5), (py(9.4) - py(11.6)) / 2, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#c9d0d7';
  g.lineWidth = 2;
  for (const x of [-120, -40, 30, 100]) g.strokeRect(px(x), py(deckY(5) - 0.4), px(x + 4) - px(x), py(deckY(5) - 2.8) - py(deckY(5) - 0.4));

  // Rugosità/metallicità (G/B): vetri lucidi, vernice satinata.
  rg.drawImage(c, 0, 0, W / 4, H / 4);
  const img = rg.getImageData(0, 0, W / 4, H / 4);
  for (let i = 0; i < img.data.length; i += 4) {
    const dark = img.data[i] < 80 && img.data[i + 2] > img.data[i];
    img.data[i] = 0;
    img.data[i + 1] = dark ? 40 : 150;
    img.data[i + 2] = dark ? 120 : 0;
    img.data[i + 3] = 255;
  }
  rg.putImageData(img, 0, 0);

  return { map: toTexture(c), rm: toTexture(rc, { srgb: false }) };
}

// Specchio di poppa: Panorama Lounge (ponti 6-7) e ristorante (ponte 5) con vetrate verso la scia.
export function transomTexture() {
  const W = 1024;
  const H = 512;
  const [c, g] = canvas(W, H);
  const px = (z) => ((z + 24) / 48) * W;
  const py = (y) => (1 - (y - Y_KEEL) / (HULL_TEX_TOP - Y_KEEL)) * H;
  g.fillStyle = '#f2f4f6';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#7a2c27';
  g.fillRect(0, py(-0.9), W, H);
  g.fillStyle = '#132a48';
  g.fillRect(0, py(0.45), W, py(-0.9) - py(0.45));
  const band = (y0, y1, pitch, width) => {
    for (let z = -20; z <= 20 - width + 0.01; z += pitch) {
      const grd = g.createLinearGradient(0, py(y1), 0, py(y0));
      grd.addColorStop(0, '#34506d');
      grd.addColorStop(1, '#1b2b3e');
      g.fillStyle = grd;
      g.fillRect(px(z), py(y1), px(z + width) - px(z), py(y0) - py(y1));
    }
  };
  band(deckY(5) + 0.8, deckY(5) + 2.5, 3.2, 2.8);
  band(deckY(6) + 0.5, deckY(6) + 2.8, 2.5, 2.35);
  band(deckY(7) + 0.5, deckY(7) + 2.8, 2.5, 2.35);
  return toTexture(c);
}

// Facciate: un modulo che si ripete (UV in metri, impostate dal chiamante).
const FACADES = {
  // Una cabina con balcone: 3.6 m x 2.9 m.
  balcony: { w: 3.6, h: 2.9, draw(g, s) {
    g.fillStyle = '#eef1f4';
    g.fillRect(0, 0, 3.6 * s, 2.9 * s);
    const grd = g.createLinearGradient(0, 0.2 * s, 0, 2.35 * s);
    grd.addColorStop(0, '#2f4762');
    grd.addColorStop(1, '#1b2b3e');
    g.fillStyle = grd;
    g.fillRect(0.4 * s, 0.25 * s, 2.8 * s, 2.25 * s);
    g.fillStyle = '#dfe5ea';
    g.fillRect(1.78 * s, 0.25 * s, 0.06 * s, 2.25 * s);
    g.fillStyle = '#c8d0d8';
    g.fillRect(0, 2.62 * s, 3.6 * s, 0.28 * s);
  } },
  // Sale pubbliche: vetrate continue 6 m x 3.2 m.
  public: { w: 6, h: 3.2, draw(g, s) {
    g.fillStyle = '#eef1f4';
    g.fillRect(0, 0, 6 * s, 3.2 * s);
    const grd = g.createLinearGradient(0, 0.3 * s, 0, 2.7 * s);
    grd.addColorStop(0, '#34506d');
    grd.addColorStop(1, '#1d2f44');
    g.fillStyle = grd;
    g.fillRect(0, 0.45 * s, 6 * s, 2.3 * s);
    g.fillStyle = '#d9e0e6';
    for (let x = 0; x < 6; x += 1.5) g.fillRect(x * s, 0.45 * s, 0.07 * s, 2.3 * s);
  } },
  // Yacht Club: quasi tutto vetro.
  glass: { w: 4, h: 3.0, draw(g, s) {
    g.fillStyle = '#e9edf1';
    g.fillRect(0, 0, 4 * s, 3 * s);
    const grd = g.createLinearGradient(0, 0, 0, 3 * s);
    grd.addColorStop(0, '#3d5a78');
    grd.addColorStop(1, '#1a2a3c');
    g.fillStyle = grd;
    g.fillRect(0.06 * s, 0.35 * s, 3.88 * s, 2.45 * s);
    g.fillStyle = '#d5dce3';
    g.fillRect(1.97 * s, 0.35 * s, 0.06 * s, 2.45 * s);
  } },
};

export function facadeTextures(kind) {
  const f = FACADES[kind];
  const s = 72;
  const [c, g] = canvas(Math.round(f.w * s), Math.round(f.h * s));
  f.draw(g, s);
  const [rc, rg] = canvas(c.width, c.height);
  rg.drawImage(c, 0, 0);
  const img = rg.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const glass = img.data[i] < 90;
    img.data[i] = 0;
    img.data[i + 1] = glass ? 25 : 160;
    img.data[i + 2] = glass ? 150 : 0;
    img.data[i + 3] = 255;
  }
  rg.putImageData(img, 0, 0);
  const map = toTexture(c, { repeat: true });
  const rm = toTexture(rc, { srgb: false, repeat: true });
  for (const t of [map, rm]) {
    t.repeat.set(1 / f.w, 1 / f.h);
    t.offset.set(0, -1 / f.h);
  }
  return { map, rm };
}

// Pannello con testo (insegne dei locali negli interni).
export function signTexture(text, { bg = '#0A1A2F', fg = '#F2B544', w = 1024, h = 160, font = '600 76px Figtree, sans-serif' } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = parseInt(font.match(/(\d+)px/)[1], 10);
  while (g.measureText(text).width > w - 60 && size > 20) {
    size -= 4;
    g.font = font.replace(/\d+px/, `${size}px`);
  }
  g.fillText(text, w / 2, h / 2 + 4);
  return toTexture(c);
}

// Cielo per la cupola LED della World Galleria.
export function ledSkyTexture() {
  const [c, g] = canvas(2048, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#1f5fa8');
  grd.addColorStop(0.6, '#5fa3dc');
  grd.addColorStop(1, '#a9d3f2');
  g.fillStyle = grd;
  g.fillRect(0, 0, 2048, 512);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 2048;
    const y = 60 + rnd() * 380;
    const r = 30 + rnd() * 90;
    for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(255,255,255,0.13)';
      g.beginPath();
      g.ellipse(x + (rnd() - 0.5) * r * 1.6, y + (rnd() - 0.5) * r * 0.4, r * (0.6 + rnd() * 0.6), r * 0.35, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.strokeStyle = 'rgba(10,26,47,0.35)';
  g.lineWidth = 2;
  for (let x = 0; x < 2048; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let y = 0; y < 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }
  return toTexture(c);
}

// Vetrina illuminata di un negozio.
export function shopWindowTexture(seed = 1) {
  const [c, g] = canvas(512, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#f6e3c4');
  grd.addColorStop(1, '#c79f6e');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = ['#2b4466', '#8a3b3b', '#1e1e1e', '#d6b25e', '#ffffff', '#5a6b82'][Math.floor(rnd() * 6)];
    const x = 20 + rnd() * 460;
    const h = 40 + rnd() * 90;
    g.fillRect(x, 230 - h, 18 + rnd() * 30, h);
  }
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(0, 0, 512, 18);
  return toTexture(c);
}

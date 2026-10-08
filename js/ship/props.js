// Arredi e oggetti: modelli fotogrammetrici reali (Poly Haven, CC0) e sculture/arredi costruiti
// dalle descrizioni della nave (palme LED della World Promenade, lettini, ombrelloni, vetrine).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { deckY } from '../data/world-europa.js';
import { CANYON_HALF, SPIRAL } from './geometry.js';
import { place, texture } from '../three/assets.js';

const Y8 = deckY(8);
const Y18 = deckY(18);
const Y20 = deckY(20);
const Y22 = deckY(22);

// ---------------------------------------------------------------------------
// Palma LED: struttura in acciaio rivestita di linee LED (come sulla World Promenade reale).

function ledStripTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 512);
  g.fillStyle = 'rgba(220,226,232,0.35)';
  g.fillRect(0, 0, 64, 512);
  for (let x = 1; x < 64; x += 6) {
    g.fillStyle = 'rgba(255,248,232,1)';
    g.fillRect(x, 0, 3, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function ribbonAlong(curve, widthAt, segments = 40) {
  const pos = [];
  const uv = [];
  const idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3().crossVectors(tan, up).normalize();
    const w = widthAt(t) / 2;
    const droop = new THREE.Vector3(0, -w * 0.35, 0);
    pos.push(...p.clone().addScaledVector(side, -w).add(droop).toArray(), ...p.clone().addScaledVector(side, w).add(droop).toArray());
    uv.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function ledPalm(height = 12, fronds = 11) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xe6eaee, metalness: 0.7, roughness: 0.3 });
  const led = new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xfff1d8, emissiveIntensity: 1.3, roughness: 0.4 });
  const strips = ledStripTexture();
  const frondMat = new THREE.MeshStandardMaterial({
    map: strips, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    emissive: 0xfff1d8, emissiveMap: strips, emissiveIntensity: 1.2, color: 0xffffff, metalness: 0.3, roughness: 0.4,
  });

  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.35, height * 0.35, 0.15),
    new THREE.Vector3(0.1, height * 0.7, -0.2), new THREE.Vector3(-0.1, height, 0),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(trunk, 40, 0.3, 14, false), steel));
  const rings = [];
  for (let t = 0.02; t < 0.98; t += 0.32 / height) {
    const p = trunk.getPoint(t);
    rings.push(new THREE.TorusGeometry(0.34, 0.04, 6, 20).rotateX(Math.PI / 2).translate(p.x, p.y, p.z));
  }
  g.add(new THREE.Mesh(mergeGeometries(rings), led));

  const top = trunk.getPoint(1);
  const leaves = [];
  const spines = [];
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + (i % 2) * 0.2;
    const len = height * (0.42 + (i % 3) * 0.04);
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const lift = i % 2 ? 0.9 : 0.4;
    const curve = new THREE.CatmullRomCurve3([
      top.clone(),
      top.clone().addScaledVector(dir, len * 0.35).add(new THREE.Vector3(0, len * 0.18 * lift + 0.4, 0)),
      top.clone().addScaledVector(dir, len * 0.7).add(new THREE.Vector3(0, len * 0.05, 0)),
      top.clone().addScaledVector(dir, len).add(new THREE.Vector3(0, -len * 0.32, 0)),
    ]);
    leaves.push(ribbonAlong(curve, (t) => 0.15 + 1.9 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8)));
    spines.push(new THREE.TubeGeometry(curve, 30, 0.06, 6, false));
  }
  g.add(new THREE.Mesh(mergeGeometries(leaves), frondMat));
  g.add(new THREE.Mesh(mergeGeometries(spines), steel));

  // Aiuola circolare con seduta.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.55, 32), new THREE.MeshStandardMaterial({ color: 0x3b4450, roughness: 0.6, metalness: 0.2 }));
  base.position.y = 0.275;
  g.add(base);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

// ---------------------------------------------------------------------------
// Lettino prendisole: telaio in alluminio, schienale inclinato, materassino imbottito.

function roundedBox(w, h, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * r * 0.6, bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, r * 0.6, 0);
  return g;
}

function loungerGeometries() {
  const frame = [];
  const cushion = [];
  // Seduta piana (1.3 m) e schienale (0.7 m) inclinato di 35°.
  for (const z of [-0.33, 0.33]) frame.push(new THREE.BoxGeometry(1.95, 0.05, 0.04).translate(0, 0.32, z));
  for (const [x, z] of [[-0.85, -0.33], [-0.85, 0.33], [0.55, -0.33], [0.55, 0.33]]) frame.push(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8).translate(x, 0.16, z));
  const seat = roundedBox(1.25, 0.09, 0.66, 0.035).translate(-0.33, 0.33, 0);
  const back = roundedBox(0.72, 0.09, 0.66, 0.035);
  back.translate(0.36, 0, 0);
  back.rotateZ(0.6);
  back.translate(0.3, 0.37, 0);
  cushion.push(seat, back);
  return { frame: mergeGeometries(frame), cushion: mergeGeometries(cushion) };
}

function loungers(parent, spots, color = 0x1e3352) {
  const { frame, cushion } = loungerGeometries();
  const fm = new THREE.InstancedMesh(frame, new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.8, roughness: 0.3 }), spots.length);
  const cm = new THREE.InstancedMesh(cushion, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  spots.forEach(([x, y, z, rot], i) => {
    m.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1));
    fm.setMatrixAt(i, m);
    cm.setMatrixAt(i, m);
  });
  for (const o of [fm, cm]) {
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
  }
}

// Ombrellone da piscina: palo, raggiera, telo a 8 spicchi.
function parasols(parent, spots, cloth = 0xf4efe6) {
  const pole = new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8).translate(0, 1.3, 0);
  const canopy = new THREE.ConeGeometry(1.5, 0.45, 8, 1, true).translate(0, 2.45, 0);
  const base = new THREE.CylinderGeometry(0.28, 0.32, 0.08, 16).translate(0, 0.04, 0);
  const p = new THREE.InstancedMesh(mergeGeometries([pole, base]), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.7, roughness: 0.35 }), spots.length);
  const c = new THREE.InstancedMesh(canopy, new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.9, side: THREE.DoubleSide }), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, y, z], i) => {
    m.makeTranslation(x, y, z);
    p.setMatrixAt(i, m);
    c.setMatrixAt(i, m);
  });
  for (const o of [p, c]) {
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
  }
}

// Fioriera rettangolare (verde finto lungo le pareti, come sulla nave).
function planterBoxes(parent, spots) {
  const box = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.7, 0.7).translate(0, 0.35, 0), new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.5, metalness: 0.3 }), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, y, z], i) => box.setMatrixAt(i, m.makeTranslation(x, y, z)));
  box.castShadow = box.receiveShadow = true;
  parent.add(box);
}

// ---------------------------------------------------------------------------

export async function loadExteriorProps(ship) {
  const g = new THREE.Group();
  g.name = 'props';
  ship.add(g);

  // World Promenade: palme LED alle due estremità, palme più piccole, tavolini e fioriere lungo le pareti.
  const palms = [[-156, 0, 13], [-88, 4.2, 12], [-128, -5.6, 7.5], [-112, 5.6, 7]];
  for (const [x, z, h] of palms) {
    const p = ledPalm(h);
    p.position.set(x, Y8, z);
    p.rotation.y = x * 0.37;
    g.add(p);
  }
  const wall = CANYON_HALF - 0.6;
  const planters = [];
  const plantSpots = [];
  const tables = [];
  for (let x = -152; x <= -60; x += 6) {
    for (const s of [1, -1]) {
      const busy = x > -150 && x < -94 && Math.round((x + 152) / 6) % 2 === 1;
      if (busy) {
        tables.push({ x, y: Y8, z: s * (wall - 1.5), rot: s > 0 ? Math.PI : 0 });
      } else if (!(x > -74 && Math.abs(x - SPIRAL.x) < 8)) {
        planters.push([x, Y8, s * wall]);
        plantSpots.push({ x: x - 0.7, y: Y8 + 0.7, z: s * wall, rot: x }, { x: x + 0.7, y: Y8 + 0.7, z: s * wall, rot: x * 2 });
      }
    }
  }
  planterBoxes(g, planters);

  // Ponte 18: lettini intorno a La Plage e alla piscina botanica, area Zen con ombrelloni.
  const L = [];
  // rot = -π/2·d orienta lo schienale verso +z (d=1) o -z (d=-1).
  const back = (d) => (-Math.PI / 2) * d;
  for (let x = 26; x <= 52; x += 1.4) for (const z of [-12.2, -14.6, 12.2, 14.6]) L.push([x, Y18, z, back(Math.sign(z))]);
  for (let x = -2; x <= 18; x += 1.4) for (const z of [-11.4, -13.8, 11.4, 13.8]) L.push([x, Y18, z, back(Math.sign(z))]);
  const Z = [];
  for (let x = -158; x <= -132; x += 1.5) for (const z of [11.4, 20.8, -11.4, -20.8]) Z.push([x, Y18, z, back(Math.abs(z) < 15 ? -Math.sign(z) : Math.sign(z))]);
  const YC = [];
  for (let x = 64; x <= 84; x += 1.5) for (const z of [-7, -9.4, 7, 9.4]) YC.push([x, Y22, z, back(Math.sign(z))]);
  for (let x = 24; x <= 52; x += 1.4) YC.push([x, Y20, -19.5, back(-1)]);
  loungers(g, L, 0x1e3352);
  loungers(g, Z, 0xe9e4da);
  loungers(g, YC, 0x0d1b2e);
  const P = [];
  for (let x = -156; x <= -134; x += 4.5) for (const z of [16.1, -16.1]) P.push([x, Y18, z]);
  for (let x = 27; x <= 51; x += 4.8) for (const z of [-17.3, 17.3]) P.push([x, Y18, z]);
  for (let x = 66; x <= 84; x += 6) for (const z of [-11.6, 11.6]) P.push([x, Y22, z]);
  parasols(g, P);

  await Promise.all([
    place(g, 'outdoor_table_chair_set_01', tables, { height: 0.9 }),
    place(g, 'fern_02', plantSpots, { height: 1.1 }),
    place(g, 'potted_plant_04', [
      { x: 21, y: Y18, z: -15.6 }, { x: 21, y: Y18, z: 15.6 }, { x: 55.5, y: Y18, z: -15.6 }, { x: 55.5, y: Y18, z: 15.6 },
      { x: -130, y: Y18, z: 16 }, { x: -130, y: Y18, z: -16 }, { x: 62, y: Y22, z: 0 }, { x: 86, y: Y22, z: -12 }, { x: 86, y: Y22, z: 12 },
    ], { height: 0.9 }),
    place(g, 'outdoor_table_chair_set_01', [
      { x: 2, y: Y18, z: -15.7, rot: 0 }, { x: 8, y: Y18, z: -15.7, rot: 0 }, { x: 14, y: Y18, z: -15.7, rot: 0 },
      { x: 2, y: Y18, z: 15.7, rot: Math.PI }, { x: 8, y: Y18, z: 15.7, rot: Math.PI }, { x: 14, y: Y18, z: 15.7, rot: Math.PI },
    ], { height: 0.9 }),
  ]);
  return g;
}

// ---------------------------------------------------------------------------
// Interni: salotti nell'atrio, vetrine con fotografie reali, bar nella World Galleria.

const SHOP_PHOTOS = {
  'Jean-Philippe Maury Chocolaterie': 'chocolate',
  'Sweet Temptations': 'chocolate',
  'Fine Jewellery': 'jewellery',
  'World of Watches': 'watches',
  'Luxury Accessories': 'accessories',
  Boutiques: 'boutique-fashion',
  'Shopping Gallery': 'perfume',
  'Iris Galerie': 'boutique-fashion',
  'Coffee Emporium': 'cafe',
  'Dolce Vita Bar': 'cafe',
  'Fizz Champagne Bar': 'cocktail-bar',
  'The Gin Project': 'cocktail-bar',
  'Elixir Mixology Bar': 'cocktail-bar',
  'Masters of the Sea Pub': 'cocktail-bar',
  'HOLA! Tacos & Cantina': 'cafe',
  'Butcher’s Cut': 'cocktail-bar',
  'Kaito Teppanyaki & Sushi': 'cafe',
  'THE HUB Photo & Digit@l': 'watches',
  'MSC Foundation': 'boutique-fashion',
  'Gentlemen’s Barber': 'perfume',
};

// Materiale della vetrina: foto reale del tipo di negozio se presente, altrimenti la texture di riserva.
export function shopPhoto(name, fallback) {
  const slot = SHOP_PHOTOS[name];
  const mat = new THREE.MeshBasicMaterial({ map: fallback });
  if (!slot) return mat;
  new THREE.TextureLoader().load(new URL(`../../assets/photos/${slot}.jpg`, import.meta.url).href, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    mat.map = t;
    mat.needsUpdate = true;
  }, undefined, () => {});
  return mat;
}

export async function loadInteriorProps({ interior, theatre }) {
  const Y6 = deckY(6);
  const Y7 = deckY(7);
  const group = new THREE.Group();
  interior.add(group);
  const lounge = (cx, cz) => [0, 1, 2, 3].map((k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    return { x: cx + Math.cos(a) * 1.55, y: Y6, z: cz + Math.sin(a) * 1.55, rot: -a - Math.PI / 2 };
  });
  await Promise.all([
    place(group, 'modern_arm_chair_01', [...lounge(10.5, -9), ...lounge(2, 9.4)], { height: 0.85 }),
    place(group, 'modern_coffee_table_01', [{ x: 10.5, y: Y6, z: -9 }, { x: 2, y: Y6, z: 9.4 }], { height: 0.4 }),
    place(group, 'mid_century_lounge_chair', [
      { x: 14.5, y: Y6, z: 7.6, rot: -2.2 }, { x: 14.5, y: Y6, z: -7.6, rot: -0.9 },
      { x: -20, y: Y6, z: -6.6, rot: 0.3 }, { x: -24, y: Y6, z: -6.6, rot: -0.3 },
    ], { height: 0.95 }),
    place(group, 'coffee_table_round_01', [{ x: -22, y: Y6, z: -6.2 }], { height: 0.45 }),
    place(group, 'potted_plant_02', [
      { x: 16.6, y: Y6, z: 10.6 }, { x: 16.6, y: Y6, z: -10.6 }, { x: -6.8, y: Y6, z: 5.6 }, { x: -6.8, y: Y6, z: -5.6 },
      { x: -52, y: Y6, z: 6.5 }, { x: -52, y: Y6, z: -6.5 },
    ], { height: 1.5 }),
    place(group, 'modern_ceiling_lamp_01', [
      { x: 10.5, y: Y7 - 1.05, z: -9 }, { x: 2, y: Y7 - 1.05, z: 9.4 }, { x: -34, y: Y7 - 1.05, z: 3.5 },
    ], { height: 0.7 }),
    place(group, 'metal_stool_02', [-36.4, -35.2, -34, -32.8, -31.6].map((x) => ({ x, y: Y6, z: 2.4 })), { height: 0.75 }),
    // Vetrine: scaffali e vasi sul davanzale (aggiungono profondità alle foto).
    place(group, 'wooden_display_shelves_01', [-51, -36, -21].flatMap((x) => [
      { x: x - 2.2, y: Y6, z: 8.45, rot: Math.PI }, { x: x - 0.9, y: Y6, z: 8.45, rot: Math.PI },
      { x: x - 2.2, y: Y6, z: -8.45 }, { x: x - 0.9, y: Y6, z: -8.45 },
    ]), { height: 1.55 }),
    place(group, 'brass_vase_01', [-43.5, -28.5, -13.5].flatMap((x) => [
      { x: x - 1.5, y: Y6 + 0.9, z: 8.6 }, { x: x - 0.3, y: Y6 + 0.9, z: -8.6 },
    ]), { height: 0.45 }),
    place(group, 'ceramic_vase_02', [-43.5, -28.5, -13.5].flatMap((x) => [
      { x: x - 0.3, y: Y6 + 0.9, z: 8.6 }, { x: x - 1.5, y: Y6 + 0.9, z: -8.6 },
    ]), { height: 0.38 }),
  ]);
  // Bancone del bar nella galleria (rivestito in teak).
  const counter = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.1, 0.8), new THREE.MeshStandardMaterial({ map: texture('textures/teak_veneer/teak_veneer_diff_1k.jpg', { repeat: 2 }), roughness: 0.4 }));
  counter.position.set(-34, Y6 + 0.55, 3.4);
  counter.castShadow = counter.receiveShadow = true;
  group.add(counter);
  return { interior: group, theatre };
}

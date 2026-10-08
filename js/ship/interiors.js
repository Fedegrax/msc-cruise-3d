// Interni modellati per il tour: atrio + World Galleria (spazio 'interior') e World Theatre ('theatre').
// Tutto è posizionato nelle coordinate reali della nave, così mappa e tour coincidono.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { deckY } from '../data/world-europa.js';
import { signTexture, marbleTexture, ledSkyTexture, shopWindowTexture } from './textures.js';

const Y6 = deckY(6);
const Y7 = deckY(7);
const Y8 = deckY(8);
const CEIL = deckY(9) - 0.4;

const VENUES = [
  'Jean-Philippe Maury Chocolaterie', 'Shopping Gallery', 'Dolce Vita Bar', 'Fine Jewellery', 'World of Watches',
  'Luxury Accessories', 'Iris Galerie', 'Masters of the Sea Pub', 'HOLA! Tacos & Cantina', 'Butcher’s Cut',
  'Kaito Teppanyaki & Sushi', 'THE HUB Photo & Digit@l', 'MSC Foundation', 'Gentlemen’s Barber', 'Coffee Emporium',
  'Sweet Temptations', 'Fizz Champagne Bar', 'The Gin Project', 'Elixir Mixology Bar', 'Boutiques',
];

function mats() {
  const marble = marbleTexture();
  return {
    marble: new THREE.MeshStandardMaterial({ map: marble, roughness: 0.18, metalness: 0.05 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xd9cdbd, roughness: 0.7, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5e3f27, roughness: 0.45, side: THREE.DoubleSide }),
    slab: new THREE.MeshStandardMaterial({ color: 0xf4efe7, roughness: 0.6, emissive: 0xb8ab98, emissiveIntensity: 0.22 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 0.8, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbcd8e6, transparent: true, opacity: 0.25, roughness: 0.02, metalness: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.25, metalness: 0.9 }),
    crystal: new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.06, metalness: 0.6, emissive: 0xcfe9ff, emissiveIntensity: 0.9, emissiveMap: sparkle() }),
    glow: new THREE.MeshBasicMaterial({ color: 0xfff1d6 }),
  };
}

function sparkle() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#20303c';
  g.fillRect(0, 0, 256, 256);
  let s = 5;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const v = 150 + r() * 105;
    g.fillStyle = `rgb(${v},${v},255)`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const box = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);

function floor(x0, x1, z0, z1, y, mat) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + (x0 + x1) / 2, p.getZ(i) + (z0 + z1) / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return new THREE.Mesh(g, mat);
}

// Soletta forata (ponti superiori che si affacciano su un vuoto).
function ringSlab(outer, hole, y, mat) {
  const [ox0, ox1, oz0, oz1] = outer;
  const [hx0, hx1, hz0, hz1] = hole;
  const shape = new THREE.Shape([[ox0, oz0], [ox1, oz0], [ox1, oz1], [ox0, oz1]].map(([x, z]) => new THREE.Vector2(x, -z)));
  shape.holes.push(new THREE.Path([[hx0, hz0], [hx0, hz1], [hx1, hz1], [hx1, hz0]].map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y - 0.35, 0);
  return new THREE.Mesh(g, mat);
}

// Parapetto in vetro con corrimano in ottone lungo un rettangolo (lati scelti).
function balustrade(points, y, M) {
  const glass = [];
  const rail = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    glass.push(new THREE.PlaneGeometry(len, 1.0).rotateY(-ang).translate(mx, y + 0.5, mz));
    rail.push(new THREE.BoxGeometry(len, 0.07, 0.09).rotateY(-ang).translate(mx, y + 1.05, mz));
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries(glass), M.glass), new THREE.Mesh(mergeGeometries(rail), M.brass));
  return g;
}

function sign(text, w, h, x, y, z, rotY, opts) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(text, opts) }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

// ---------------------------------------------------------------------------

export function buildInteriors() {
  const M = mats();
  const interior = new THREE.Group();
  interior.name = 'interior';
  interior.add(buildAtrium(M), buildGalleria(M));
  interior.add(new THREE.HemisphereLight(0xfff4e6, 0x8a7560, 0.4));

  const theatre = buildTheatre(M);
  theatre.name = 'theatre';
  return { interior, theatre };
}

function buildAtrium(M) {
  const g = new THREE.Group();
  const X0 = -8;
  const X1 = 18;
  const Z = 12;
  const hole = [-1, 12, -6.5, 6.5];
  g.add(floor(X0, X1, -Z, Z, Y6, M.marble));
  g.add(ringSlab([X0, X1, -Z, Z], hole, Y7, M.slab), ringSlab([X0, X1, -Z, Z], hole, Y8, M.slab));
  for (const y of [Y7, Y8]) {
    g.add(floor(X0, X1, -Z, Z, y + 0.01, M.marble));
    const [hx0, hx1, hz0, hz1] = hole;
    g.add(balustrade([[hx0, hz0], [hx1, hz0], [hx1, hz1], [hx0, hz1], [hx0, 1.9]], y, M));
    g.add(balustrade([[hx0, -1.9], [hx0, hz0]], y, M));
  }
  // Pareti e soffitto (l'atrio si apre a poppa sulla World Galleria).
  const walls = [
    box(0.3, CEIL - Y6, 2 * Z, X1, (CEIL + Y6) / 2, 0),
    box(X1 - X0, CEIL - Y6, 0.3, (X0 + X1) / 2, (CEIL + Y6) / 2, Z),
    box(X1 - X0, CEIL - Y6, 0.3, (X0 + X1) / 2, (CEIL + Y6) / 2, -Z),
    box(0.3, CEIL - Y6, 3, X0, (CEIL + Y6) / 2, 10.5),
    box(0.3, CEIL - Y6, 3, X0, (CEIL + Y6) / 2, -10.5),
  ];
  g.add(new THREE.Mesh(mergeGeometries(walls), M.wall));
  // Boiserie in legno al piano terra.
  g.add(new THREE.Mesh(mergeGeometries([
    box(0.1, 2.8, 2 * Z - 1, X1 - 0.2, Y6 + 1.4, 0),
    box(X1 - X0 - 1, 2.8, 0.1, 5, Y6 + 1.4, Z - 0.2),
    box(X1 - X0 - 1, 2.8, 0.1, 5, Y6 + 1.4, -Z + 0.2),
  ]), M.wood));
  g.add(floor(X0, X1, -Z, Z, CEIL, M.ceiling));
  // Lucernario LED sopra il vuoto.
  const sky = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48).rotateX(Math.PI / 2), M.glow);
  sky.position.set(5.5, CEIL - 0.02, 0);
  g.add(sky);

  // Scalinata di cristallo: dal ponte 6 al bordo del vuoto al ponte 7.
  const steps = 18;
  const rise = (Y7 - Y6) / steps;
  const tread = 0.31;
  const stepGeo = [];
  const side = [];
  for (let i = 0; i < steps; i++) {
    const x = hole[0] + 0.15 + (steps - 1 - i) * tread + tread / 2;
    stepGeo.push(box(tread + 0.02, rise, 3.6, x, Y6 + rise * (i + 0.5), 0));
  }
  const run = steps * tread;
  for (const z of [-1.85, 1.85]) {
    const len = Math.hypot(run, Y7 - Y6);
    const p = new THREE.PlaneGeometry(len, 1.0);
    p.rotateZ(-Math.atan2(Y7 - Y6, run));
    p.translate(hole[0] + 0.15 + run / 2, (Y6 + Y7) / 2 + 0.6, z);
    side.push(p);
  }
  g.add(new THREE.Mesh(mergeGeometries(stepGeo), M.crystal));
  g.add(new THREE.Mesh(mergeGeometries(side), M.glass));

  // Ascensori panoramici (vetro) accanto al vuoto.
  for (const z of [-9.2, 9.2]) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, CEIL - Y6, 24, 1, true), M.glass);
    shaft.position.set(-5, (CEIL + Y6) / 2, z);
    const car = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.5, 24), M.brass);
    car.position.set(-5, Y7 + 1.25 + (z > 0 ? 3.2 : 0), z);
    g.add(shaft, car);
  }

  // Reception.
  g.add(new THREE.Mesh(box(1.2, 1.1, 9, X1 - 2.5, Y6 + 0.55, 0), M.wood));
  g.add(sign('Reception', 6, 0.9, X1 - 0.2, Y6 + 3.4, 0, -Math.PI / 2, { bg: '#2a1f17', fg: '#e8c98a' }));

  // Lampadario di cristalli.
  const drop = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09), M.crystal, 700);
  const m = new THREE.Matrix4();
  let s = 3;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 700; i++) {
    const t = r();
    const a = r() * Math.PI * 2;
    const rad = 4.2 * (1 - t) * Math.sqrt(r());
    drop.setMatrixAt(i, m.makeTranslation(5.5 + Math.cos(a) * rad, CEIL - 0.4 - t * 4.6, Math.sin(a) * rad));
  }
  g.add(drop);

  const warm = (x, y, z, i, d) => {
    const l = new THREE.PointLight(0xffe2b8, i, d, 1.6);
    l.position.set(x, y, z);
    return l;
  };
  g.add(warm(5.5, CEIL - 2, 0, 160, 40), warm(14, Y6 + 3, 8, 40, 18), warm(14, Y6 + 3, -8, 40, 18), warm(0, Y7 + 2.6, -9, 35, 16));
  return g;
}

function buildGalleria(M) {
  const g = new THREE.Group();
  const X0 = -55;
  const X1 = -8;
  const Z = 9;
  const W = 3.5; // profondità dei ballatoi superiori
  g.add(floor(X0, X1, -Z, Z, Y6, M.marble));
  for (const y of [Y7, Y8]) {
    for (const sgn of [1, -1]) {
      const slab = box(X1 - X0, 0.35, W, (X0 + X1) / 2, y - 0.175, sgn * (Z - W / 2));
      g.add(new THREE.Mesh(slab, M.slab));
      g.add(floor(X0, X1, sgn > 0 ? Z - W : -Z, sgn > 0 ? Z : -Z + W, y + 0.01, M.marble));
      g.add(balustrade([[X0, sgn * (Z - W)], [X1, sgn * (Z - W)]], y, M));
    }
  }
  // Vetrine e insegne su tre livelli, entrambi i lati.
  let k = 0;
  for (const y of [Y6, Y7, Y8]) {
    for (const sgn of [1, -1]) {
      for (let x = X0 + 4; x < X1 - 3; x += 7.5) {
        const name = VENUES[k % VENUES.length];
        const win = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.4), new THREE.MeshBasicMaterial({ map: shopWindowTexture(k + 1) }));
        win.position.set(x, y + 1.35, sgn * (Z - 0.16));
        win.rotation.y = sgn > 0 ? Math.PI : 0;
        g.add(win);
        g.add(sign(name, 5.6, 0.55, x, y + 2.85, sgn * (Z - 0.17), sgn > 0 ? Math.PI : 0, { bg: '#0f1d31', fg: '#f3e2bf' }));
        k++;
      }
    }
  }
  const walls = [
    box(X1 - X0, CEIL - Y6, 0.3, (X0 + X1) / 2, (CEIL + Y6) / 2, Z),
    box(X1 - X0, CEIL - Y6, 0.3, (X0 + X1) / 2, (CEIL + Y6) / 2, -Z),
  ];
  g.add(new THREE.Mesh(mergeGeometries(walls), M.wall));

  // Cupola LED: volta ribassata con cielo animabile.
  const sag = 1.6;
  const R = (Z * Z + sag * sag) / (2 * sag);
  const th = Math.asin(Z / R);
  const vault = new THREE.CylinderGeometry(R, R, X1 - X0, 48, 1, true, Math.PI / 2 - th, 2 * th);
  vault.rotateZ(Math.PI / 2);
  vault.translate((X0 + X1) / 2, CEIL + sag - R - 0.2, 0);
  const led = ledSkyTexture();
  const dome = new THREE.Mesh(vault, new THREE.MeshBasicMaterial({ map: led, side: THREE.DoubleSide }));
  dome.name = 'ledDome';
  g.add(dome);

  // Vetrata di poppa verso la World Promenade.
  const daylight = new THREE.Mesh(new THREE.PlaneGeometry(2 * Z, CEIL - Y6), new THREE.MeshBasicMaterial({ color: 0xcfe6f7 }));
  daylight.position.set(X0 + 0.05, (CEIL + Y6) / 2, 0);
  daylight.rotation.y = Math.PI / 2;
  g.add(daylight);
  const mullions = [];
  for (let z = -Z; z <= Z; z += 2.25) mullions.push(box(0.15, CEIL - Y6, 0.12, X0 + 0.1, (CEIL + Y6) / 2, z));
  for (const y of [Y7, Y8]) mullions.push(box(0.15, 0.2, 2 * Z, X0 + 0.1, y, 0));
  g.add(new THREE.Mesh(mergeGeometries(mullions), M.brass));
  g.add(sign('World Promenade', 7, 0.8, X0 + 0.3, Y6 + 3.0, 0, Math.PI / 2, { bg: '#0A1A2F', fg: '#F2B544' }));

  for (let x = X0 + 6; x < X1; x += 12) {
    const l = new THREE.PointLight(0xfff0d8, 45, 22, 1.6);
    l.position.set(x, Y8 + 1.5, 0);
    g.add(l);
  }
  return g;
}

function buildTheatre(M) {
  const g = new THREE.Group();
  const X0 = 92;
  const X1 = 134;
  const TOP = deckY(9) - 1.2;
  const C = 134.5; // centro degli archi di poltrone (fronte palco)
  const halfAt = (x) => 17 - ((x - X0) / (X1 - X0)) * 4;

  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1f2e, roughness: 0.9, side: THREE.DoubleSide });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x3a1d2b, roughness: 0.95 });
  const velvet = new THREE.MeshStandardMaterial({ color: 0x8e1f2b, roughness: 0.75 });
  const curtain = new THREE.MeshStandardMaterial({ color: 0x6d0f1c, roughness: 0.8 });

  // Involucro (pianta rastremata verso prua).
  const shell = new THREE.Shape([[X0, -halfAt(X0)], [X1, -halfAt(X1)], [X1, halfAt(X1)], [X0, halfAt(X0)]].map(([x, z]) => new THREE.Vector2(x, -z)));
  const room = new THREE.ExtrudeGeometry(shell, { depth: TOP - Y6, bevelEnabled: false });
  room.rotateX(-Math.PI / 2);
  room.translate(0, Y6, 0);
  g.add(new THREE.Mesh(room, dark));

  // Gradinate della platea e poltrone ad arco rivolte al palco.
  const tiers = [];
  const seats = [];
  const seatGeo = mergeGeometries([box(0.52, 0.42, 0.5, 0, 0.21, 0), box(0.52, 0.62, 0.1, 0, 0.62, 0.24)]);
  const addRows = (r0, r1, yAt, xMin) => {
    for (let r = r0; r <= r1 + 1e-6; r += 0.95) {
      const y = yAt(r);
      const xRow = C - r;
      if (xRow < xMin) break;
      const half = halfAt(Math.max(X0, xRow)) - 1.0;
      tiers.push(box(0.95, Math.max(0.05, y - Y6), 2 * half + 2, xRow - 0.2, (y + Y6) / 2, 0));
      const n = Math.floor((2 * Math.asin(Math.min(1, half / r)) * r) / 0.56);
      for (let i = 0; i < n; i++) {
        const a = -Math.asin(Math.min(1, half / r)) + (i + 0.5) * (0.56 / r);
        const z = r * Math.sin(a);
        if (Math.abs(z) < 0.75 || Math.abs(Math.abs(z) - 8) < 0.6 || Math.abs(z) > half) continue;
        const x = C - r * Math.cos(a);
        seats.push(new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a - Math.PI / 2), new THREE.Vector3(1, 1, 1),
        ));
      }
    }
  };
  addRows(13, 30.5, (r) => Y6 + (r - 13) * 0.16, X0 + 1);
  // Galleria (secondo livello).
  const balcY = (r) => Y7 + (r - 32) * 0.3;
  addRows(32, 41, balcY, X0 + 0.6);
  g.add(new THREE.Mesh(mergeGeometries(tiers), carpet));
  const seatMesh = new THREE.InstancedMesh(seatGeo, velvet, seats.length);
  seats.forEach((mm, i) => seatMesh.setMatrixAt(i, mm));
  seatMesh.name = 'seats';
  g.add(seatMesh);
  // Parapetto della galleria.
  const arc = [];
  for (let a = -0.5; a <= 0.5001; a += 0.05) arc.push([C - 31.5 * Math.cos(a), 31.5 * Math.sin(a)]);
  g.add(balustrade(arc, Y7, M));

  // Palco, boccascena, sipario e schermo LED.
  g.add(new THREE.Mesh(box(X1 - 124, 1.0, 2 * halfAt(124), (X1 + 124) / 2, Y6 + 0.5, 0), M.wood));
  g.add(new THREE.Mesh(mergeGeometries([
    box(0.8, 1.6, 2 * halfAt(124), 124.6, TOP - 0.8, 0),
    box(0.8, TOP - Y6, 2.2, 124.6, (TOP + Y6) / 2, halfAt(124) - 1.1),
    box(0.8, TOP - Y6, 2.2, 124.6, (TOP + Y6) / 2, -halfAt(124) + 1.1),
  ]), M.brass));
  g.add(new THREE.Mesh(mergeGeometries([
    box(0.4, TOP - Y6 - 2.6, 3, 125.4, (TOP + Y6) / 2 - 0.3, halfAt(125) - 3.6),
    box(0.4, TOP - Y6 - 2.6, 3, 125.4, (TOP + Y6) / 2 - 0.3, -halfAt(125) + 3.6),
  ]), curtain));
  const screen = sign('WORLD THEATRE', 2 * halfAt(133) - 3, 5, X1 - 0.3, Y6 + 4.8, 0, -Math.PI / 2, { bg: '#24144a', fg: '#ffd27a', w: 2048, h: 640, font: '700 150px Sora, sans-serif' });
  g.add(screen);

  // Luci: proiettori sul palco, luci di cortesia.
  g.add(new THREE.AmbientLight(0x5a4a6a, 0.6));
  for (const z of [-5, 5]) {
    const spot = new THREE.SpotLight(0xfff0d0, 900, 60, 0.45, 0.5, 1.5);
    spot.position.set(110, TOP - 0.5, z);
    spot.target.position.set(129, Y6 + 1, 0);
    g.add(spot, spot.target);
  }
  const house = new THREE.PointLight(0xffd7a8, 120, 40, 1.6);
  house.position.set(105, TOP - 1, 0);
  g.add(house);
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.12, 8).rotateX(Math.PI / 2), M.glow, 160);
  const mm = new THREE.Matrix4();
  for (let i = 0; i < 160; i++) dots.setMatrixAt(i, mm.makeTranslation(X0 + 2 + (i % 20) * 1.6, TOP - 0.02, -12 + Math.floor(i / 20) * 3.4));
  g.add(dots);
  return g;
}

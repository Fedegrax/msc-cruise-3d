// Modello 3D parametrico della MSC World Europa, costruito dalle misure in geometry.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DECKS, deckY } from '../data/world-europa.js';
import {
  LH, BH, Y_KEEL, X_TRANSOM, BALCONY, CANYON_HALF,
  halfBreadth, bottomY, hullTop, STRUCTURES, outlinePolygon, footprintAt, sampleRange,
  LIFEBOATS, SPIRAL, FUNNEL, POOLS, JACUZZIS, BOTANIC_ROOF,
} from './geometry.js';
import { hullTextures, transomTexture, facadeTextures, HULL_TEX_TOP } from './textures.js';
import { pbr, texture } from '../three/assets.js';

export function buildShip() {
  const ship = new THREE.Group();
  ship.name = 'ship';
  const M = createMaterials();

  ship.add(buildHull(M));
  for (const s of STRUCTURES) ship.add(buildStructure(s, M));
  ship.add(buildBalconies(M));
  ship.add(buildRailings(M));
  ship.add(buildLifeboats(M));
  ship.add(buildFunnel(M));
  ship.add(buildMastAndBridge(M));
  ship.add(buildSpiral(M));
  ship.add(buildSlides(M));
  ship.add(buildPools(M));
  ship.add(buildBotanicRoof(M));

  ship.traverse((o) => {
    if (o.isMesh) {
      const transparent = Array.isArray(o.material) ? o.material.some((m) => m.transparent) : o.material.transparent;
      o.castShadow = !transparent;
      o.receiveShadow = true;
    }
  });
  ship.userData.materials = Object.values(M);
  return ship;
}

function createMaterials() {
  const hull = hullTextures();
  const std = (opts) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...opts });
  const facade = (kind) => {
    const t = facadeTextures(kind);
    return std({ map: t.map, roughnessMap: t.rm, metalnessMap: t.rm, roughness: 1, metalness: 1 });
  };
  return {
    hull: std({ map: hull.map, roughnessMap: hull.rm, metalnessMap: hull.rm, roughness: 1, metalness: 1 }),
    white: std({ color: 0xf1f3f5, roughness: 0.55 }),
    transom: std({ map: transomTexture(), roughness: 0.5 }),
    steelDeck: std({ color: 0x9aa4ab, roughness: 0.85 }),
    // Teak con giunti neri (texture fotografica PBR, 1 m per ripetizione).
    teak: pbr('brown_planks_05', 1, { roughness: 0.9, color: 0xe2c9a6 }),
    balcony: facade('balcony'),
    public: facade('public'),
    glassFacade: facade('glass'),
    railGlass: new THREE.MeshStandardMaterial({ color: 0x9fc2d6, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }),
    vaultGlass: new THREE.MeshStandardMaterial({ color: 0xbfdcec, transparent: true, opacity: 0.28, roughness: 0.03, metalness: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    frame: std({ color: 0xd9dee3, roughness: 0.4, metalness: 0.3 }),
    lifeboat: std({ color: 0xf08524, roughness: 0.45 }),
    davit: std({ color: 0x8d969e, roughness: 0.5, metalness: 0.5 }),
    funnel: std({ color: 0x15181d, roughness: 0.35, metalness: 0.2 }),
    spiral: new THREE.MeshStandardMaterial({ color: 0xe6ebf0, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    slideYellow: std({ color: 0xf2c230, roughness: 0.3 }),
    slideBlue: std({ color: 0x2a7fd4, roughness: 0.3 }),
    slideRed: std({ color: 0xd8443a, roughness: 0.3 }),
    poolTile: std({ color: 0xf2f4f3, roughness: 0.55 }),
    poolBasin: pbr('long_white_tiles', 1.27, { roughness: 0.4, color: 0x8fd3ea }),
    water: new THREE.MeshStandardMaterial({
      color: 0x1fa4d6, transparent: true, opacity: 0.62, roughness: 0.03, metalness: 0.15,
      normalMap: texture('textures/waternormals.jpg', { srgb: false, repeat: 0.25 }), normalScale: new THREE.Vector2(0.35, 0.35),
    }),
    dark: std({ color: 0x23303d, roughness: 0.5, metalness: 0.4 }),
    radome: std({ color: 0xf7f8fa, roughness: 0.3 }),
  };
}

// ---------------------------------------------------------------------------
// Scafo: loft di sezioni trasversali generate da halfBreadth(x, y).

function hullStations() {
  const xs = [];
  const push = (a, b, step) => {
    for (let x = a; x < b - 1e-6; x += step) xs.push(x);
  };
  push(X_TRANSOM, -118, 1.5);
  push(-118, 80, 3);
  push(80, LH, 0.6);
  xs.push(LH);
  return xs;
}

const NY = 40;

function section(x) {
  const yb = bottomY(x);
  const yt = hullTop(x);
  const pts = [[0, yb]];
  for (let j = 0; j <= NY; j++) {
    const s = j / NY;
    const f = 0.55 * s + 0.45 * (1 - Math.cos((s * Math.PI) / 2));
    const y = yb + (yt - yb) * f;
    pts.push([halfBreadth(x, y), y]);
  }
  return pts;
}

function buildHull(M) {
  const group = new THREE.Group();
  group.name = 'hull';
  const xs = hullStations();
  const sections = xs.map(section);
  const NP = NY + 2;
  const vMax = HULL_TEX_TOP - Y_KEEL;

  // Fianchi (dritta e babordo).
  const pos = [];
  const uv = [];
  const idx = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    xs.forEach((x, i) => {
      for (const [b, y] of sections[i]) {
        pos.push(x, y, side * b);
        uv.push((x + LH) / (2 * LH), (y - Y_KEEL) / vMax);
      }
    });
    for (let i = 0; i < xs.length - 1; i++) {
      for (let k = 0; k < NP - 1; k++) {
        const a = base + i * NP + k;
        const b = base + (i + 1) * NP + k;
        const c = b + 1;
        const d = a + 1;
        if (side > 0) idx.push(a, b, c, a, c, d);
        else idx.push(a, c, b, a, d, c);
      }
    }
  }
  const sides = new THREE.BufferGeometry();
  sides.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sides.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sides.setIndex(idx);
  sides.computeVertexNormals();
  group.add(new THREE.Mesh(sides, M.hull));

  // Coperta (piano superiore dello scafo).
  const cp = [];
  const ci = [];
  const cuv = [];
  xs.forEach((x, i) => {
    const [b, y] = sections[i][NP - 1];
    cp.push(x, y, -b, x, y, b);
    cuv.push(x, -b, x, b);
    if (i < xs.length - 1) {
      const a = i * 2;
      ci.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  });
  const cap = new THREE.BufferGeometry();
  cap.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  cap.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2));
  cap.setIndex(ci);
  cap.computeVertexNormals();
  group.add(new THREE.Mesh(cap, M.steelDeck));

  // Specchio di poppa.
  const sec = sections[0];
  const ring = sec.map(([b, y]) => [b, y]).concat(sec.slice().reverse().map(([b, y]) => [-b, y]));
  const shape = new THREE.Shape(ring.map(([z, y]) => new THREE.Vector2(z, y)));
  const transom = new THREE.ShapeGeometry(shape);
  const tu = transom.attributes.uv;
  for (let i = 0; i < tu.count; i++) tu.setXY(i, (tu.getX(i) + 24) / 48, (tu.getY(i) - Y_KEEL) / (HULL_TEX_TOP - Y_KEEL));
  transom.rotateY(-Math.PI / 2);
  transom.translate(X_TRANSOM, 0, 0);
  group.add(new THREE.Mesh(transom, M.transom));

  // Passeggiate in teak: World Promenade (ponte 8) e camminamenti sotto le scialuppe (ponte 7).
  const plank = (x0, x1, z0, z1, y) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    // UV in metri per le doghe.
    const p = g.attributes.position;
    const u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i) + (x0 + x1) / 2, p.getZ(i));
    g.translate((x0 + x1) / 2, y + 0.03, (z0 + z1) / 2);
    return g;
  };
  const y7 = deckY(7);
  const walk = [
    plank(-161, -55, -CANYON_HALF, CANYON_HALF, deckY(8)),
    plank(-49, 105, 20, BH - 0.4, y7),
    plank(-49, 105, -BH + 0.4, -20, y7),
  ];
  group.add(new THREE.Mesh(mergeGeometries(walk), M.teak));
  return group;
}

// ---------------------------------------------------------------------------
// Sovrastrutture: estrusione dell'impronta in pianta.

function extrudeOutline(poly, y0, h) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0, 0);
  return geo;
}

function buildStructure(s, M) {
  const geo = extrudeOutline(outlinePolygon(s, 1.0), s.y[0], s.y[1] - s.y[0]);
  const facade = s.facade === 'balcony' ? M.balcony : s.facade === 'glass' ? M.glassFacade : M.public;
  const mesh = new THREE.Mesh(geo, [M.teak, facade]);
  mesh.name = s.id;
  return mesh;
}

const floorsIn = (y0, y1) => DECKS.map((d) => d.y).filter((y) => y >= y0 - 0.01 && y <= y1 + 0.01);

// Balconi: solette, divisori e parapetti in vetro lungo le facciate.
function buildBalconies(M) {
  const slabs = [];
  const rails = [];
  const partitions = [];
  for (const s of STRUCTURES) {
    if (s.facade !== 'balcony') continue;
    const x0 = s.x[0];
    const x1 = s.straight ? s.straight[1] : s.x[1];
    const xs = sampleRange(x0, x1, 2);
    const lines = [];
    if (s.half) {
      lines.push({ wall: (x) => s.half(x), dir: 1 }, { wall: (x) => -s.half(x), dir: -1 });
    } else {
      const sg = s.side;
      if (s.balconyOuter) lines.push({ wall: (x) => sg * s.outer(x), dir: sg });
      if (s.balconyInner) lines.push({ wall: (x) => sg * s.inner(x), dir: -sg });
    }
    const floors = floorsIn(s.y[0], s.y[1]);
    for (const { wall, dir } of lines) {
      const strip = xs.map((x) => [x, wall(x)]);
      const out = xs.map((x) => [x, wall(x) + dir * BALCONY]);
      const poly = strip.concat(out.slice().reverse());
      floors.forEach((y, fi) => {
        slabs.push(extrudeOutline(poly, y - 0.25, 0.25));
        if (fi === floors.length - 1 && y >= s.y[1] - 0.01) {
          rails.push(railStrip(out, y, 1.1));
          return;
        }
        rails.push(railStrip(out, y, 1.05));
        const h = (floors[fi + 1] ?? s.y[1]) - y - 0.25;
        for (let x = x0 + 1.8; x < x1 - 0.5; x += 3.6) {
          const z = wall(x) + (dir * BALCONY) / 2;
          partitions.push(new THREE.Matrix4().compose(
            new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1),
          ));
        }
      });
    }
  }
  const g = new THREE.Group();
  g.name = 'balconies';
  g.add(new THREE.Mesh(mergeGeometries(slabs), M.white));
  g.add(new THREE.Mesh(mergeGeometries(rails), M.railGlass));
  const part = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1, BALCONY), M.white, partitions.length);
  partitions.forEach((m, i) => part.setMatrixAt(i, m));
  g.add(part);
  return g;
}

// Striscia verticale lungo una polilinea (x, z): parapetti in vetro.
function railStrip(points, y, h) {
  const pos = [];
  const idx = [];
  points.forEach(([x, z], i) => {
    pos.push(x, y, z, x, y + h, z);
    if (i < points.length - 1) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Parapetti dei ponti scoperti (tetti delle sovrastrutture e camminamenti).
function buildRailings(M) {
  const rails = [];
  for (const s of STRUCTURES) {
    const poly = outlinePolygon(s, 1.5, true);
    rails.push(railStrip(poly.concat([poly[0]]), s.y[1], 1.1));
  }
  const y7 = deckY(7);
  const edge = (side) => sampleRange(-50, 106, 2).map((x) => [x, side * (halfBreadth(x, y7) - 0.15)]);
  rails.push(railStrip(edge(1), y7, 1.1), railStrip(edge(-1), y7, 1.1));
  const g = new THREE.Group();
  g.name = 'railings';
  g.add(new THREE.Mesh(mergeGeometries(rails), M.railGlass));
  return g;
}

// ---------------------------------------------------------------------------

function buildLifeboats(M) {
  const g = new THREE.Group();
  g.name = 'lifeboats';
  const body = new THREE.CapsuleGeometry(2.05, 7.4, 6, 16);
  body.rotateZ(Math.PI / 2);
  body.scale(1, 0.78, 1);
  const davit = new THREE.BoxGeometry(0.5, 0.5, 3.4);
  const boats = new THREE.InstancedMesh(body, M.lifeboat, LIFEBOATS.length * 2);
  const arms = new THREE.InstancedMesh(davit, M.davit, LIFEBOATS.length * 4);
  let i = 0;
  let j = 0;
  const m = new THREE.Matrix4();
  for (const side of [1, -1]) {
    for (const x of LIFEBOATS) {
      boats.setMatrixAt(i++, m.makeTranslation(x, deckY(7) + 2.9, side * 22.1));
      for (const dx of [-3.4, 3.4]) arms.setMatrixAt(j++, m.makeTranslation(x + dx, deckY(7) + 5.1, side * 21.0));
    }
  }
  g.add(boats, arms);
  return g;
}

function buildFunnel(M) {
  const { x0, x1, halfWidth, base, height } = FUNNEL;
  const shape = new THREE.Shape([
    new THREE.Vector2(x0, 0),
    new THREE.Vector2(x1, 0),
    new THREE.Vector2(x1 - 3.4, height - 1.4),
    new THREE.Vector2(x0 + 4.6, height),
  ]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: halfWidth * 2 - 1.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 4, curveSegments: 1,
  });
  geo.translate(0, base, -(halfWidth - 0.6));
  const g = new THREE.Group();
  g.name = 'funnel';
  g.add(new THREE.Mesh(geo, M.funnel));
  const pipe = new THREE.CylinderGeometry(0.55, 0.55, 2.4, 16);
  for (const [dx, dz] of [[-31, -1.6], [-31, 1.6], [-28, 0]]) {
    const p = new THREE.Mesh(pipe, M.dark);
    p.position.set(dx, base + height - 0.2, dz);
    g.add(p);
  }
  return g;
}

function buildMastAndBridge(M) {
  const g = new THREE.Group();
  g.name = 'mast';
  const y22 = deckY(22);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 9, 12), M.white);
  pole.position.set(100, y22 + 4.5, 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 9), M.white);
  bar.position.set(100, y22 + 6.5, 0);
  g.add(pole, bar);
  for (const z of [-3.6, 3.6]) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 14), M.radome);
    dome.position.set(100, y22 + 7.9, z);
    g.add(dome);
  }
  const radar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 5), M.dark);
  radar.position.set(98.5, y22 + 3.2, 0);
  g.add(radar);

  // Alette di plancia (ponte 15), sporgenti oltre la murata come sulle navi reali.
  const y15 = deckY(15);
  for (const side of [1, -1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 2.9, 6.8), [M.white, M.white, M.white, M.white, M.glassFacade, M.white]);
    wing.position.set(115, y15 + 1.45, side * 21.9);
    g.add(wing);
  }
  return g;
}

class Helix extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * SPIRAL.turns * Math.PI * 2;
    return target.set(
      SPIRAL.x + SPIRAL.radius * Math.cos(a),
      SPIRAL.yTop - t * (SPIRAL.yTop - SPIRAL.yBottom),
      SPIRAL.z + SPIRAL.radius * Math.sin(a),
    );
  }
}

function buildSpiral(M) {
  const g = new THREE.Group();
  g.name = 'spiral';
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 1400, 0.85, 14, false), M.spiral));
  const h = SPIRAL.yTop - SPIRAL.yBottom + 2;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, h, 16), M.frame);
  column.position.set(SPIRAL.x, SPIRAL.yBottom - 1 + h / 2, SPIRAL.z);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(SPIRAL.radius + 1.6, SPIRAL.radius + 1.6, 0.5, 32), M.white);
  cap.position.set(SPIRAL.x, SPIRAL.yTop + 2.4, SPIRAL.z);
  // Passerella di partenza verso il ponte 22.
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 3), M.white);
  bridge.position.set(-59, SPIRAL.yTop + 0.6, 0);
  g.add(column, cap, bridge);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, h, 8), M.frame);
    leg.position.set(SPIRAL.x + (SPIRAL.radius + 1.3) * Math.cos(a), SPIRAL.yBottom - 1 + h / 2, SPIRAL.z + (SPIRAL.radius + 1.3) * Math.sin(a));
    g.add(leg);
  }
  return g;
}

function buildSlides(M) {
  const g = new THREE.Group();
  g.name = 'slides';
  const y22 = deckY(22);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 6.4, 8), M.white);
  tower.position.set(-50, y22 + 3.2, 4);
  g.add(tower);
  const v = (x, y, z) => new THREE.Vector3(x, y22 + y, z);
  const paths = [
    [M.slideYellow, [v(-48, 5.6, 8), v(-44, 4.8, 21), v(-34, 4.0, 25.6), v(-24, 3.2, 22), v(-27, 2.4, 14), v(-37, 1.6, 16), v(-40, 0.8, 23.5), v(-28, -0.6, 26), v(-12, -3.2, 23), v(3, -5.3, 19.5)]],
    [M.slideBlue, [v(-48, 5.6, 0), v(-44, 4.8, -14), v(-33, 3.8, -25.5), v(-21, 2.6, -22), v(-24, 1.6, -13), v(-35, 0.6, -17), v(-30, -1.0, -25.8), v(-14, -3.4, -23), v(2, -5.4, -19.5)]],
    [M.slideRed, [v(-52, 5.6, 6), v(-46, 4.6, 12), v(-36, 3.6, 8), v(-36, 2.6, -3), v(-45, 1.6, -6), v(-49, 1.0, -1)]],
  ];
  for (const [mat, pts] of paths) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.75, 12, false), mat));
  }
  return g;
}

// Piano con UV in metri (per le texture fotografiche).
function planeM(w, d) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  return g;
}

function buildPools(M) {
  const g = new THREE.Group();
  g.name = 'pools';
  const rim = [];
  const basin = [];
  const water = [];
  for (const p of POOLS) {
    const w = p.x[1] - p.x[0];
    const d = p.z[1] - p.z[0];
    const cx = (p.x[0] + p.x[1]) / 2;
    const cz = (p.z[0] + p.z[1]) / 2;
    const t = 0.45;
    const h = 0.55;
    const box = (sx, sz, x, z) => new THREE.BoxGeometry(sx, h, sz).translate(x, p.y + h / 2, z);
    rim.push(
      box(w + 2 * t, t, cx, p.z[0] - t / 2), box(w + 2 * t, t, cx, p.z[1] + t / 2),
      box(t, d, p.x[0] - t / 2, cz), box(t, d, p.x[1] + t / 2, cz),
    );
    // Fondo e pareti interne piastrellati, visibili attraverso l'acqua.
    basin.push(planeM(w, d).rotateX(-Math.PI / 2).translate(cx, p.y + 0.03, cz));
    for (const [len, x, z, ry] of [[w, cx, p.z[0] + 0.01, 0], [w, cx, p.z[1] - 0.01, Math.PI], [d, p.x[0] + 0.01, cz, Math.PI / 2], [d, p.x[1] - 0.01, cz, -Math.PI / 2]]) {
      basin.push(planeM(len, h).rotateY(ry).translate(x, p.y + h / 2, z));
    }
    water.push(planeM(w, d).rotateX(-Math.PI / 2).translate(cx, p.y + h - 0.12, cz));
  }
  for (const [x, z, y] of JACUZZIS) {
    rim.push(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 32, 1, true).translate(x, y + 0.3, z));
    basin.push(new THREE.CircleGeometry(2.0, 32).rotateX(-Math.PI / 2).translate(x, y + 0.04, z));
    water.push(new THREE.CircleGeometry(2.0, 32).rotateX(-Math.PI / 2).translate(x, y + 0.48, z));
  }
  g.add(new THREE.Mesh(mergeGeometries(rim), M.poolTile));
  g.add(new THREE.Mesh(mergeGeometries(basin), M.poolBasin));
  g.add(new THREE.Mesh(mergeGeometries(water), M.water));
  return g;
}

function buildBotanicRoof(M) {
  const { x, half, spring, crown } = BOTANIC_ROOF;
  const s = crown - spring;
  const R = (half * half + s * s) / (2 * s);
  const th = Math.asin(half / R);
  const len = x[1] - x[0];
  const g = new THREE.Group();
  g.name = 'botanicRoof';
  const vault = new THREE.CylinderGeometry(R, R, len, 48, 1, true, Math.PI / 2 - th, 2 * th);
  vault.rotateZ(Math.PI / 2);
  vault.translate((x[0] + x[1]) / 2, crown - R, 0);
  g.add(new THREE.Mesh(vault, M.vaultGlass));
  const ribs = [];
  for (let xi = x[0]; xi <= x[1] + 0.01; xi += len / 9) {
    const pts = sampleRange(-th, th, 0.05).map((a) => new THREE.Vector3(xi, crown - R + R * Math.cos(a), R * Math.sin(a)));
    ribs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.14, 6, false));
  }
  for (const a of [-th, -th / 2, 0, th / 2, th]) {
    const y = crown - R + R * Math.cos(a);
    const z = R * Math.sin(a);
    ribs.push(new THREE.CylinderGeometry(0.12, 0.12, len, 6).rotateZ(Math.PI / 2).translate((x[0] + x[1]) / 2, y, z));
  }
  g.add(new THREE.Mesh(mergeGeometries(ribs), M.frame));
  return g;
}

// Contorno del ponte n (per evidenziarlo nel visualizzatore).
export function deckOutlineSegments(y) {
  const loops = [];
  for (const s of STRUCTURES) {
    if (y >= s.y[0] - 0.05 && y <= s.y[1] + 0.05) loops.push(outlinePolygon(s, 1.5, true));
  }
  return loops;
}

export { footprintAt };

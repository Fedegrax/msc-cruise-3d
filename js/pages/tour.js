// Tour a bordo in stile Street View: punti collegati, frecce sul pavimento, mappa del ponte.
import * as THREE from 'three';
import { SHIP, TOUR_NODES } from '../data/world-europa.js';
import { createStage, project } from '../three/stage.js';
import { setupSpaces, nodeEye, nodeFloorY } from '../three/spaces.js';
import { deckPlanSVG } from '../ui/deckplan.js';
import { ICONS } from '../ui/icons.js';

const $ = (s) => document.querySelector(s);
document.querySelectorAll('[data-icon]').forEach((e) => { e.outerHTML = ICONS[e.dataset.icon]; });

const canvas = $('#tour-canvas');
const overlay = $('#overlay');
const byId = Object.fromEntries(TOUR_NODES.map((n) => [n.id, n]));
const DECKS_WITH_NODES = [...new Set(TOUR_NODES.map((n) => n.deck))].sort((a, b) => a - b);

const stage = await createStage(canvas, { fov: 75 });
const { camera, scene } = stage;
camera.near = 0.1;
camera.updateProjectionMatrix();
const spaces = setupSpaces(stage);

// Foto equirettangolare opzionale per nodo (se presente sostituisce la vista 3D).
const photoSphere = new THREE.Mesh(
  new THREE.SphereGeometry(40, 64, 32).scale(-1, 1, 1),
  new THREE.MeshBasicMaterial({ toneMapped: false }),
);
photoSphere.visible = false;
scene.add(photoSphere);
const textureLoader = new THREE.TextureLoader();

const view = { yaw: 0, pitch: -0.2, fov: 75, vyaw: 0, vpitch: 0 };
let node = null;
let moving = null;

function applyView() {
  const cp = Math.cos(view.pitch);
  const dir = new THREE.Vector3(Math.cos(view.yaw) * cp, Math.sin(view.pitch), Math.sin(view.yaw) * cp);
  camera.lookAt(camera.position.clone().add(dir));
  if (camera.fov !== view.fov) {
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }
}

// ---------------------------------------------------------------------------
// Frecce sul pavimento (una per ogni collegamento del nodo).

const chevronGeo = (() => {
  const s = new THREE.Shape([[0.45, 0], [-0.25, 0.5], [-0.25, 0.27], [0.12, 0], [-0.25, -0.27], [-0.25, -0.5]].map(([u, v]) => new THREE.Vector2(u, v)));
  return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2);
})();
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false });
const arrowHover = new THREE.MeshBasicMaterial({ color: 0xf2b544, transparent: true, opacity: 1, depthTest: false });
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0a1a2f, transparent: true, opacity: 0.55, depthTest: false });
const arrows = new THREE.Group();
arrows.renderOrder = 10;
scene.add(arrows);
let arrowLabels = [];

const dirTo = (a, b) => Math.atan2(b.pos[1] - a.pos[1], b.pos[0] - a.pos[0]);

function buildArrows() {
  arrows.clear();
  overlay.querySelectorAll('.arrow-label').forEach((e) => e.remove());
  arrowLabels = [];
  if (!node) return;
  const eye = nodeEye(node);
  const floorY = nodeFloorY(node) + 0.04;
  for (const id of node.links) {
    const to = byId[id];
    const a = dirTo(node, to);
    const g = new THREE.Group();
    const pos = new THREE.Vector3(eye.x + Math.cos(a) * 3.6, floorY, eye.z + Math.sin(a) * 3.6);
    const shade = new THREE.Mesh(chevronGeo, shadowMat);
    shade.scale.setScalar(1.15);
    shade.position.y = -0.01;
    const m = new THREE.Mesh(chevronGeo, arrowMat);
    m.userData.target = id;
    g.add(shade, m);
    g.position.copy(pos);
    g.rotation.y = -a;
    g.scale.setScalar(1.7);
    g.renderOrder = 10;
    shade.renderOrder = 10;
    m.renderOrder = 11;
    arrows.add(g);
    const label = document.createElement('span');
    label.className = 'arrow-label';
    const cross = to.deck !== node.deck ? ` · ponte ${to.deck}` : '';
    label.textContent = `${to.name}${cross}`;
    overlay.appendChild(label);
    arrowLabels.push({ el: label, p: pos.clone().add(new THREE.Vector3(Math.cos(a) * 1.4, 0.05, Math.sin(a) * 1.4)) });
  }
}

// ---------------------------------------------------------------------------
// Punti informativi (hotspot).

let hotspots = [];
function buildHotspots() {
  overlay.querySelectorAll('.hotspot').forEach((e) => e.remove());
  hotspots = (node?.hotspots || []).map((h, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'hotspot';
    wrap.innerHTML = `<button type="button" aria-expanded="${i === 0}" aria-label="Informazioni: ${h.title}">${ICONS.info}</button>
      <div class="card-info"${i === 0 ? '' : ' hidden'}><b>${h.title}</b><span>${h.text}</span></div>`;
    const btn = wrap.querySelector('button');
    const card = wrap.querySelector('.card-info');
    btn.addEventListener('click', () => {
      card.hidden = !card.hidden;
      btn.setAttribute('aria-expanded', String(!card.hidden));
    });
    overlay.appendChild(wrap);
    return { el: wrap, p: new THREE.Vector3(...h.at) };
  });
}

// ---------------------------------------------------------------------------
// Pannelli: dove sono, bussola, mappa, filmstrip.

function headingText() {
  const c = Math.cos(view.yaw);
  const s = Math.sin(view.yaw);
  if (c > 0.7) return 'Guardi verso prua';
  if (c < -0.7) return 'Guardi verso poppa';
  return s > 0 ? 'Guardi verso dritta' : 'Guardi verso babordo';
}

function renderMap() {
  const { svg } = deckPlanSVG(node.deck, { labels: false, current: node.id, yaw: view.yaw, onNode: (id) => goTo(id) });
  $('#minimap').replaceChildren(svg);
  const onDeck = TOUR_NODES.filter((n) => n.deck === node.deck);
  $('#map-title').textContent = `Mappa · Ponte ${node.deck}`;
  $('#map-step').textContent = `PUNTO ${onDeck.indexOf(node) + 1} DI ${onDeck.length}`;
  $('#deck-num').textContent = node.deck;
  const i = DECKS_WITH_NODES.indexOf(node.deck);
  $('#deck-down').disabled = i <= 0;
  $('#deck-up').disabled = i >= DECKS_WITH_NODES.length - 1;
}

function updateCone() {
  const cone = $('#minimap .view-cone');
  if (!cone || !node) return;
  const [x, z] = node.pos;
  const r = 16;
  const s = 0.5;
  const a = view.yaw;
  const p1 = [x + r * Math.cos(a - s), z + r * Math.sin(a - s)];
  const p2 = [x + r * Math.cos(a + s), z + r * Math.sin(a + s)];
  cone.setAttribute('d', `M${x},${z} L${p1[0]},${p1[1]} A${r},${r} 0 0 1 ${p2[0]},${p2[1]} Z`);
}

const strip = $('#strip');
strip.innerHTML = TOUR_NODES.map((n) => `
  <button type="button" data-node="${n.id}" aria-current="false">
    <img alt="" data-thumb="${n.id}">
    <span>${n.name}</span><small>PONTE ${n.deck}</small>
  </button>`).join('');
strip.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-node]');
  if (b) goTo(b.dataset.node);
});

function updatePanels() {
  $('#node-name').textContent = node.name;
  $('#node-meta').textContent = `${SHIP.name} · Ponte ${node.deck} · ${node.area}`;
  document.title = `${node.name} · Tour 360° · ${SHIP.name}`;
  for (const b of strip.querySelectorAll('button')) {
    const cur = b.dataset.node === node.id;
    b.setAttribute('aria-current', String(cur));
    if (cur) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  renderMap();
}

// ---------------------------------------------------------------------------
// Spostamenti: camminata nello stesso spazio e ponte, dissolvenza altrimenti.

const fade = $('#fade');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function showPhoto(n) {
  if (!n.photo) {
    photoSphere.visible = false;
    return;
  }
  const tex = await textureLoader.loadAsync(n.photo);
  tex.colorSpace = THREE.SRGBColorSpace;
  photoSphere.material.map = tex;
  photoSphere.material.needsUpdate = true;
  photoSphere.position.copy(nodeEye(n));
  photoSphere.visible = true;
  stage.ship.visible = false;
}

async function goTo(id, { instant = false } = {}) {
  const to = byId[id];
  if (!to || moving || to === node) return;
  const from = node;
  const walk = !instant && from && from.space === to.space && from.deck === to.deck && !to.photo && !from.photo;
  if (walk) {
    const p0 = camera.position.clone();
    const p1 = nodeEye(to);
    moving = { t: 0, dur: Math.min(1.8, Math.max(0.7, p0.distanceTo(p1) / 9)), p0, p1, to };
    arrows.visible = false;
    arrowLabels.forEach((l) => { l.el.style.display = 'none'; });
    return;
  }
  moving = { fading: true };
  if (!instant) {
    fade.classList.add('on');
    await wait(360);
  }
  spaces.set(to.space);
  camera.position.copy(nodeEye(to));
  view.yaw = to.yaw;
  view.pitch = -0.12;
  arrive(to);
  await showPhoto(to);
  moving = null;
  fade.classList.remove('on');
}

function arrive(to) {
  node = to;
  history.replaceState(null, '', `#${to.id}`);
  buildArrows();
  buildHotspots();
  updatePanels();
  arrows.visible = true;
}

stage.onTick((dt) => {
  if (moving && !moving.fading) {
    moving.t += dt;
    const k = Math.min(1, moving.t / moving.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(moving.p0, moving.p1, e);
    if (k >= 1) {
      const to = moving.to;
      moving = null;
      arrive(to);
    }
  }
  // Inerzia del trascinamento.
  if (!dragging && (Math.abs(view.vyaw) > 1e-4 || Math.abs(view.vpitch) > 1e-4)) {
    view.yaw += view.vyaw;
    view.pitch = THREE.MathUtils.clamp(view.pitch + view.vpitch, -1.3, 1.3);
    view.vyaw *= 0.9;
    view.vpitch *= 0.9;
  }
  applyView();
  $('#heading-text').textContent = headingText();
  updateCone();

  for (const l of arrowLabels) {
    const s = project(l.p, camera, canvas);
    const show = s.visible && arrows.visible;
    l.el.style.display = show ? '' : 'none';
    if (show) l.el.style.transform = `translate(${s.x}px, ${s.y + 34}px) translate(-50%, -50%)`;
  }
  for (const h of hotspots) {
    const s = project(h.p, camera, canvas);
    h.el.style.display = s.visible && !moving ? '' : 'none';
    if (s.visible) h.el.style.transform = `translate(${s.x - 22}px, ${s.y - 22}px)`;
  }
});

// ---------------------------------------------------------------------------
// Input: trascinamento, click su frecce/pavimento, zoom, tastiera.

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let dragging = false;
let down = null;
const pointers = new Map();

function toNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}

function arrowAt(e) {
  toNdc(e);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(arrows.children, true).find((h) => h.object.userData.target);
  return hit?.object;
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  dragging = true;
  view.vyaw = view.vpitch = 0;
  canvas.classList.add('dragging');
});

let hovered = null;
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (prev && pointers.size === 2) {
    // Pizzico: zoom.
    const [a, b] = [...pointers.values()];
    const d0 = Math.hypot(a.x - b.x, a.y - b.y);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [c, d] = [...pointers.values()];
    const d1 = Math.hypot(c.x - d.x, c.y - d.y);
    view.fov = THREE.MathUtils.clamp(view.fov * (d0 / d1), 30, 90);
    return;
  }
  if (dragging && prev) {
    const k = (view.fov * Math.PI) / 180 / canvas.clientHeight;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    view.yaw -= dx * k;
    view.pitch = THREE.MathUtils.clamp(view.pitch + dy * k, -1.3, 1.3);
    view.vyaw = -dx * k * 0.5;
    view.vpitch = dy * k * 0.5;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    return;
  }
  const a = arrowAt(e);
  if (a !== hovered) {
    if (hovered) hovered.material = arrowMat;
    hovered = a;
    if (a) a.material = arrowHover;
    canvas.style.cursor = a ? 'pointer' : '';
  }
});

canvas.addEventListener('pointerup', (e) => {
  pointers.delete(e.pointerId);
  dragging = pointers.size > 0;
  canvas.classList.remove('dragging');
  if (!down || pointers.size) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  view.vyaw = view.vpitch = 0;
  const a = arrowAt(e);
  if (a) return goTo(a.userData.target);
  // Click sul pavimento: vai al collegamento più vicino alla direzione cliccata (come in Street View).
  toNdc(e);
  raycaster.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -nodeFloorY(node));
  const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  if (hit) goToward(Math.atan2(hit.z - camera.position.z, hit.x - camera.position.x), 0.7);
});
canvas.addEventListener('pointercancel', (e) => {
  pointers.delete(e.pointerId);
  dragging = false;
});

function goToward(angle, tolerance) {
  let best = null;
  let bestD = tolerance;
  for (const id of node.links) {
    let d = Math.abs(dirTo(node, byId[id]) - angle) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  if (best) goTo(best);
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  view.fov = THREE.MathUtils.clamp(view.fov * (1 + Math.sign(e.deltaY) * 0.08), 30, 90);
}, { passive: false });

canvas.addEventListener('keydown', (e) => {
  const step = 0.15;
  if (e.key === 'ArrowLeft') view.yaw -= step;
  else if (e.key === 'ArrowRight') view.yaw += step;
  else if (e.key === 'ArrowUp') goToward(view.yaw, 1.1);
  else if (e.key === 'ArrowDown') goToward(view.yaw + Math.PI, 1.1);
  else if (e.key === '+' || e.key === '=') view.fov = Math.max(30, view.fov - 6);
  else if (e.key === '-') view.fov = Math.min(90, view.fov + 6);
  else return;
  e.preventDefault();
});

$('#zoom-in').addEventListener('click', () => { view.fov = Math.max(30, view.fov - 10); });
$('#zoom-out').addEventListener('click', () => { view.fov = Math.min(90, view.fov + 10); });
$('#full').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else $('#tour').requestFullscreen?.();
});

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
}
$('#share').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Link della vista copiato');
  } catch {
    toast(location.href);
  }
});

$('#deck-up').addEventListener('click', () => changeDeck(1));
$('#deck-down').addEventListener('click', () => changeDeck(-1));
function changeDeck(dir) {
  const i = DECKS_WITH_NODES.indexOf(node.deck) + dir;
  const deck = DECKS_WITH_NODES[i];
  if (deck == null) return;
  goTo(TOUR_NODES.find((n) => n.deck === deck).id);
}

// Giroscopio (smartphone): l'orientamento del telefono guida la vista.
const gyroBtn = $('#gyro');
if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
  gyroBtn.hidden = false;
  let base = null;
  const onOrient = (e) => {
    if (e.alpha == null) return;
    if (base == null) base = { alpha: e.alpha, yaw: view.yaw };
    view.yaw = base.yaw - THREE.MathUtils.degToRad(e.alpha - base.alpha);
    view.pitch = THREE.MathUtils.clamp(THREE.MathUtils.degToRad((e.beta ?? 90) - 90), -1.3, 1.3);
  };
  gyroBtn.addEventListener('click', async () => {
    const on = gyroBtn.getAttribute('aria-pressed') !== 'true';
    if (on && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
      if (res !== 'granted') return toast('Permesso per il giroscopio negato');
    }
    gyroBtn.setAttribute('aria-pressed', String(on));
    base = null;
    if (on) addEventListener('deviceorientation', onOrient);
    else removeEventListener('deviceorientation', onOrient);
  });
}

// ---------------------------------------------------------------------------
// Avvio.

const start = byId[location.hash.slice(1)] ? location.hash.slice(1) : 'promenade-mid';
await goTo(start, { instant: true });
$('#loading').classList.add('done');
canvas.focus({ preventScroll: true });
addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (byId[id] && id !== node.id) goTo(id);
});

// Miniature della filmstrip, renderizzate dal modello (una alla volta per non bloccare).
const queue = TOUR_NODES.slice();
function nextThumb() {
  const n = queue.shift();
  if (!n) {
    window.__ready = true;
    return;
  }
  if (moving) {
    queue.unshift(n);
    setTimeout(nextThumb, 300);
    return;
  }
  const eye = nodeEye(n);
  const look = eye.clone().add(new THREE.Vector3(Math.cos(n.yaw), -0.08, Math.sin(n.yaw)));
  const url = stage.snapshot(eye, look, {
    width: 256, height: 140, fov: 80,
    before: () => { arrows.visible = false; spaces.set(n.space); },
    after: () => { spaces.set(node.space); arrows.visible = true; },
  });
  strip.querySelector(`img[data-thumb="${n.id}"]`).src = url;
  setTimeout(nextThumb, 80);
}
if (!window.__noThumbs) setTimeout(nextThumb, 400);

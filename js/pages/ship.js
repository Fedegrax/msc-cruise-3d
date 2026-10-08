import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SHIP, DECKS, ZONES, TOUR_NODES, CRUISES } from '../data/world-europa.js';
import { startStage, project } from '../three/stage.js';
import { setupSpaces, nodeEye } from '../three/spaces.js';
import { Cinematic, CHAPTERS, fmt } from '../three/cinematic.js';
import { deckPlanSVG, deckPolygons, ZONE_COLORS } from '../ui/deckplan.js';
import { ICONS } from '../ui/icons.js';

const $ = (s) => document.querySelector(s);
const fillIcons = (root) => root.querySelectorAll('[data-icon]').forEach((e) => { e.outerHTML = ICONS[e.dataset.icon]; });
fillIcons(document);

const viewer = $('#viewer');
const canvas = $('#ship-canvas');
const labels = $('#labels');

// ---------------------------------------------------------------------------
// Contenuti statici (scheda tecnica, itinerario, lista ponti).

const nf = new Intl.NumberFormat('it-IT');
$('#facts').innerHTML = [
  ['Stazza lorda', `${nf.format(SHIP.grossTonnage)} GT`],
  ['Lunghezza', `${nf.format(SHIP.length)} m`],
  ['Larghezza', `${SHIP.beam} m`],
  ['Pescaggio', `≈ ${SHIP.draft} m`],
  ['Ospiti (max)', nf.format(SHIP.guests)],
  ['Equipaggio', nf.format(SHIP.crew)],
  ['Cabine', SHIP.cabins],
  ['Ponti passeggeri', `${DECKS.length} (5–22)`],
  ['Cantiere', 'Saint-Nazaire'],
  ['In servizio dal', SHIP.delivered],
].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

$('#itin').innerHTML = CRUISES[0].days.map((p, i) => `<li><small>Giorno ${i + 1}</small><b>${p}</b></li>`).join('');

const deckList = $('#deck-list');
deckList.innerHTML = DECKS.slice().reverse().map((d) => `
  <li><button type="button" data-deck="${d.n}" aria-pressed="false">
    <span class="n">${d.n}</span>
    <span class="t"><b>${d.summary}</b><small>Ponte ${d.n} · ${d.city}</small></span>
  </button></li>`).join('');

// ---------------------------------------------------------------------------
// Scena 3D.

const stage = await startStage(canvas, $('#loading'));
const { camera, scene } = stage;
const spaces = setupSpaces(stage);
// Su schermi stretti (telefono in verticale) la camera si allontana per far stare la nave.
const fit = (pos, target) => {
  const k = Math.max(1, 1.4 / camera.aspect);
  return pos.map((v, i) => target[i] + (v - target[i]) * k);
};
camera.position.set(...fit([250, 80, 215], [10, 25, 0]));
const controls = new OrbitControls(camera, canvas);
controls.target.set(10, 25, 0);
controls.enableDamping = true;
controls.minDistance = 40;
controls.maxDistance = 1400;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.update();
$('#loading').classList.add('done');

const VIEWS = {
  threeQuarter: [[250, 80, 215], [10, 25, 0]],
  starboard: [[0, 45, 540], [0, 25, 0]],
  port: [[0, 45, -540], [0, 25, 0]],
  bow: [[470, 60, 0], [0, 25, 0]],
  stern: [[-470, 70, 0], [0, 25, 0]],
  top: [[0, 640, 0.1], [0, 0, 0]],
};

let tween = null;
function flyTo(pos, target, dur = 1.3) {
  tween = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target) };
}
stage.onTick((dt) => {
  if (!tween) return;
  tween.t += dt;
  const k = Math.min(1, tween.t / tween.dur);
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  controls.target.lerpVectors(tween.t0, tween.t1, e);
  if (k >= 1) tween = null;
});

const viewLabel = $('#view-label');
function describeView() {
  const d = camera.position.clone().sub(controls.target);
  if (d.y / d.length() > 0.85) return 'Vista dall’alto';
  const a = Math.atan2(d.z, d.x) * (180 / Math.PI);
  const names = [[0, 'prua'], [45, '3/4 prua · dritta'], [90, 'fianco di dritta'], [135, '3/4 poppa · dritta'], [180, 'poppa'], [-45, '3/4 prua · babordo'], [-90, 'fianco di babordo'], [-135, '3/4 poppa · babordo'], [-180, 'poppa']];
  let best = names[0];
  for (const n of names) if (Math.abs(n[0] - a) < Math.abs(best[0] - a)) best = n;
  return `Vista: ${best[1]}`;
}

// ---------------------------------------------------------------------------
// Ponte selezionato: evidenziazione, sezione e aree in 3D.

const state = { mode: 'model', deck: 8, cut: false };
const highlight = new THREE.Group();
scene.add(highlight);
const amber = new THREE.MeshBasicMaterial({ color: 0xf2b544, side: THREE.DoubleSide });
let zoneAnchors = [];

function ribbon(poly, y) {
  const pos = [];
  const idx = [];
  const ring = poly.concat([poly[0]]);
  ring.forEach(([x, z], i) => {
    pos.push(x, y, z, x, y + 1.6, z);
    if (i < ring.length - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function updateDeck() {
  const d = DECKS.find((k) => k.n === state.deck);
  highlight.clear();
  labels.innerHTML = '';
  zoneAnchors = [];
  for (const b of deckList.querySelectorAll('button')) b.setAttribute('aria-pressed', String(+b.dataset.deck === state.deck));

  const polys = deckPolygons(state.deck);
  if (!state.cut) {
    for (const p of polys) highlight.add(new THREE.Mesh(ribbon(p, d.y + 0.1), amber));
    stage.setCut(null);
  } else {
    stage.setCut(d.y + 2.4);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe4e9ef, roughness: 0.9 });
    for (const p of polys) {
      const shape = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, d.y + 0.06, 0);
      highlight.add(new THREE.Mesh(g, floorMat));
    }
    for (const z of ZONES[state.deck] || []) {
      const w = z.x[1] - z.x[0] - 0.6;
      const h = z.z[1] - z.z[0] - 0.6;
      const mat = new THREE.MeshStandardMaterial({ color: ZONE_COLORS[z.kind][0], roughness: 0.8 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), mat);
      m.position.set((z.x[0] + z.x[1]) / 2, d.y + 0.12, (z.z[0] + z.z[1]) / 2);
      highlight.add(m);
      const lab = document.createElement('span');
      lab.className = 'zone-label';
      lab.textContent = z.name;
      labels.appendChild(lab);
      zoneAnchors.push({ el: lab, p: m.position.clone(), a: new THREE.Vector3(z.x[0], d.y, (z.z[0] + z.z[1]) / 2), b: new THREE.Vector3(z.x[1], d.y, (z.z[0] + z.z[1]) / 2) });
    }
  }
  if (state.mode === 'plan') renderPlan();
}

stage.onTick(() => {
  if (state.mode === 'model') controls.update();
  viewLabel.textContent = state.mode === 'model' ? describeView() : state.mode === 'video' ? 'Video tour' : `Ponte ${state.deck}`;
  if (!zoneAnchors.length) return;
  for (const a of zoneAnchors) {
    const s = project(a.p, camera, canvas);
    const span = Math.abs(project(a.b, camera, canvas).x - project(a.a, camera, canvas).x);
    const show = s.visible && state.mode === 'model' && span > a.el.offsetWidth + 8;
    a.el.style.display = show ? '' : 'none';
    if (show) a.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
  }
});

deckList.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-deck]');
  if (!b) return;
  state.deck = +b.dataset.deck;
  updateDeck();
  if (state.mode === 'video') setMode('model');
});

// ---------------------------------------------------------------------------
// Barra strumenti del modello.

const tools = $('#model-tools');
tools.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const off = camera.position.clone().sub(controls.target);
  switch (b.dataset.act) {
    case 'rotL':
    case 'rotR': {
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (b.dataset.act === 'rotL' ? 1 : -1) * Math.PI / 4);
      flyTo(controls.target.clone().add(off).toArray(), controls.target.toArray(), 0.8);
      break;
    }
    case 'zoomIn':
    case 'zoomOut': {
      off.multiplyScalar(b.dataset.act === 'zoomIn' ? 0.7 : 1.4);
      if (off.length() < controls.minDistance || off.length() > controls.maxDistance) break;
      flyTo(controls.target.clone().add(off).toArray(), controls.target.toArray(), 0.6);
      break;
    }
    case 'cut': {
      state.cut = !state.cut;
      b.setAttribute('aria-pressed', String(state.cut));
      updateDeck();
      if (state.cut) {
        const y = DECKS.find((d) => d.n === state.deck).y;
        flyTo([70, y + 190, 170], [0, y, 0]);
      }
      break;
    }
    case 'full':
      toggleFull();
      break;
    default:
  }
});
$('#cine [data-act="full"]').addEventListener('click', toggleFull);
function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen();
  else viewer.requestFullscreen?.();
}
$('#view-select').addEventListener('change', (e) => {
  const [pos, target] = VIEWS[e.target.value];
  flyTo(fit(pos, target), target);
});

// ---------------------------------------------------------------------------
// Video tour.

const cine = new Cinematic(camera);
const playBtn = $('#cine-play');
const recBtn = $('#cine-rec');
const progress = $('#cine-progress');
const fill = progress.querySelector('.fill');
const chapterList = $('#chapter-list');
let recorder = null;

chapterList.innerHTML = CHAPTERS.map((c, i) => `<li><button type="button" data-ch="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${c.title}</button></li>`).join('');
for (const s of cine.starts) {
  const m = document.createElement('span');
  m.className = 'mark';
  m.style.left = `${(s / cine.duration) * 100}%`;
  progress.appendChild(m);
}
const setPlay = (on) => {
  cine.playing = on;
  playBtn.innerHTML = on ? ICONS.pause : ICONS.play;
  playBtn.setAttribute('aria-label', on ? 'Pausa' : 'Riproduci');
};
setPlay(false);
recBtn.innerHTML = ICONS.record;

function showChapter(i) {
  $('#chapter-title').textContent = CHAPTERS[i].title;
  chapterList.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.ch === i)));
}

stage.onTick((dt) => {
  if (state.mode !== 'video') return;
  if (cine.playing) cine.t += dt;
  if (cine.t >= cine.duration) {
    cine.t = cine.duration;
    setPlay(false);
    if (recorder) recorder.stop();
  }
  const i = cine.apply(cine.t);
  showChapter(i);
  const pct = (cine.t / cine.duration) * 100;
  fill.style.width = `${pct}%`;
  progress.setAttribute('aria-valuenow', Math.round(pct));
  $('#cine-time').textContent = `${fmt(cine.t)} / ${fmt(cine.duration)}`;
});

playBtn.addEventListener('click', () => {
  if (cine.t >= cine.duration) cine.t = 0;
  setPlay(!cine.playing);
});
chapterList.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-ch]');
  if (!b) return;
  cine.t = cine.starts[+b.dataset.ch];
  setPlay(true);
});
progress.addEventListener('click', (e) => {
  const r = progress.getBoundingClientRect();
  cine.t = ((e.clientX - r.left) / r.width) * cine.duration;
});
progress.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') cine.t = Math.min(cine.duration, cine.t + 5);
  if (e.key === 'ArrowLeft') cine.t = Math.max(0, cine.t - 5);
});

// Registrazione: cattura il canvas mentre il tour scorre e scarica un file .webm.
recBtn.addEventListener('click', () => {
  if (recorder) {
    recorder.stop();
    return;
  }
  if (!window.MediaRecorder || !canvas.captureStream) {
    alert('Il tuo browser non supporta la registrazione del canvas.');
    return;
  }
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  const chunks = [];
  recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 8e6 });
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    a.download = 'msc-world-europa-video-tour.webm';
    a.click();
    recorder = null;
    recBtn.innerHTML = ICONS.record;
    recBtn.setAttribute('aria-label', 'Registra e scarica il video');
  };
  recorder.start();
  recBtn.innerHTML = ICONS.stop;
  recBtn.setAttribute('aria-label', 'Interrompi la registrazione');
  cine.t = 0;
  setPlay(true);
});

// ---------------------------------------------------------------------------
// Piani ponte.

function renderPlan() {
  const d = DECKS.find((k) => k.n === state.deck);
  $('#plan-title').textContent = `Ponte ${d.n} · ${d.city} — ${d.summary}`;
  const { svg, legend } = deckPlanSVG(state.deck, {
    nodes: true,
    zoneHref: (z) => (z.node ? `tour.html#${z.node}` : null),
  });
  $('#plan-svg').replaceChildren(svg);
  const kinds = [...new Set((ZONES[state.deck] || []).map((z) => z.kind))];
  $('#plan-legend').innerHTML = kinds.map((k) => `<span><i style="background:${ZONE_COLORS[k][0]}"></i>${ZONE_COLORS[k][1]}</span>`).join('')
    + '<span><i style="background:#fff;border-radius:50%"></i>Punto del tour 360°</span>';
  $('#plan-zones').innerHTML = legend.map((z) => `<li><b class="zn">${z.num}</b><i style="background:${ZONE_COLORS[z.kind][0]}"></i>${z.href ? `<a href="${z.href}">${z.name} · 360°</a>` : z.name}</li>`).join('');
}

// ---------------------------------------------------------------------------
// Modalità (tab).

function setMode(mode) {
  state.mode = mode;
  for (const t of document.querySelectorAll('[role="tab"]')) t.setAttribute('aria-selected', String(t.dataset.mode === mode));
  tools.hidden = mode !== 'model';
  $('#cine').hidden = mode !== 'video';
  $('#plan').hidden = mode !== 'plan';
  $('#side-chapters').hidden = chapterList.hidden = mode !== 'video';
  $('#side-decks').hidden = deckList.hidden = mode === 'video';
  controls.enabled = mode === 'model';
  labels.hidden = mode !== 'model';
  if (mode === 'video') {
    highlight.visible = false;
    stage.setCut(null);
    setPlay(true);
  } else {
    setPlay(false);
    highlight.visible = true;
    if (mode === 'model') {
      controls.target.copy(cine.target.lengthSq() ? cine.target : controls.target);
      updateDeck();
    }
    if (mode === 'plan') renderPlan();
  }
}
document.querySelector('[role="tablist"]').addEventListener('click', (e) => {
  const t = e.target.closest('[role="tab"]');
  if (t) setMode(t.dataset.mode);
});

updateDeck();
const hash = location.hash.slice(1);
if (hash === 'video') setMode('video');
if (hash === 'piani') setMode('plan');

// ---------------------------------------------------------------------------
// Anteprime dei punti del tour, renderizzate dal modello stesso.

const POI_IDS = ['promenade-mid', 'promenade-spiral', 'galleria-fwd', 'atrium', 'theatre-stalls', 'pool-plage', 'pool-botanic', 'zen', 'slides', 'sundeck'];
const grid = $('#poi-grid');
const pois = POI_IDS.map((id) => TOUR_NODES.find((n) => n.id === id));
grid.innerHTML = pois.map((n) => `
  <a class="poi" href="tour.html#${n.id}">
    <span class="poi-media"><img alt="" data-node="${n.id}"><span class="badges"><span class="badge amber">360°</span></span></span>
    <span class="poi-body"><small>Ponte ${n.deck} · ${n.area}</small><b>${n.name}</b><span>${n.hotspots[0]?.text ?? ''}</span></span>
  </a>`).join('');

let queue = pois.slice();
function nextThumb() {
  const n = queue.shift();
  if (!n) return;
  const eye = nodeEye(n);
  const look = eye.clone().add(new THREE.Vector3(Math.cos(n.yaw), -0.05, Math.sin(n.yaw)));
  const prevCut = highlight.visible;
  const url = stage.snapshot(eye, look, {
    width: 560, height: 315, fov: 75,
    before: () => { spaces.set(n.space); highlight.visible = false; stage.setCut(null); },
    after: () => { spaces.set('exterior'); highlight.visible = prevCut; updateCutOnly(); },
  });
  grid.querySelector(`img[data-node="${n.id}"]`).src = url;
  setTimeout(nextThumb, 60);
}
function updateCutOnly() {
  if (state.cut && state.mode !== 'video') stage.setCut(DECKS.find((d) => d.n === state.deck).y + 2.4);
}
new IntersectionObserver((entries, obs) => {
  if (entries.some((e) => e.isIntersecting)) {
    obs.disconnect();
    spaces.ready.then(nextThumb);
  }
}, { rootMargin: '300px' }).observe(grid);

window.__ready = true;

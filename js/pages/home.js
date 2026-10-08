import * as THREE from 'three';
import { SHIP, CRUISES, TOUR_NODES } from '../data/world-europa.js';
import { createStage, project } from '../three/stage.js';
import { nodeEye } from '../three/spaces.js';
import { ICONS } from '../ui/icons.js';

const $ = (s) => document.querySelector(s);
document.querySelectorAll('[data-icon]').forEach((e) => { e.outerHTML = ICONS[e.dataset.icon]; });

// Card delle crociere (una nave per ora; la piattaforma accetta altre navi come file di dati).
const cruise = CRUISES[0];
$('#cards').innerHTML = `
  <article class="card">
    <div class="card-media">
      <img id="card-shot" alt="La ${SHIP.name} vista di tre quarti, dal modello 3D">
      <div class="badges"><span class="badge amber">3D</span><span class="badge">360°</span><span class="badge">VIDEO</span></div>
    </div>
    <div class="card-body">
      <div><span class="eyebrow">${cruise.title}</span><h3>${SHIP.name}</h3></div>
      <p>${cruise.days.filter((d, i, a) => d !== 'Navigazione' && a.indexOf(d) === i).join(' · ')}</p>
      <div class="meta">
        <span>${cruise.nights} notti</span>
        <span>Partenza da ${cruise.homePort}</span>
        <span>${SHIP.className} · ${new Intl.NumberFormat('it-IT').format(SHIP.grossTonnage)} GT</span>
      </div>
      <div class="card-foot">
        <a class="btn btn-dark" href="nave.html">${ICONS.cube}Esplora la nave</a>
        <a class="btn btn-outline" href="tour.html">Tour 360°</a>
      </div>
    </div>
  </article>
  <article class="card soon">
    <span class="eyebrow">Altre navi della flotta</span>
    <h3>Pronte ad aggiungersi</h3>
    <p>Ogni nave entra nel catalogo con la sua scheda dati e il suo modello 3D: itinerari, ponti e tour 360° si generano da lì.</p>
  </article>`;

// Palcoscenico 3D: la nave ruota lentamente; i segnaposto portano nel tour.
const canvas = $('#hero-canvas');
const stage = await createStage(canvas, { fov: 30 });
const { camera, ship } = stage;
const target = new THREE.Vector3(0, 22, 0);
let angle = 0.75;
const orbit = () => {
  camera.position.set(Math.cos(angle) * 440, 95, Math.sin(angle) * 440);
  camera.lookAt(target);
};
orbit();
$('#loading').classList.add('done');

const PINS = [
  { node: 'promenade-mid', label: 'World Promenade · Ponte 8', at: [-118, 19, 0] },
  { node: 'slides', label: 'The Spiral · Ponte 22', at: [-68, 57, 0] },
  { node: 'pool-plage', label: 'Piscine · Ponte 18', at: [36, 41, 0] },
  { node: 'sundeck', label: 'Yacht Club · Ponte 22', at: [86, 53, 0] },
];
const pinsEl = $('#pins');
const pins = PINS.map((p) => {
  const a = document.createElement('a');
  a.className = 'pin';
  a.href = `tour.html#${p.node}`;
  a.innerHTML = `<span>${p.label}</span><span></span><span></span>`;
  pinsEl.appendChild(a);
  return { el: a, p: new THREE.Vector3(...p.at), occluded: false };
});

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ray = new THREE.Raycaster();
let frame = 0;
stage.onTick((dt) => {
  if (!reduceMotion) angle += dt * 0.05;
  orbit();
  frame++;
  for (const pin of pins) {
    if (frame % 15 === 0) {
      // Nasconde il segnaposto se la nave lo copre.
      const dir = pin.p.clone().sub(camera.position);
      const dist = dir.length();
      ray.set(camera.position, dir.normalize());
      ray.far = dist - 3;
      pin.occluded = ray.intersectObject(ship, true).length > 0;
    }
    const s = project(pin.p, camera, canvas);
    pin.el.hidden = !s.visible || pin.occluded;
    pin.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
  }
});

// Immagini generate dal modello.
setTimeout(() => {
  $('#card-shot').src = stage.snapshot(new THREE.Vector3(250, 70, 230), new THREE.Vector3(10, 22, 0), { width: 720, height: 405, fov: 35 });
  const n = TOUR_NODES.find((k) => k.id === 'promenade-mid');
  const eye = nodeEye(n);
  $('#tour-shot').src = stage.snapshot(eye, eye.clone().add(new THREE.Vector3(1, 0.06, 0)), { width: 960, height: 600, fov: 75 });
  window.__ready = true;
}, 300);

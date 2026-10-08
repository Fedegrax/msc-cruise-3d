// Scena condivisa: renderer + cielo/mare + nave, loop di animazione e utilità (taglio per ponte, istantanee).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SHIP } from '../data/world-europa.js';
import { buildShip } from '../ship/model.js';
import { loadExteriorProps } from '../ship/props.js';
import { createRenderer, createOutdoor } from './environment.js';

async function loadShip() {
  if (SHIP.gltf) {
    try {
      const gltf = await new GLTFLoader().loadAsync(SHIP.gltf);
      const group = gltf.scene;
      const materials = new Set();
      group.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = true;
        [].concat(o.material).forEach((m) => materials.add(m));
      });
      group.userData.materials = [...materials];
      return group;
    } catch (err) {
      console.warn('Modello glTF non disponibile, uso il modello parametrico.', err);
    }
  }
  return buildShip();
}

// Avvio sicuro per le pagine: se il 3D non parte, al posto del caricamento compare un messaggio chiaro.
export async function startStage(canvas, loadingEl, opts) {
  try {
    // Le insegne disegnate su canvas usano i font del sito: aspettiamo che siano caricati.
    await document.fonts?.ready;
    return await createStage(canvas, opts);
  } catch (err) {
    console.error(err);
    const webgl = !hasWebGL();
    loadingEl.classList.add('fatal');
    loadingEl.innerHTML = webgl
      ? '<p><b>Il tuo dispositivo non supporta la grafica 3D (WebGL).</b><br>Prova con una versione aggiornata di Chrome, Safari, Edge o Firefox, oppure attiva l’accelerazione hardware.</p>'
      : '<p><b>Non è stato possibile caricare la nave 3D.</b><br>Controlla la connessione e ricarica la pagina.</p><button type="button" class="btn btn-amber" onclick="location.reload()">Ricarica</button>';
    throw err;
  }
}

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export async function createStage(canvas, { shadows = true, water = true, fov = 35 } = {}) {
  const renderer = createRenderer(canvas);
  renderer.shadowMap.enabled = shadows;
  const scene = new THREE.Scene();
  const outdoor = await createOutdoor(scene, renderer, { water });
  const ship = await loadShip();
  scene.add(ship);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.3, 60000);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  const clipAll = () => ship.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      m.clippingPlanes = [clipPlane];
      m.clipShadows = true;
    }
  });
  clipAll();
  // Arredi e oggetti reali: arrivano dopo, senza bloccare la prima immagine.
  const propsReady = (SHIP.gltf ? Promise.resolve() : loadExteriorProps(ship)).then(clipAll).catch((err) => console.warn('Arredi non caricati', err));

  const tickers = new Set();
  let visible = true;
  let dirty = true;

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Niente rendering quando il canvas è fuori schermo (batteria e GPU ringraziano).
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  }).observe(canvas);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!visible && !dirty) return;
    outdoor.update(dt);
    for (const f of tickers) f(dt);
    renderer.render(scene, camera);
    dirty = false;
  });

  return {
    renderer, scene, camera, ship, outdoor, propsReady,
    onTick(f) { tickers.add(f); return () => tickers.delete(f); },
    // Taglia la nave sopra la quota y (null = nave intera).
    setCut(y) { clipPlane.constant = y == null ? 1e6 : y; },
    // Istantanea da un punto di vista arbitrario, restituita come data URL JPEG.
    snapshot(position, target, { width = 640, height = 360, fov: f = 50, before, after } = {}) {
      const cam = new THREE.PerspectiveCamera(f, width / height, 0.3, 60000);
      cam.position.copy(position);
      cam.lookAt(target);
      const size = renderer.getSize(new THREE.Vector2());
      const pr = renderer.getPixelRatio();
      before?.();
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.render(scene, cam);
      const out = document.createElement('canvas');
      out.width = width;
      out.height = height;
      out.getContext('2d').drawImage(renderer.domElement, 0, 0, width, height);
      renderer.setPixelRatio(pr);
      renderer.setSize(size.x, size.y, false);
      after?.();
      renderer.render(scene, camera);
      dirty = true;
      return out.toDataURL('image/jpeg', 0.82);
    },
  };
}

// Proietta un punto 3D sullo schermo: restituisce {x, y, visible} in pixel CSS rispetto al canvas.
const v = new THREE.Vector3();
export function project(point, camera, canvas) {
  v.copy(point).project(camera);
  const visible = v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
  return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * canvas.clientHeight, visible };
}

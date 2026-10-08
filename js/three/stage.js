// Scena condivisa: renderer + cielo/mare + nave, loop di animazione e utilità (taglio per ponte, istantanee).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SHIP } from '../data/world-europa.js';
import { buildShip } from '../ship/model.js';
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

export async function createStage(canvas, { shadows = true, water = true, fov = 35 } = {}) {
  const renderer = createRenderer(canvas);
  renderer.shadowMap.enabled = shadows;
  const scene = new THREE.Scene();
  const outdoor = createOutdoor(scene, renderer, { water });
  const ship = await loadShip();
  scene.add(ship);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.3, 60000);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  for (const m of ship.userData.materials) {
    m.clippingPlanes = [clipPlane];
    m.clipShadows = true;
  }

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
    renderer, scene, camera, ship, outdoor,
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

// Spazi del tour: esterno (modello + mare) e interni modellati, con illuminazione dedicata.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { deckY } from '../data/world-europa.js';
import { buildInteriors } from '../ship/interiors.js';

export const EYE = 1.65;

export function nodeEye(node) {
  return new THREE.Vector3(node.pos[0], node.eye ?? deckY(node.deck) + EYE, node.pos[1]);
}

export function nodeFloorY(node) {
  return nodeEye(node).y - EYE;
}

export function setupSpaces(stage) {
  const { scene, renderer, ship, outdoor } = stage;
  const { interior, theatre } = buildInteriors();
  interior.visible = theatre.visible = false;
  scene.add(interior, theatre);
  const skyEnv = scene.environment;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  let current = 'exterior';

  function set(space) {
    current = space;
    const outside = space === 'exterior';
    ship.visible = outside;
    if (outdoor.sea) outdoor.sea.visible = outside;
    outdoor.light.visible = outside;
    outdoor.hemi.visible = outside;
    outdoor.sky.visible = outside;
    interior.visible = space === 'interior';
    theatre.visible = space === 'theatre';
    scene.environment = outside ? skyEnv : roomEnv;
    scene.environmentIntensity = outside ? 1 : 0.45;
    scene.background = outside ? null : new THREE.Color(0x0a1a2f);
  }

  return {
    set,
    get current() { return current; },
    interior,
    theatre,
  };
}

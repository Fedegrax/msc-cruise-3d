// Caricamento (con cache) di texture PBR e modelli glTF reali da assets/ (Poly Haven, CC0).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const base = new URL('../../assets/', import.meta.url);
const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const cache = new Map();

// Ogni uso ha la sua Texture (ripetizione propria) che condivide l'immagine caricata una sola volta.
function load(path, srgb) {
  const key = `${path}|${srgb}`;
  if (!cache.has(key)) {
    const entry = { source: null, copies: [] };
    texLoader.load(new URL(path, base).href, (t) => {
      entry.source = t.source;
      for (const c of entry.copies) attach(c, t.source);
    });
    cache.set(key, entry);
  }
  const entry = cache.get(key);
  const copy = new THREE.Texture();
  copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
  copy.anisotropy = 8;
  if (srgb) copy.colorSpace = THREE.SRGBColorSpace;
  if (entry.source) attach(copy, entry.source);
  else entry.copies.push(copy);
  return copy;
}

function attach(tex, source) {
  tex.source = source;
  tex.needsUpdate = true;
}

/**
 * Set di texture PBR 1k (diffuse, normal, ARM = AO/rough/metal).
 * size = lato in metri coperto da una ripetizione (le UV dei modelli sono in metri).
 */
export function pbr(name, size = 1, { color, roughness = 1, metalness = 0, normalScale = 1, rotate = 0 } = {}) {
  const set = {
    map: load(`textures/${name}/${name}_diff_1k.jpg`, true),
    normalMap: load(`textures/${name}/${name}_nor_gl_1k.jpg`, false),
    arm: load(`textures/${name}/${name}_arm_1k.jpg`, false),
  };
  const maps = {};
  for (const [k, t] of Object.entries(set)) {
    t.repeat.set(1 / size, 1 / size);
    t.rotation = rotate;
    maps[k] = t;
  }
  return new THREE.MeshStandardMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughnessMap: maps.arm,
    metalnessMap: maps.arm,
    aoMap: maps.arm,
    roughness,
    metalness,
    color: color ?? 0xffffff,
    side: THREE.DoubleSide,
  });
}

export function texture(path, { srgb = true, repeat = 1 } = {}) {
  const t = load(path, srgb);
  t.repeat.set(repeat, repeat);
  return t;
}

const models = new Map();

// Modello glTF normalizzato: base appoggiata a y=0, centrato in x/z, scalato all'altezza voluta (metri).
export function model(name, { height } = {}) {
  if (!models.has(name)) {
    models.set(name, gltfLoader.loadAsync(new URL(`models/${name}/${name}.gltf`, base).href).then((g) => {
      const root = g.scene;
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      return root;
    }));
  }
  return models.get(name).then((root) => {
    const obj = root.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const s = height ? height / size.y : 1;
    const holder = new THREE.Group();
    obj.scale.setScalar(s);
    obj.position.set(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
    holder.add(obj);
    holder.userData.size = size.clone().multiplyScalar(s);
    return holder;
  });
}

// Piazza più copie di un modello: items = [{ x, y, z, rot }].
export async function place(parent, name, items, opts) {
  const proto = await model(name, opts);
  for (const it of items) {
    const o = proto.clone(true);
    o.position.set(it.x, it.y, it.z);
    o.rotation.y = it.rot ?? 0;
    if (it.scale) o.scale.setScalar(it.scale);
    parent.add(o);
  }
  return proto;
}

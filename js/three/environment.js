// Renderer, cielo fisico, mare riflettente e luce solare con ombre.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const ASSETS = new URL('../../assets/', import.meta.url);

// Smartphone e schermi piccoli: meno pixel, ombre e riflessi più leggeri.
export const LOW_POWER = matchMedia('(pointer: coarse)').matches || window.innerWidth < 800;

export function createRenderer(canvas, { preserveDrawingBuffer = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, LOW_POWER ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  return renderer;
}

// Cielo fotografico reale (HDRI Poly Haven, CC0): sfondo, riflessi e direzione del sole coerenti.
const SKY_JPG = 'sky/sky_4k.jpg';
const SKY_HDR = 'sky/sky_1k.hdr';

// Trova il sole nell'immagine equirettangolare: baricentro dei pixel più luminosi.
function sunFromImage(img) {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H / 2).data;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) max = Math.max(max, d[i] + d[i + 1] + d[i + 2]);
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i] + d[i + 1] + d[i + 2] < max - 4) continue;
    const u = ((p % W) + 0.5) / W;
    const v = 1 - (Math.floor(p / W) + 0.5) / H;
    const phi = (u - 0.5) * Math.PI * 2;
    const lat = (v - 0.5) * Math.PI;
    sx += Math.cos(phi) * Math.cos(lat);
    sy += Math.sin(lat);
    sz += Math.sin(phi) * Math.cos(lat);
  }
  return new THREE.Vector3(sx, sy, sz).normalize();
}

// Sfera del cielo con la stessa mappatura equirettangolare usata da three.js per l'illuminazione.
function photoSky(map) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { map: { value: map } },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
          vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          gl_FragColor = vec4(texture2D(map, uv).rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  mesh.scale.setScalar(20000);
  mesh.frustumCulled = false;
  mesh.name = 'sky';
  return mesh;
}

function waterNormalMap() {
  const t = new THREE.TextureLoader().load(new URL('textures/waternormals.jpg', ASSETS).href);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export async function createOutdoor(scene, renderer, { water = true } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  let sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(42), THREE.MathUtils.degToRad(35));
  let sky;
  try {
    const [jpg, hdr] = await Promise.all([
      new THREE.TextureLoader().loadAsync(new URL(SKY_JPG, ASSETS).href),
      new RGBELoader().loadAsync(new URL(SKY_HDR, ASSETS).href),
    ]);
    jpg.colorSpace = THREE.SRGBColorSpace;
    jpg.anisotropy = 8;
    sun = sunFromImage(jpg.image);
    sky = photoSky(jpg);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.9;
    hdr.dispose();
  } catch (err) {
    console.warn('Cielo fotografico non disponibile, uso il cielo a gradiente.', err);
    sky = makeSky(sun);
    const skyScene = new THREE.Scene();
    skyScene.add(makeSky(sun));
    scene.environment = pmrem.fromScene(skyScene, 0, 1, 50000).texture;
  }
  scene.add(sky);

  const light = new THREE.DirectionalLight(0xfff1de, 2.4);
  light.position.copy(sun).multiplyScalar(420);
  light.castShadow = true;
  light.shadow.mapSize.setScalar(LOW_POWER ? 2048 : 4096);
  const cam = light.shadow.camera;
  cam.left = -210;
  cam.right = 210;
  cam.top = 210;
  cam.bottom = -210;
  cam.near = 50;
  cam.far = 1000;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.06;
  scene.add(light, light.target);

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x2a4a63, 0.25);
  scene.add(hemi);

  let sea = null;
  if (water) {
    sea = new Water(new THREE.PlaneGeometry(30000, 30000), {
      textureWidth: LOW_POWER ? 512 : 1024,
      textureHeight: LOW_POWER ? 512 : 1024,
      waterNormals: waterNormalMap(),
      sunDirection: sun.clone(),
      sunColor: 0xffffff,
      waterColor: 0x0c4a73,
      distortionScale: 2.2,
      fog: false,
    });
    // Fresnel dell'acqua reale (R0 ≈ 0.02-0.05): mare blu scuro vicino, riflessi verso l'orizzonte.
    sea.material.fragmentShader = sea.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.05;');
    sea.rotation.x = -Math.PI / 2;
    sea.material.uniforms.size.value = 2.5;
    sea.name = 'sea';
    scene.add(sea);
  }

  return {
    sky, sea, light, hemi, sun,
    update(dt) {
      if (sea) sea.material.uniforms.time.value += dt * 0.35;
    },
  };
}

// Cielo a gradiente con disco solare e alone: colori controllati, riflessi blu sull'acqua.
export function makeSky(sun, { zenith = 0x0f4c9c, horizon = 0xa4cbe9, ground = 0x0d2f4a } = {}) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sunDir: { value: sun.clone().normalize() },
      zenith: { value: new THREE.Color(zenith) },
      horizon: { value: new THREE.Color(horizon) },
      ground: { value: new THREE.Color(ground) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
        vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: `
      uniform vec3 sunDir; uniform vec3 zenith; uniform vec3 horizon; uniform vec3 ground;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = h > 0.0 ? mix(horizon, zenith, pow(h, 0.45)) : mix(horizon, ground, pow(min(-h * 6.0, 1.0), 0.6));
        float s = max(dot(d, sunDir), 0.0);
        col += vec3(1.0, 0.93, 0.8) * (pow(s, 6000.0) * 40.0 + pow(s, 90.0) * 0.3 + pow(s, 6.0) * 0.07);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
  mesh.scale.setScalar(20000);
  mesh.frustumCulled = false;
  mesh.name = 'sky';
  return mesh;
}

// Renderer, cielo fisico, mare riflettente e luce solare con ombre.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { waterNormals } from '../ship/textures.js';

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

// Sole: elevazione e azimut in gradi.
export function createOutdoor(scene, renderer, { elevation = 28, azimuth = 35, water = true } = {}) {
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth));

  const sky = makeSky(sun);
  scene.add(sky);

  // Mappa d'ambiente dal cielo: riflessi realistici su vetri e acqua.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(makeSky(sun));
  const env = pmrem.fromScene(skyScene, 0, 1, 50000).texture;
  scene.environment = env;

  const light = new THREE.DirectionalLight(0xfff2e0, 2.6);
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

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x2a4a63, 0.55);
  scene.add(hemi);

  let sea = null;
  if (water) {
    sea = new Water(new THREE.PlaneGeometry(30000, 30000), {
      textureWidth: LOW_POWER ? 512 : 1024,
      textureHeight: LOW_POWER ? 512 : 1024,
      waterNormals: waterNormals(),
      sunDirection: sun.clone(),
      sunColor: 0xffffff,
      waterColor: 0x0c4a73,
      distortionScale: 1.6,
      fog: false,
    });
    // Fresnel dell'acqua reale (R0 ≈ 0.02-0.05): mare blu scuro vicino, riflessi verso l'orizzonte.
    sea.material.fragmentShader = sea.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.05;');
    sea.rotation.x = -Math.PI / 2;
    sea.material.uniforms.size.value = 1.2;
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

// "Video tour": percorso di camera a capitoli sul modello 3D. Si può anche registrare in .webm.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CHAPTERS = [
  { title: 'Vista d’insieme', dur: 10, cam: [V(-420, 150, 330), V(-120, 115, 450), V(190, 95, 390)], look: [V(0, 25, 0), V(0, 25, 0)] },
  { title: 'Prua e Yacht Club', dur: 9, cam: [V(330, 70, 200), V(285, 52, 40), V(250, 78, -80)], look: [V(110, 32, 0), V(100, 40, 0)] },
  { title: 'Fianco e scialuppe', dur: 9, cam: [V(130, 20, 72), V(10, 22, 70), V(-110, 24, 74)], look: [V(40, 14, 22), V(-80, 16, 22), V(-170, 20, 20)] },
  { title: 'World Promenade', dur: 11, cam: [V(-360, 48, 0), V(-220, 30, 0), V(-150, 21, 0), V(-100, 19, 0)], look: [V(-120, 22, 0), V(-60, 24, 0)] },
  { title: 'The Spiral', dur: 9, cam: [V(-92, 26, 16), V(-84, 42, 18), V(-80, 60, 6)], look: [V(-68, 30, 0), V(-68, 44, 0), V(-30, 50, 0)] },
  { title: 'Piscine al ponte 18', dur: 10, cam: [V(-20, 80, -80), V(15, 60, -42), V(62, 49, -12)], look: [V(20, 40, 0), V(35, 40, 0), V(45, 40, 0)] },
  { title: 'Saluto finale', dur: 9, cam: [V(150, 110, -250), V(-40, 150, -430), V(-300, 190, -520)], look: [V(10, 25, 0), V(0, 25, 0)] },
];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Cinematic {
  constructor(camera) {
    this.camera = camera;
    this.t = 0;
    this.playing = false;
    this.starts = [];
    let acc = 0;
    for (const c of CHAPTERS) {
      this.starts.push(acc);
      c.camCurve = new THREE.CatmullRomCurve3(c.cam, false, 'centripetal');
      c.lookCurve = new THREE.CatmullRomCurve3(c.look.length > 1 ? c.look : [c.look[0], c.look[0]], false, 'centripetal');
      acc += c.dur;
    }
    this.duration = acc;
    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
  }

  chapterAt(t) {
    let i = this.starts.length - 1;
    while (i > 0 && t < this.starts[i]) i--;
    return i;
  }

  // Posiziona la camera al tempo t (secondi). Restituisce l'indice del capitolo.
  apply(t) {
    this.t = THREE.MathUtils.clamp(t, 0, this.duration);
    const i = this.chapterAt(this.t);
    const c = CHAPTERS[i];
    const local = ease(THREE.MathUtils.clamp((this.t - this.starts[i]) / c.dur, 0, 1));
    c.camCurve.getPoint(local, this._p);
    c.lookCurve.getPoint(local, this._l);
    this.camera.position.copy(this._p);
    this.camera.lookAt(this._l);
    return i;
  }

  get target() {
    return this._l;
  }
}

export const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

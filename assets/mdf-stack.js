/* ============================================================
   Hero signature motif — "Laminated MDF" board stack (three.js)
   ------------------------------------------------------------
   Replaces the former "Swatch Float" hero motif. Six laminated MDF
   boards fly in from the edges of the frame on load, settle into a
   loose fan, then compress into an aligned stack as the hero scrolls
   away — the product this mill's decor paper ends up inside, shown
   being pressed rather than photographed.

   Everything is procedural: the decor faces and the chipboard core
   are canvas textures generated at runtime, so this ships no new
   image assets and each finish stays editable as a few hex values.

   This is the only ES module in the project (script.js is still a
   plain IIFE) — three.js is ESM-only, so the import map in
   index.html resolves "three" and this file is loaded with
   type="module". It degrades in three steps:
     1. no JS / module load failure / no WebGL → script.js reveals
        the static <picture> in .mdf-stack. That is an error path,
        not a poster frame: the hero starts empty by design, since
        the boards fly in from outside it. The `is-live` class this
        module sets after its first successful render is what tells
        script.js's watchdog to stand down;
     2. prefers-reduced-motion → one static frame, no rAF loop,
        no intro, no scroll link;
     3. hero scrolled out of view → rAF loop idles.
   ============================================================ */

import * as THREE from 'three';

const CANVAS = document.getElementById('mdf-stage');
const WRAP = document.querySelector('.mdf-stack');
const HERO = document.querySelector('.hero');
if (!CANVAS || !WRAP || !HERO) throw new Error('mdf-stack: hero markup missing');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: CANVAS, antialias: true, alpha: true });
} catch (e) {
  // No WebGL — leave the static fallback in place and stop here.
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

/* ---------- procedural textures ---------- */
function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* Wood grain: long low-frequency streaks (two summed sines so the line
   wanders instead of reading as a sine wave) over a flat base, then a
   fine speckle pass for the printed-paper tooth. */
function woodGrain(base, dark, light, streaks) {
  return tex(1024, 640, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < streaks; i++) {
      const y = Math.random() * h;
      const amp = 6 + Math.random() * 26;
      const freq = 0.004 + Math.random() * 0.01;
      const ph = Math.random() * 10;
      g.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const yy = y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.25;
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.strokeStyle = Math.random() > 0.45 ? dark : light;
      g.globalAlpha = 0.05 + Math.random() * 0.3;
      g.lineWidth = 0.6 + Math.random() * 3.4;
      g.stroke();
    }
    g.globalAlpha = 0.055;
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = Math.random() > 0.5 ? dark : light;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
    g.globalAlpha = 1;
  });
}

/* Cut edge of the board: dense chip speckle with a slightly darker line
   top and bottom where the laminate meets the core. */
const coreTexture = tex(1024, 128, (g, w, h) => {
  g.fillStyle = '#a8825a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++) {
    const r = Math.random();
    g.fillStyle = r > 0.72 ? '#8a663f' : r > 0.42 ? '#bd9770' : '#9c7550';
    g.globalAlpha = 0.35 + Math.random() * 0.5;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3.6, 1 + Math.random() * 2.2);
  }
  g.globalAlpha = 0.18;
  g.fillStyle = '#8a6437';
  g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
  g.globalAlpha = 1;
});

const coreMaterial = new THREE.MeshStandardMaterial({
  name: 'mdf-core', map: coreTexture, roughness: 0.94, metalness: 0
});

/* ---------- boards ---------- */
const W = 1.62, D = 1.14, T = 0.055;

/* Six of the mill's own decors. Names match the decor catalog below the
   hero — keep them in sync if the catalog's headline decors change. */
const FINISHES = [
  { name: 'astana',        map: woodGrain('#b6a894', '#8a7a66', '#dbd0bd', 215), rough: 0.42 },
  { name: 'belaya-korona', map: woodGrain('#efe9e0', '#d3c9ba', '#ffffff', 120), rough: 0.42 },
  { name: 'uludag-mese',   map: woodGrain('#b98d5a', '#7d5528', '#e0b985', 210), rough: 0.44 },
  { name: 'acik-kok',      map: woodGrain('#d9c3a2', '#ab8b62', '#f2e4cb', 200), rough: 0.42 },
  { name: 'wenge',         map: woodGrain('#33241d', '#150d09', '#6b4a34', 240), rough: 0.34 },
  { name: 'dub-kataniya',  map: woodGrain('#8d7a66', '#5b4b3c', '#bcaa93', 220), rough: 0.46 }
];

const group = new THREE.Group();
group.name = 'mdf-stack';
scene.add(group);

const boards = FINISHES.map(f => {
  const laminate = new THREE.MeshStandardMaterial({
    name: f.name, map: f.map, roughness: f.rough, metalness: 0.03
  });
  const geo = new THREE.BoxGeometry(W, T, D, 1, 1, 1);
  // Face order is +x, -x, +y, -y, +z, -z — decor on the two flat faces,
  // chipboard core on the four cut edges.
  const mesh = new THREE.Mesh(geo, [coreMaterial, coreMaterial, laminate, laminate, coreMaterial, coreMaterial]);
  mesh.name = 'board-' + f.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
});

/* ---------- lights ----------
   Lit off the site palette rather than the neutral studio default:
   raw-pulp sky / surface-dark ground bounce, and the rim light is
   kraft-brown so the boards pick up the brand accent along one edge. */
scene.add(new THREE.HemisphereLight(0xe8e4dc, 0x4f4438, 0.85));

const key = new THREE.DirectionalLight(0xfff3e4, 2.1);
key.position.set(2.6, 4.4, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 18;
const s = 3.2;
Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
key.shadow.bias = -0.0012;
key.shadow.radius = 3;
scene.add(key);

const rim = new THREE.DirectionalLight(0x8c776e, 1.5);
rim.position.set(-3.4, 1.2, -2.6);
scene.add(rim);

const fill = new THREE.DirectionalLight(0xffd9ad, 0.95);
fill.position.set(-1.6, -0.4, 3.2);
scene.add(fill);

/* Shadow-only floor: the canvas is transparent, so this drops a contact
   shadow onto the hero photo instead of introducing a fake plane. */
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.ShadowMaterial({ opacity: 0.34 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.62;
floor.receiveShadow = true;
scene.add(floor);

/* ---------- fan → stack, driven by the hero's own scroll ----------
   The source animation ran over a 200vh sticky track. The hero here is a
   normal in-flow section, so progress is mapped onto the first SPAN of the
   hero scrolling away: the stack finishes closing while the hero is still
   largely on screen rather than completing after it has gone.

   SPAN is deliberately short. It is the whole feel of the interaction —
   the smaller it is, the sooner the boards start visibly moving and the
   sooner they are fully stacked. At 0.6 the compression was still running
   as the hero left; a third of the hero's exit puts the finished stack on
   screen while there is plenty of hero left to look at. */
const SPAN = 0.34;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = t => Math.min(1, Math.max(0, t));

let target = 0, current = 0;

function readScroll() {
  const r = HERO.getBoundingClientRect();
  const span = r.height * SPAN;
  target = span > 0 ? clamp01(-r.top / span) : 0;
}

/* ---------- intro: boards gather from the edges ---------- */
const INTRO_DURATION = 1900;
const INTRO_STAGGER = 110;

// Each board enters from a different side of the frame.
const ENTRY = [
  { x: -5.4, y:  1.2, z:  0.8, rx:  0.5,  ry: -0.9, rz:  0.28 },
  { x:  5.6, y:  1.9, z: -1.2, rx: -0.4,  ry:  1.0, rz: -0.32 },
  { x: -4.6, y: -2.4, z: -1.8, rx:  0.6,  ry:  0.7, rz:  0.4  },
  { x:  4.9, y: -2.1, z:  1.6, rx: -0.55, ry: -0.8, rz: -0.24 },
  { x: -0.9, y:  5.2, z: -2.4, rx:  0.8,  ry:  0.4, rz:  0.18 },
  { x:  1.1, y: -5.0, z:  2.2, rx: -0.75, ry: -0.5, rz: -0.2  }
];

// Slight overshoot on arrival, so a board settles rather than stopping dead.
const easeBack = t => { const c = 1.7, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };

let introStart = performance.now();

function introFor(i, now) {
  const t = (now - introStart - i * INTRO_STAGGER) / INTRO_DURATION;
  if (t >= 1) return 0;
  return 1 - easeBack(Math.max(0, t));  // 1 = fully out at entry point, 0 = arrived
}

function layout(p, now, withIntro) {
  const e = ease(p);
  const gap = lerp(0.163, T * 1.02, e);
  const spin = lerp(0.30, 0, e);

  boards.forEach((b, i) => {
    const k = i - (boards.length - 1) / 2;
    b.position.y = -k * gap;
    b.position.x = lerp(k * 0.10, -k * 0.14, e);
    b.position.z = lerp(-k * 0.12, k * 0.119, e);
    b.rotation.x = 0;
    b.rotation.y = k * spin;
    b.rotation.z = lerp(k * 0.018, 0, e);

    if (!withIntro) return;
    const k2 = introFor(i, now);
    if (!k2) return;
    const a = ENTRY[i];
    b.position.x += a.x * k2;
    b.position.y += a.y * k2;
    b.position.z += a.z * k2;
    b.rotation.x += a.rx * k2;
    b.rotation.y += a.ry * k2;
    b.rotation.z += a.rz * k2;
  });

  group.rotation.x = lerp(-0.10, -0.06, e);
  group.rotation.y = lerp(-0.25, -0.85, e);
  group.scale.setScalar(lerp(0.95, 1.1, e));

  // Dollied in from the source scene's framing: this canvas is a column of
  // the hero grid rather than most of a viewport, so the same distance left
  // the stack reading as a thumbnail.
  camera.position.set(0, lerp(1.7, 3.0, e), lerp(4.5, 3.9, e));
  camera.lookAt(0, 0, 0);
}

function resize() {
  const w = CANVAS.clientWidth, h = CANVAS.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Portrait frames (should the box ever end up taller than wide) need a
  // wider field of view or the boards run past the edges.
  camera.fov = camera.aspect < 1 ? 46 : 36;
  camera.updateProjectionMatrix();
}
// Observed rather than called per frame: reading clientWidth in the render
// loop forces a layout every frame, and the box only changes on resize,
// breakpoint or late font load — all of which the observer already catches.
new ResizeObserver(resize).observe(CANVAS);

/* ---------- run ---------- */
resize();
readScroll();

if (reduceMotion) {
  // One frame, part-closed, no loop and no scroll link.
  layout(0.35, 0, false);
  renderer.render(scene, camera);
  WRAP.classList.add('is-live');
} else {
  addEventListener('scroll', readScroll, { passive: true });

  // Idle the loop while the hero is off screen — nothing to see, and the
  // page has a pinned ScrollTrigger scene further down that wants the frame
  // budget more than an invisible canvas does.
  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; })
    .observe(CANVAS);

  let idle = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible) return;
    // Smoothing, not lag: at 0.075 the stack noticeably trailed the wheel
    // by a couple of hundred ms, which read as the animation starting late
    // rather than as weight. 0.12 still takes the jitter off a trackpad.
    current += (target - current) * 0.12;
    idle += 0.0045;
    layout(current, now, true);
    // Ambient drift, same intent as the old Swatch Float bob: slow, never
    // resting, deliberately out of step with the scroll-driven motion.
    group.rotation.y += Math.sin(idle) * 0.028;
    group.position.y = Math.sin(idle * 0.8) * 0.018;
    renderer.render(scene, camera);
  }

  current = target;
  introStart = performance.now() + 200;   // let the hero copy land first
  layout(current, introStart, true);
  renderer.render(scene, camera);
  WRAP.classList.add('is-live');
  requestAnimationFrame(tick);
}

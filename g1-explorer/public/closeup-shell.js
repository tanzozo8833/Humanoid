// Shared scaffolding for the "open it up" close-ups (viewers/*.js): a modal over the dimmed page
// with its own WebGL renderer, orbit controls, labels that follow the model, the "How it works"
// step list, the shell reveal (case fades as it opens) and a toggle to close it again. Each viewer
// only builds its model and animates it. Same idea as rosmater_m3_pro's closeup-shell.js.
import * as THREE from 'three';
import { OrbitControls } from '/vendor/three/OrbitControls.js';

const REVEAL_DELAY_S = 0.6;        // shown closed first, so the opening reads as "inside it"
const REVEAL_S = 1.4;
let renderer = null;
let current = null;

/**
 * @param {object} opts  title, sub, heading, steps [[name, text]], extra (HTML), note (HTML),
 *   camera {pos, target, near, far, min, max}
 * @param {(ctx) => {update(now, dt, e)}} setup  e = eased reveal 0 closed .. 1 open
 */
export function openCloseup(opts, setup) {
  if (current) current.close(true);
  const dom = buildDom(opts);
  const ac = new AbortController();
  const { signal } = ac;

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  dom.stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = opts.camera || {};
  const camera = new THREE.PerspectiveCamera(38, 1, cam.near ?? 0.002, cam.far ?? 20);
  camera.position.set(...(cam.pos || [0.15, 0.12, 0.18]));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...(cam.target || [0, 0, 0]));
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = cam.min ?? 0.03;
  controls.maxDistance = cam.max ?? 3;
  controls.autoRotate = opts.autoRotate ?? true;
  controls.autoRotateSpeed = 0.5;
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; }, { signal });

  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x15181d, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(1, 2, 1.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.8);
  rim.position.set(-1.5, 0.6, -1);
  scene.add(rim);

  const geometries = [];
  const materials = [];
  const labels = [];
  const fades = [];
  const ctx = {
    THREE, scene, camera, controls, renderer, dom, signal,
    steps: [...dom.panel.querySelectorAll('ol li')],
    mat(color, o = {}) {
      const m = new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.45, ...o });
      materials.push(m);
      return m;
    },
    basic(color, o = {}) {
      const m = new THREE.MeshBasicMaterial({ color, ...o });
      materials.push(m);
      return m;
    },
    add(parent, geo, material, x = 0, y = 0, z = 0) {
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    /** Pill label following `obj` (+ local offset). always: null = once open, true/false = forced. */
    label(obj, text, off = [0, 0, 0], always = null) {
      const el = document.createElement('span');
      el.className = 'closeup-label';
      el.innerHTML = text;
      dom.labels.append(el);
      const l = { obj, el, off: new THREE.Vector3(...off), always };
      labels.push(l);
      return l;
    },
    /** Material turns (more) transparent as the shell opens. */
    fade(material, openOpacity) {
      material.transparent = true;
      fades.push([material, material.opacity, openOpacity]);
      return material;
    },
    setActiveStep(i) { ctx.steps.forEach((li, n) => li.classList.toggle('active', n === i)); },
    q: (sel) => dom.panel.querySelector(sel),
  };
  const model = setup(ctx);

  let reveal = 0;
  let revealTarget = 1;
  let revealAt = performance.now() / 1000 + REVEAL_DELAY_S;
  if (dom.toggle) {
    dom.toggle.addEventListener('click', () => {
      revealTarget = revealTarget ? 0 : 1;
      revealAt = performance.now() / 1000;
      dom.toggle.textContent = revealTarget ? 'Đóng vỏ lại' : 'Mở vỏ ra';
    }, { signal });
  }

  function resize() {
    const w = dom.stage.clientWidth;
    const h = dom.stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(dom.stage);
  resize();

  const lp = new THREE.Vector3();
  let last = performance.now();
  renderer.setAnimationLoop((time) => {
    const now = time / 1000;
    const rawDt = Math.min(0.25, (time - last) / 1000);   // reveal follows wall time even on a slow GPU
    const dt = Math.min(0.05, rawDt);
    last = time;
    if (now >= revealAt) reveal = revealTarget ? Math.min(1, reveal + rawDt / REVEAL_S) : Math.max(0, reveal - rawDt / REVEAL_S);
    const e = reveal * reveal * (3 - 2 * reveal);
    for (const [m, closed, open] of fades) {
      m.opacity = closed + (open - closed) * e;
      m.depthWrite = m.opacity > 0.95;
    }
    model.update(now, dt, e);
    controls.update();
    renderer.render(scene, camera);
    const rect = renderer.domElement.getBoundingClientRect();
    for (const l of labels) {
      const shown = l.always === null ? e > 0.8 : l.always;
      l.el.classList.toggle('shown', shown && l.obj.visible !== false);
      lp.copy(l.off);
      l.obj.localToWorld(lp);
      lp.project(camera);
      l.el.style.visibility = lp.z < 1 && Math.abs(lp.x) < 1.1 && Math.abs(lp.y) < 1.1 ? '' : 'hidden';
      l.el.style.transform = `translate(${(lp.x * 0.5 + 0.5) * rect.width}px, ${(-lp.y * 0.5 + 0.5) * rect.height}px)`;
    }
  });

  function close(immediate = false) {
    if (current !== handle) return;
    current = null;
    const cleanup = () => {
      renderer.setAnimationLoop(null);
      ac.abort();
      ro.disconnect();
      controls.dispose();
      for (const g of geometries) g.dispose();
      for (const m of materials) { m.map?.dispose(); m.dispose(); }
      dom.overlay.remove();
      model.dispose?.();
    };
    if (immediate) cleanup();
    else { dom.overlay.classList.remove('open'); setTimeout(cleanup, 260); }
  }
  dom.closeBtn.addEventListener('click', () => close(), { signal });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); }, { signal });
  requestAnimationFrame(() => requestAnimationFrame(() => dom.overlay.classList.add('open')));
  const handle = { close };
  current = handle;
  return handle;
}

function buildDom({ title, sub = '', heading, steps = [], extra = '', note = '', toggle = true }) {
  const overlay = document.createElement('div');
  overlay.className = 'closeup';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="closeup-stage"></div>
    <div class="closeup-labels"></div>
    <h3 class="closeup-title"></h3>
    <p class="closeup-sub"></p>
    <button type="button" class="closeup-close" aria-label="Đóng">✕</button>
    <aside class="closeup-panel">
      <h4>${heading}</h4>
      <ol>${steps.map(([k, v]) => `<li><b>${k}</b> ${v}</li>`).join('')}</ol>
      ${extra}
      <div class="closeup-buttons">${toggle ? '<button type="button" class="btn small closeup-toggle">Đóng vỏ lại</button>' : ''}</div>
      <p class="closeup-note">${note}</p>
    </aside>`;
  overlay.querySelector('.closeup-title').textContent = title;
  overlay.querySelector('.closeup-sub').innerHTML = sub;
  document.body.append(overlay);
  return {
    overlay,
    stage: overlay.querySelector('.closeup-stage'),
    labels: overlay.querySelector('.closeup-labels'),
    closeBtn: overlay.querySelector('.closeup-close'),
    panel: overlay.querySelector('.closeup-panel'),
    toggle: overlay.querySelector('.closeup-toggle'),
  };
}

// ------------------------------------------------------------------------------ geometry helpers

/** Spur gear (external teeth), axis along +Y, centred, `thick` tall. */
export function gearGeometry(r, teeth, thick, bore = 0) {
  const shape = new THREE.Shape();
  const root = r * (1 - 1.25 / Math.max(teeth, 6) * 2.2);
  const n = teeth * 4;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const q = i % 4;
    const rr = q === 1 || q === 2 ? r : root;
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  if (bore > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thick / 2, 0);
  return geo;
}

/** Ring gear (internal teeth) of pitch radius r, outer radius rOut, axis +Y. */
export function ringGearGeometry(r, rOut, teeth, thick) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  const tip = r * (1 - 1.2 / teeth * 2);
  const n = teeth * 4;
  for (let i = 0; i <= n; i += 1) {
    const a = -(i / n) * Math.PI * 2;
    const q = i % 4;
    const rr = q === 1 || q === 2 ? tip : r * 1.04;
    if (i === 0) hole.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else hole.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thick / 2, 0);
  return geo;
}

/** Hollow cylinder (tube wall) along +Y. */
export function tubeGeometry(rIn, rOut, h, seg = 48) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: seg });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -h / 2, 0);
  return geo;
}

/** Canvas texture with text, for little screens / chip markings. */
export function textTexture(lines, { w = 256, h = 128, bg = '#0d1117', fg = '#c9d1d9', font = 22 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `${font}px Consolas, monospace`;
  lines.forEach((t, i) => g.fillText(t, 10, font + 6 + i * (font + 6)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const smooth = (k) => k * k * (3 - 2 * k);

/**
 * Copy of the real mesh(es) of one robot link from the main page (its "<link>__visual" nodes only,
 * not the child links), with `material`, in the link's own ROS frame. Wrap the result in a group
 * rotated -90 deg about X to get three.js Y-up.
 */
export function cloneLinkVisual(linkObj, material) {
  const g = new THREE.Group();
  if (!linkObj) return g;
  for (const c of linkObj.children) {
    if (!c.name || !c.name.includes('__visual')) continue;
    const copy = c.clone(false);
    copy.material = material;
    g.add(copy);
  }
  return g;
}

// Main page: the G1 as an interactive 3D model (robot/g1.glb or robot/g1_inspire.glb, built by
// model_src/build_g1_model.py) plus the side panel. Click a part -> its structure in the panel;
// double-click (or "Mở bên trong") -> the close-up viewer for that part (viewers/*.js, on demand).
//
// The GLB node tree is the URDF tree: link nodes, joint nodes (extras: axis/limits/mimic) and
// `<link>__visual` mesh nodes, in ROS axes (Z up). `robot` turns it to three.js Y up.
// The X-ray content (motors at every joint, mainboard, battery, fans, cables...) is placed from
// the teardown photos - see parts.js for the sources and what is an estimate.
import * as THREE from 'three';
import { OrbitControls } from '/vendor/three/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/GLTFLoader.js';
import {
  PARTS, GROUPS, LINK_TO_PART, HOTSPOT_TO_PART, HOTSPOTS, MOTORS, OVERVIEW, SDK_ORDER, HAND_ORDER, SRC, VARIANTS,
  motorOf as motorOfVariant, describeJoint, isParallel,
} from '/parts.js';
import { createOverlays } from '/overlays.js';
import { initFunctions } from '/functions-ui.js';

const DEG = 180 / Math.PI;
const HOVER_EMISSIVE = new THREE.Color(0x1d3557);
const SELECT_EMISSIVE = new THREE.Color(0x2f6fd0);
const XRAY_OPACITY = 0.13;
const SOLE_BELOW_ANKLE = 0.035;            // ankle_roll_link mesh min z (sole) under its origin
const FOCUS_S = 0.7;
// variant key -> GLB (VARIANTS in parts.js); `handModel` below holds the current variant key
const motorOf = (joint) => motorOfVariant(joint, handModel);
// which variant shows a part that only exists in some models
const PART_VARIANT = { hand: 'dex3', inspire: 'inspire', dex1: 'dex1', neck: 'g1plus', handle: 'g1plus', rubber_hand: 'g1_23' };

const $ = (sel) => document.querySelector(sel);
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

// ------------------------------------------------------------------------------ scene
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 6, 14);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
const HOME = { pos: new THREE.Vector3(2.3, 1.15, 1.25), target: new THREE.Vector3(0, 0.68, 0) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.12;
controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * 0.95;
controls.autoRotateSpeed = 0.8;

scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1d22, 1.2));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.5, 4, 2);
scene.add(key);
const rim = new THREE.DirectionalLight(0x88aaff, 1.0);
rim.position.set(-3, 2, -2.5);
scene.add(rim);

// ground: soft disc + grid rings
{
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(60,80,110,0.55)');
  grad.addColorStop(0.6, 'rgba(30,40,55,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(120,150,190,0.18)';
  for (let r = 32; r < 256; r += 32) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  scene.add(disc);
}

// big floor grid for the simulation / motion replay (the robot walks off the small disc)
const floorGrid = new THREE.GridHelper(30, 60, 0x30455f, 0x1a2430);
floorGrid.visible = false;
scene.add(floorGrid);

const robot = new THREE.Group();          // ROS Z-up -> three Y-up; y moved so the feet touch the ground
robot.rotation.x = -Math.PI / 2;
scene.add(robot);

const overlays = createOverlays({ scene, robot, labelsHost: document.querySelector('#labels3d'), h });

// ------------------------------------------------------------------------------ model state
let links = {};                           // link name -> Object3D
let linkMeshes = {};                      // link name -> [Mesh]
let joints = {};                          // joint name -> {node, data, restQ, restPos, axis, q, target}
let pickables = [];
let hotspotMeshes = [];
let bodyMaterials = [];
let internalObjects = [];                 // X-ray content, parented to links, toggled as one set
let dynamicRods = [];                     // linkage rods updated every frame {mesh, a:[obj, vec], b:[obj, vec]}
let labels = [];                          // {obj, off, el, part, xrayOnly}
let spinners = [];                        // fan rotors spun while X-ray is on
let handModel = 'dex3';
let xray = false;
let explode = 0;
let selected = null;                      // {partId, piece}
let hovered = null;                       // {partId, piece}
let poseName = 'stand';
let wiggle = null;                        // {joint, start}
// External driver (phase 2): the MuJoCo sim or a motion replay sets the base pose + some joints.
// drive = { base: {pos:[x,y,z], quat:[w,x,y,z]} (MuJoCo/ROS world, z up), q: {joint: rad} } | null
let drive = null;
let ledRing = null;

function styleMaterial(name) {
  // URDF has two materials: "white" (shell) and "dark" (joints, head). Restyle both for the dark page.
  const dark = /dark/i.test(name);
  return new THREE.MeshStandardMaterial({
    color: dark ? 0x2b3038 : 0xc4cad3, metalness: dark ? 0.45 : 0.25, roughness: dark ? 0.45 : 0.42,
  });
}

function setXray(on) {
  xray = on;
  for (const m of bodyMaterials) {
    m.transparent = on;
    m.opacity = on ? XRAY_OPACITY : 1;
    m.depthWrite = !on;
    m.needsUpdate = true;
  }
  for (const o of internalObjects) o.visible = on;
  $('#legend').hidden = !on;
}

// ------------------------------------------------------------------------------ loading
const loader = new GLTFLoader();
let currentRoot = null;

function resetModelState() {
  if (currentRoot) {
    robot.remove(currentRoot);
    currentRoot.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose?.(); } });
  }
  for (const r of dynamicRods) { robot.remove(r.mesh); r.mesh.geometry.dispose(); }
  for (const l of labels) l.el.remove();
  links = {}; linkMeshes = {}; joints = {}; pickables = []; hotspotMeshes = []; bodyMaterials = [];
  internalObjects = []; dynamicRods = []; labels = []; spinners = [];
}

function loadModel(which) {
  handModel = which;
  $('#loading').classList.remove('done');
  $('#loading-fill').style.width = '0';
  $('#loading-text').textContent = 'Đang tải mô hình 3D…';
  loader.load(VARIANTS[which].glb, (gltf) => {
    resetModelState();
    currentRoot = gltf.scene;
    robot.add(currentRoot);
    currentRoot.traverse((o) => {
      if (o.userData && o.userData.joint) {
        const d = o.userData;
        joints[o.name] = {
          node: o, data: d, restQ: o.quaternion.clone(), restPos: o.position.clone(),
          axis: new THREE.Vector3(...(d.axis || [0, 0, 1])), q: 0, target: 0,
        };
      }
    });
    currentRoot.traverse((o) => {
      if (o.isMesh) {
        // GLTFLoader names a single-primitive mesh node after the node: "<link>__visual"
        const linkName = o.name.includes('__visual') ? o.name.replace(/__visual\d*$/, '') : o.parent.name;
        o.material = styleMaterial(o.material.name);
        bodyMaterials.push(o.material);
        o.userData.link = linkName;
        (linkMeshes[linkName] ||= []).push(o);
        pickables.push(o);
      } else if (!o.name.endsWith('__visual') && !o.userData.joint && o.name) {
        links[o.name] = o;
      }
    });
    buildHotspots();
    buildInternals();
    buildLabels();
    setXray(xray);
    setPose(poseName, true);
    $('#loading').classList.add('done');
    $('.brand span').textContent = `Cấu tạo · ${VARIANTS[which].label} · ${VARIANTS[which].dof} DoF`;
    overlays.build({ links, joints, linkMeshes });
    for (const k of ['axes', 'com', 'material', 'fov', 'dims', 'reach']) if (overlays.isOn(k)) overlays.set(k, true);
    renderSide();
  }, (ev) => {
    if (ev.total) $('#loading-fill').style.width = `${(ev.loaded / ev.total) * 100}%`;
  }, (err) => {
    $('#loading-text').textContent = `Không tải được ${VARIANTS[which].glb}: ${err.message || err}`;
  });
}

// ------------------------------------------------------------------------------ hotspots
function glowTexture(hex) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const col = new THREE.Color(hex);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.35, `rgba(${rgb},0.55)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function buildHotspots() {
  for (const [name, spot] of Object.entries(HOTSPOTS)) {
    const parent = links[spot.frame];
    if (!parent) continue;
    const grp = new THREE.Group();
    grp.position.set(...spot.pos);
    parent.add(grp);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 16),
      new THREE.MeshBasicMaterial({ color: spot.color, depthTest: false, transparent: true }));
    core.renderOrder = 10;
    core.userData.hotspot = name;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(spot.color), depthTest: false, transparent: true }));
    halo.scale.setScalar(0.05);
    halo.renderOrder = 9;
    grp.add(halo, core);
    grp.userData = { name, halo, core, phase: Math.random() * 6 };
    hotspotMeshes.push(core);
  }
}

// ------------------------------------------------------------------------------ X-ray internals
const mats = {};
function mat(hex, o = {}) {
  const k = `${hex}-${JSON.stringify(o)}`;
  return (mats[k] ||= new THREE.MeshStandardMaterial({ color: hex, metalness: 0.4, roughness: 0.45, ...o }));
}
const Y_UP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const track = (m) => { internalObjects.push(m); m.visible = xray; return m; };

/** Cylinder (axis along `axis`, local to parent) centred at `pos`. */
function cylinder(parent, r, len, axis, pos, material, seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), material);
  m.quaternion.setFromUnitVectors(Y_UP, axis.clone().normalize());
  m.position.copy(pos);
  parent.add(m);
  return track(m);
}
function box(parent, size, pos, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  m.position.set(...pos);
  parent.add(m);
  return track(m);
}

function addActuator(parent, motorName, axis, pos) {
  const M = MOTORS[motorName];
  const grp = new THREE.Group();
  grp.position.copy(pos);
  grp.quaternion.setFromUnitVectors(Y_UP, axis.clone().normalize());
  parent.add(grp);
  track(grp);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(M.radius, M.radius, M.length, 32),
    mat(M.color, { metalness: 0.5, roughness: 0.35, emissive: M.color, emissiveIntensity: 0.25, transparent: true, opacity: 0.75 }));
  const stator = new THREE.Mesh(new THREE.CylinderGeometry(M.radius * 0.72, M.radius * 0.72, M.length * 1.04, 24),
    mat(0xb87333, { metalness: 0.8, roughness: 0.3 }));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(M.radius * 0.28, M.radius * 0.28, M.length * 1.25, 16),
    mat(0x161b22, { metalness: 0.2, roughness: 0.8 }));
  grp.add(housing, stator, shaft);
  return grp;
}

function addCable(parentLink, from, to, color = 0xffa657, r = 0.0035) {
  const a = V(...from);
  const b = to.clone();
  const len = a.distanceTo(b);
  if (len < 0.01) return;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat(color, { emissive: color, emissiveIntensity: 0.5 }));
  m.quaternion.setFromUnitVectors(Y_UP, b.clone().sub(a).normalize());
  m.position.copy(a).add(b).multiplyScalar(0.5);
  parentLink.add(m);
  track(m);
}

function addRod(objA, pA, objB, pB, color = 0xd0d7de) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 10), mat(color, { metalness: 0.85, roughness: 0.25 }));
  robot.add(m);
  track(m);
  dynamicRods.push({ mesh: m, a: [objA, V(...pA)], b: [objB, V(...pB)] });
}

function addFan(parent, pos, r, axis) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.quaternion.setFromUnitVectors(Y_UP, axis.clone().normalize());
  parent.add(g);
  track(g);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.45, 24), mat(0x30363d, { transparent: true, opacity: 0.8 })));
  const rotor = new THREE.Group();
  for (let i = 0; i < 9; i += 1) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(r * 0.5, r * 0.4, 0.0012), mat(0x79c0ff, { emissive: 0x79c0ff, emissiveIntensity: 0.6 }));
    b.position.set(Math.cos((i / 9) * Math.PI * 2) * r * 0.6, 0, Math.sin((i / 9) * Math.PI * 2) * r * 0.6);
    b.rotation.y = -(i / 9) * Math.PI * 2 + 0.5;
    rotor.add(b);
  }
  g.add(rotor);
  spinners.push(rotor);
  return g;
}

function addCapBank(parent, pos) {
  const g = new THREE.Group();
  g.position.set(...pos);
  parent.add(g);
  track(g);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.03, 0.03), mat(0x1a7f37)));
  for (const [y, z] of [[-0.008, -0.008], [0.008, -0.008], [-0.008, 0.008], [0.008, 0.008]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 14), mat(0xd0d7de, { metalness: 0.7 }));
    c.rotation.z = Math.PI / 2;
    c.position.set(0.008, y, z);
    g.add(c);
  }
}

function buildInternals() {
  // 1) a joint module at every directly driven joint (parallel joints get their motors elsewhere)
  for (const [name, j] of Object.entries(joints)) {
    if (j.data.type !== 'revolute' || j.data.mimic) continue;
    const motor = motorOf(name);
    if (!motor || isParallel(name)) continue;
    if (handModel === 'inspire' && !/(hip|knee|waist|shoulder|elbow|wrist)/.test(name)) continue;
    if (MOTORS[motor]?.hand && handModel !== 'dex3') continue;
    const parent = links[j.data.parent];
    const axisInParent = j.axis.clone().applyQuaternion(j.restQ);
    addActuator(parent, motor, axisInParent, j.restPos);
  }
  // Inspire hand: 6 linear actuators in the palm (one per active DoF)
  if (handModel === 'inspire') {
    for (const s of ['left', 'right']) {
      const palm = links[`${s}_base_link`];
      if (!palm) continue;
      for (let i = 0; i < 6; i += 1) {
        cylinder(palm, 0.0045, 0.05, V(0, 0, 1), V(-0.02 + (i % 3) * 0.02, (i < 3 ? 0.005 : -0.005), 0.09), mat(0x56d364, { emissive: 0x56d364, emissiveIntensity: 0.4 }));
      }
    }
  }

  // 2) ankle: motor B (upper) and A (lower) stacked on the calf, rods down to the heel (zhongyou p.45)
  for (const s of ['left', 'right']) {
    const shin = links[`${s}_knee_link`];
    const foot = links[`${s}_ankle_roll_link`];
    if (!shin || !foot) continue;
    [[-0.065, 0.022], [-0.13, -0.022]].forEach(([z, dy]) => {
      addActuator(shin, 'N5020-16', V(0, 1, 0), V(-0.004, 0, z));
      addRod(shin, [-0.038, dy, z], foot, [-0.045, dy, 0.012]);
    });
    addCapBank(shin, [-0.038, 0, -0.205]);
  }
  // 3) waist roll/pitch: two N5020 in the lower torso pushing rods onto the waist yaw link (estimate)
  if (links.torso_link && links.waist_yaw_link && joints.waist_roll_joint) {
    for (const dy of [0.045, -0.045]) {
      addActuator(links.torso_link, 'N5020-16', V(0, 1, 0), V(-0.035, dy, 0.035));
      addRod(links.torso_link, [-0.06, dy, 0.035], links.waist_yaw_link, [-0.05, dy, 0.02]);
    }
  }

  for (const s of ['left', 'right']) {
    const base = links[`${s}_dex1_base_link`];
    if (base) addActuator(base, 'M4010 (Dex1)', V(1, 0, 0), V(0.03, 0, 0));
  }

  // 4) hollow-shaft cable run: link origin -> each child joint (static in the link frame)
  for (const j of Object.values(joints)) {
    if (j.data.type !== 'revolute') continue;
    if (/hand_|thumb|index|middle|ring|little/.test(j.data.child) && !/palm|base_link/.test(j.data.parent)) continue;
    addCable(links[j.data.parent], [0, 0, 0], j.restPos);
  }

  // 5) sensors at their URDF frames
  const d435 = links.d435_link;
  if (d435) {
    box(d435, [0.025, 0.09, 0.025], [0, 0, 0], mat(0x30363d, { metalness: 0.7 }));
    for (const y of [0.025, -0.025]) cylinder(d435, 0.006, 0.004, V(1, 0, 0), V(0.013, y, 0), mat(0x58a6ff, { emissive: 0x58a6ff, emissiveIntensity: 0.8 }));
    cylinder(d435, 0.005, 0.004, V(1, 0, 0), V(0.013, -0.01, 0), mat(0xf85149, { emissive: 0xf85149, emissiveIntensity: 0.6 }));
  }
  const lidar = links.mid360_link;
  if (lidar) {
    box(lidar, [0.065, 0.065, 0.04], [0, 0, 0.02], mat(0x8b949e, { metalness: 0.6 }));
    cylinder(lidar, 0.03, 0.022, V(0, 0, 1), V(0, 0, 0.05), mat(0x3fb950, { emissive: 0x3fb950, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }));
  }
  for (const n of ['imu_in_torso', 'imu_in_pelvis']) {
    if (links[n]) box(links[n], [0.022, 0.022, 0.006], [0, 0, 0], mat(0xbc8cff, { emissive: 0xbc8cff, emissiveIntensity: 0.6 }));
  }

  // 6) torso contents (zhongyou photos: board on the back, EDU Jetson above it, battery bay inside)
  const torso = links.torso_link;
  if (torso) {
    // mainboard (PC1, RK3588S) against the back shell, with Al heatsink and blower fan
    box(torso, [0.004, 0.15, 0.11], [-0.056, 0, 0.14], mat(0x1a7f37, { roughness: 0.7 }));
    box(torso, [0.01, 0.06, 0.05], [-0.049, -0.02, 0.13], mat(0xc9d1d9, { metalness: 0.8, roughness: 0.3 }));
    addFan(torso, V(-0.05, 0.045, 0.17), 0.022, V(1, 0, 0));
    // EDU: Jetson Orin NX above, copper heat pipe + fan
    box(torso, [0.008, 0.07, 0.045], [-0.05, -0.015, 0.235], mat(0x76b900, { metalness: 0.5, emissive: 0x76b900, emissiveIntensity: 0.25 }));
    addCable(torso, [-0.046, -0.04, 0.235], V(-0.046, 0.05, 0.235), 0xc87533, 0.004);
    addFan(torso, V(-0.05, 0.05, 0.235), 0.018, V(1, 0, 0));
    // battery pack, inserted from the side (left here), 2 handles + 4 LEDs on its face
    const pack = new THREE.Group();
    pack.position.set(0.012, 0.03, 0.1);
    torso.add(pack);
    track(pack);
    pack.add(new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.09), mat(0x8b949e, { transparent: true, opacity: 0.45, emissive: 0xf85149, emissiveIntensity: 0.15 })));
    const cellGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.06, 12);
    for (let iy = 0; iy < 7; iy += 1) {
      for (let iz = 0; iz < 4; iz += 1) {
        const c = new THREE.Mesh(cellGeo, mat(0xf85149, { metalness: 0.5, emissive: 0xf85149, emissiveIntensity: 0.2 }));
        c.rotation.z = Math.PI / 2;
        c.position.set(0, -0.06 + iy * 0.02, -0.03 + iz * 0.02);
        pack.add(c);
      }
    }
    for (const z of [-0.025, 0.025]) {
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.018), mat(0x30363d));
      hd.position.set(0, 0.078, z);
      pack.add(hd);
    }
    for (let i = 0; i < 4; i += 1) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.003), mat(0x3fb950, { emissive: 0x3fb950, emissiveIntensity: 2 }));
      led.position.set(-0.012 + i * 0.008, 0.077, 0);
      pack.add(led);
    }
    // speaker (torso cavity, front-lower), mic flex board under the face (estimate), neck ports
    cylinder(torso, 0.02, 0.012, V(1, 0, 0), V(0.06, 0, 0.04), mat(0xa5d6ff, { metalness: 0.6 }));
    box(torso, [0.002, 0.075, 0.012], [0.068, 0, 0.36], mat(0xe3b341, { roughness: 0.6 }));
    for (let i = 0; i < 4; i += 1) cylinder(torso, 0.0025, 0.003, V(1, 0, 0), V(0.07, -0.03 + i * 0.02, 0.36), mat(0xa5d6ff, { emissive: 0xa5d6ff, emissiveIntensity: 1 }));
    box(torso, [0.004, 0.07, 0.04], [-0.06, 0, 0.3], mat(0xffa657, { emissive: 0xffa657, emissiveIntensity: 0.3 }));
    // head: RGB LED strip around the face + head MCU board
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.0025, 8, 48, Math.PI * 1.6), new THREE.MeshStandardMaterial({ color: 0xff7b72, emissive: 0xff7b72, emissiveIntensity: 1.2 }));
    ledRing = ring;
    ring.rotation.set(0, Math.PI / 2, Math.PI * 0.7);
    ring.position.set(0.075, 0, 0.405);
    torso.add(ring);
    track(ring);
    box(torso, [0.003, 0.045, 0.035], [-0.02, 0, 0.44], mat(0x1a7f37));
    // power + data trunk: battery -> board, board -> head
    addCable(torso, [-0.05, 0, 0.14], V(-0.05, 0, 0.3), 0xffa657, 0.003);
    addCable(torso, [0.0, 0.03, 0.1], V(-0.05, 0.03, 0.12), 0xf85149, 0.004);
  }
  // 7) cooling: two blower fans in the hip area, one in the waist module, copper heat spreader at the knees
  if (links.pelvis) for (const dy of [0.03, -0.03]) addFan(links.pelvis, V(-0.035, dy, -0.05), 0.018, V(0, 1, 0));
  if (links.waist_yaw_link) addFan(links.waist_yaw_link, V(-0.04, 0, 0.03), 0.014, V(0, 0, 1));
  for (const s of ['left', 'right']) {
    const thigh = links[`${s}_hip_yaw_link`];
    const knee = joints[`${s}_knee_joint`];
    if (!thigh || !knee) continue;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 8, 32, Math.PI * 0.9), mat(0xe3b341, { metalness: 0.9, roughness: 0.25, emissive: 0x8a5a00, emissiveIntensity: 0.4 }));
    arc.rotation.x = Math.PI / 2;
    arc.position.copy(knee.restPos);
    thigh.add(arc);
    track(arc);
  }
  // 8) capacitor banks near the wrists
  for (const s of ['left', 'right']) if (links[`${s}_elbow_link`]) addCapBank(links[`${s}_elbow_link`], [0.06, 0, -0.025]);

  $('#legend').innerHTML = '<b style="margin-bottom:2px">Nhìn xuyên - actuator theo loại</b>'
    + [...new Set(Object.keys(joints).map((n) => motorOf(n)).filter(Boolean))].map((n) => [n, MOTORS[n]]).filter(([, m]) => m).map(([n, m]) => `<div><i style="background:${m.css}"></i>${n} <span class="faint">${m.effort} N·m</span></div>`).join('')
    + (handModel === 'inspire' ? '<div><i style="background:#56d364"></i>Xi-lanh điện tay Inspire</div>' : '')
    + '<div><i style="background:#ffa657"></i>Dây XT30 + CAN trong trục rỗng</div>'
    + '<div><i style="background:#1a7f37"></i>Mainboard · <i style="background:#76b900"></i>Jetson · <i style="background:#f85149;opacity:.6"></i>Pin</div>'
    + '<div><i style="background:#79c0ff"></i>Quạt · <i style="background:#e3b341"></i>Tản đồng gối</div>'
    + '<div class="faint">Trục motor = URDF; bố trí trong thân/đầu theo ảnh tháo rời (ước lượng)</div>';
}

// ------------------------------------------------------------------------------ labels
const LABELS = [
  ['head_link', [0.08, 0, 0.47], 'Đầu', 'head'],
  ['d435_link', [0.03, 0, 0], 'Camera D435i', 'depth_camera'],
  ['mid360_link', [0, 0, -0.04], 'LiDAR MID-360', 'lidar'],
  ['torso_link', [0.09, -0.06, 0.2], 'Thân', 'torso'],
  ['left_shoulder_roll_link', [0, 0.05, -0.02], 'Vai', 'shoulder'],
  ['left_elbow_link', [0.02, 0.04, 0], 'Khuỷu', 'elbow'],
  ['left_wrist_pitch_link', [0.02, 0.04, 0.02], 'Cổ tay', 'wrist'],
  ['left_hand_palm_link', [0.06, 0.04, 0], 'Bàn tay Dex3-1', 'hand'],
  ['left_base_link', [0.0, 0.05, 0.08], 'Bàn tay Inspire', 'inspire'],
  ['left_dex1_base_link', [0.05, 0.05, 0], 'Tay kẹp Dex1-1', 'dex1'],
  ['left_rubber_hand', [0.05, 0.05, 0], 'Tay cao su', 'rubber_hand'],
  ['left_wrist_roll_rubber_hand', [0.08, 0.05, 0], 'Tay cao su', 'rubber_hand'],
  ['neck_pitch_link', [0.05, 0.06, 0], 'Cổ (G1+)', 'neck'],
  ['handle_link', [-0.04, 0, 0.03], 'Tay cầm sau lưng', 'handle'],
  ['waist_yaw_link', [0.05, -0.05, 0.03], 'Eo', 'waist'],
  ['pelvis', [0.05, -0.07, -0.06], 'Khung chậu', 'pelvis'],
  ['left_hip_roll_link', [0.06, 0.05, -0.04], 'Hông', 'hip'],
  ['left_hip_yaw_link', [0.04, 0.05, -0.12], 'Đùi', 'thigh'],
  ['left_knee_link', [0.06, 0.04, -0.12], 'Cẳng chân', 'shin'],
  ['left_ankle_roll_link', [0.12, 0.04, 0], 'Bàn chân', 'foot'],
  ['torso_link', [-0.07, 0.0, 0.31], 'Cổng sau gáy', 'ports', true],
  ['torso_link', [0.012, 0.11, 0.1], 'Pin (cắm bên sườn)', 'battery', true],
  ['torso_link', [-0.06, -0.08, 0.235], 'Jetson Orin NX (EDU)', 'compute', true],
  ['torso_link', [-0.06, -0.08, 0.13], 'Mainboard RK3588S', 'compute', true],
  ['pelvis', [-0.05, 0.06, -0.05], 'Quạt hông × 2', 'cooling', true],
  ['left_knee_link', [-0.05, 0.03, -0.065], 'Motor cổ chân B', 'shin', true],
  ['left_knee_link', [-0.05, 0.03, -0.13], 'Motor cổ chân A', 'shin', true],
  ['imu_in_pelvis', [0, 0, 0], 'IMU', 'imu', true],
];
function buildLabels() {
  const host = $('#labels3d');
  for (const [link, off, text, part, xrayOnly] of LABELS) {
    const obj = links[link];
    if (!obj) continue;
    const el = h('span', { class: 'label3d', style: `--c:${PARTS[part].color}` }, text);
    host.append(el);
    labels.push({ obj, off: V(...off), el, part, xrayOnly: !!xrayOnly });
  }
}
const tmpV = new THREE.Vector3();
function updateLabels() {
  const show = $('#opt-labels').checked;
  const rect = renderer.domElement.getBoundingClientRect();
  for (const l of labels) {
    const visible = show && (!l.xrayOnly || xray);
    if (!visible) { l.el.style.display = 'none'; continue; }
    tmpV.copy(l.off);
    l.obj.localToWorld(tmpV);
    tmpV.project(camera);
    if (tmpV.z > 1 || Math.abs(tmpV.x) > 1.05 || Math.abs(tmpV.y) > 1.05) { l.el.style.display = 'none'; continue; }
    l.el.style.display = '';
    l.el.style.opacity = selected && selected.partId !== l.part ? 0.45 : 1;
    l.el.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * rect.width}px, ${(-tmpV.y * 0.5 + 0.5) * rect.height}px)`;
  }
}

// ------------------------------------------------------------------------------ poses
const L = (side, name) => `${side}_${name}_joint`;
function standPose() {
  const q = {};
  for (const s of ['left', 'right']) {
    const sg = s === 'left' ? 1 : -1;
    Object.assign(q, {
      [L(s, 'hip_pitch')]: -0.1, [L(s, 'knee')]: 0.3, [L(s, 'ankle_pitch')]: -0.2,
      [L(s, 'shoulder_pitch')]: 0.3, [L(s, 'shoulder_roll')]: 0.25 * sg, [L(s, 'elbow')]: 0.97,
      [L(s, 'wrist_roll')]: 0.15 * sg,
    });
  }
  return q;
}
function handClose(q, side, k) {
  if (handModel === 'dex1') {
    for (const n of ['dex1_finger_joint_1', 'dex1_finger_joint_2']) {
      const j = joints[`${side}_${n}`];
      if (j) q[`${side}_${n}`] = j.data.upper - (j.data.upper - j.data.lower) * k;
    }
    return;
  }
  if (handModel === 'inspire') {
    // active joints only; distal ones follow via <mimic>. Close toward the bound with larger magnitude.
    for (const n of ['thumb_2', 'index_1', 'middle_1', 'ring_1', 'little_1']) {
      const j = joints[`${side}_${n}_joint`];
      if (!j) continue;
      const far = Math.abs(j.data.upper) > Math.abs(j.data.lower) ? j.data.upper : j.data.lower;
      q[`${side}_${n}_joint`] = far * 0.85 * k;
    }
    const t1 = joints[`${side}_thumb_1_joint`];
    if (t1) q[`${side}_thumb_1_joint`] = (Math.abs(t1.data.upper) > Math.abs(t1.data.lower) ? t1.data.upper : t1.data.lower) * 0.8;
    return;
  }
  const sg = side === 'left' ? 1 : -1;            // URDF mirrors the Dex3 finger limits between hands
  q[`${side}_hand_index_0_joint`] = -1.0 * k * sg;
  q[`${side}_hand_index_1_joint`] = -1.2 * k * sg;
  q[`${side}_hand_middle_0_joint`] = -1.0 * k * sg;
  q[`${side}_hand_middle_1_joint`] = -1.2 * k * sg;
  q[`${side}_hand_thumb_1_joint`] = 0.45 * k * sg;
  q[`${side}_hand_thumb_2_joint`] = 1.1 * k * sg;
}
const POSES = {
  stand: () => standPose(),
  zero: () => ({}),
  squat: () => {
    const q = standPose();
    for (const s of ['left', 'right']) {
      Object.assign(q, { [L(s, 'hip_pitch')]: -1.05, [L(s, 'knee')]: 1.9, [L(s, 'ankle_pitch')]: -0.85,
        [L(s, 'shoulder_pitch')]: -0.9, [L(s, 'elbow')]: 0.4 });
    }
    return q;
  },
  wave: (t) => {
    const q = standPose();
    Object.assign(q, {
      right_shoulder_pitch_joint: -0.2, right_shoulder_roll_joint: -1.35, right_shoulder_yaw_joint: -1.3,
      right_elbow_joint: 0.05 + 0.35 * Math.sin(t * 4.5), right_wrist_roll_joint: 0,
    });
    return q;
  },
  grasp: (t) => {
    const q = standPose();
    const k = 0.5 - 0.5 * Math.cos(t * 1.6);
    for (const s of ['left', 'right']) {
      q[L(s, 'shoulder_pitch')] = -0.55;
      q[L(s, 'elbow')] = 0.15;
      handClose(q, s, k);
    }
    return q;
  },
  walk: (t) => {
    const q = standPose();
    const w = t * 5.2;
    for (const [s, ph] of [['left', 0], ['right', Math.PI]]) {
      const sw = Math.sin(w + ph);
      const lift = Math.max(0, Math.sin(w + ph + Math.PI / 2));
      q[L(s, 'hip_pitch')] = -0.25 - 0.35 * sw - 0.25 * lift;
      q[L(s, 'knee')] = 0.45 + 0.75 * lift;
      q[L(s, 'ankle_pitch')] = -0.2 + 0.3 * sw - 0.35 * lift;
      q[L(s, 'shoulder_pitch')] = 0.3 + 0.35 * sw;
      q[L(s, 'elbow')] = 0.9;
    }
    q.waist_yaw_joint = 0.08 * Math.sin(w);
    return q;
  },
};

function setPose(name, snap = false) {
  poseName = name;
  const q = POSES[name](0);
  for (const [n, j] of Object.entries(joints)) {
    j.target = q[n] ?? 0;
    if (snap) j.q = j.target;
  }
}

const tmpQ = new THREE.Quaternion();
const tmpAxis = new THREE.Vector3();
function setJointQ(j) {
  if (j.data.type === 'prismatic') {
    j.node.quaternion.copy(j.restQ);
    j.node.position.copy(j.restPos).multiplyScalar(1 + explode * 1.4)
      .add(tmpAxis.copy(j.axis).applyQuaternion(j.restQ).multiplyScalar(j.q));
    return;
  }
  j.node.quaternion.copy(j.restQ).multiply(tmpQ.setFromAxisAngle(j.axis, j.q));
  j.node.position.copy(j.restPos).multiplyScalar(1 + explode * 1.4);
}
function applyJoints(dt, t) {
  const q = POSES[poseName](t);
  const mimics = [];
  for (const [n, j] of Object.entries(joints)) {
    if (j.data.type !== 'revolute' && j.data.type !== 'prismatic') continue;
    if (j.data.mimic) { mimics.push(j); continue; }
    if (drive && drive.q[n] !== undefined) { j.q = drive.q[n]; setJointQ(j); continue; }
    let target = q[n] ?? 0;
    if (wiggle && wiggle.joint === n) {
      const k = (t - wiggle.start) / 2.4;
      if (k >= 1) wiggle = null;
      else {
        const lo = j.data.lower ?? -1;
        const hi = j.data.upper ?? 1;
        const mid = Math.min(hi, Math.max(lo, target));
        const amp = Math.min(j.data.type === 'prismatic' ? 0.02 : 0.6, (hi - lo) * 0.35);
        target = Math.min(hi, Math.max(lo, mid + amp * Math.sin(k * Math.PI * 4) * Math.sin(k * Math.PI)));
      }
    }
    j.target = Math.min(j.data.upper ?? Infinity, Math.max(j.data.lower ?? -Infinity, target));
    j.q += (j.target - j.q) * Math.min(1, dt * 7);
    setJointQ(j);
  }
  // Inspire distal joints follow their driver (URDF <mimic>); chains (thumb_4 <- thumb_3 <- thumb_2) resolve in 2 passes
  for (let pass = 0; pass < 2; pass += 1) {
    for (const j of mimics) {
      const src = joints[j.data.mimic.joint];
      if (src) j.q = src.q * j.data.mimic.multiplier + j.data.mimic.offset;
    }
  }
  for (const j of mimics) setJointQ(j);
}

const followPrev = new THREE.Vector3();
let followInit = false;
function applyDriveBase() {
  const [x, y, z] = drive.base.pos;
  const [w, qx, qy, qz] = drive.base.quat;
  currentRoot.position.set(x, y, z);
  currentRoot.quaternion.set(qx, qy, qz, w);
  robot.position.y = 0;
  robot.updateMatrixWorld(true);
  // camera follows the pelvis horizontally
  const p = links.pelvis.getWorldPosition(new THREE.Vector3());
  if (!followInit) {
    // first frame of a drive: jump the view onto the robot, keep the viewing angle
    const jump = new THREE.Vector3(p.x - controls.target.x, 0, p.z - controls.target.z);
    controls.target.add(jump);
    camera.position.add(jump);
    followPrev.copy(p);
    followInit = true;
  }
  const d = p.clone().sub(followPrev);
  d.y = 0;
  controls.target.add(d);
  camera.position.add(d);
  followPrev.copy(p);
}
function setDrive(next) {
  drive = next;
  floorGrid.visible = !!next;
  if (!next && currentRoot) {
    currentRoot.position.set(0, 0, 0);
    currentRoot.quaternion.identity();
    followInit = false;
  }
}

const footPos = new THREE.Vector3();
function groundRobot() {
  robot.updateMatrixWorld(true);
  let minY = Infinity;
  for (const s of ['left', 'right']) {
    const f = links[`${s}_ankle_roll_link`];
    if (!f) continue;
    f.getWorldPosition(footPos);
    minY = Math.min(minY, footPos.y - SOLE_BELOW_ANKLE);
  }
  if (Number.isFinite(minY)) {
    robot.position.y -= minY;                   // feet on the ground
    robot.updateMatrixWorld(true);
  }
}

const rodA = new THREE.Vector3();
const rodB = new THREE.Vector3();
function updateRods() {
  for (const r of dynamicRods) {
    rodA.copy(r.a[1]); r.a[0].localToWorld(rodA);
    rodB.copy(r.b[1]); r.b[0].localToWorld(rodB);
    robot.worldToLocal(rodA);
    robot.worldToLocal(rodB);
    const len = rodA.distanceTo(rodB);
    r.mesh.position.copy(rodA).add(rodB).multiplyScalar(0.5);
    r.mesh.scale.set(1, len, 1);
    r.mesh.quaternion.setFromUnitVectors(Y_UP, rodB.sub(rodA).normalize());
  }
}

// ------------------------------------------------------------------------------ selection
function partMeshes(partId, piece) {
  const part = PARTS[partId];
  if (!part) return [];
  const ls = part.highlight === 'link' && piece && linkMeshes[piece] ? [piece] : (part.links || []);
  return ls.flatMap((l) => linkMeshes[l] || []);
}

function refreshHighlight() {
  for (const ms of Object.values(linkMeshes)) for (const m of ms) m.material.emissive.setHex(0x000000);
  const paint = (sel, color) => {
    if (!sel) return;
    for (const m of partMeshes(sel.partId, sel.piece)) m.material.emissive.copy(color);
  };
  paint(hovered, HOVER_EMISSIVE);
  paint(selected, SELECT_EMISSIVE);
  for (const s of hotspotMeshes) {
    const on = selected && HOTSPOT_TO_PART[s.userData.hotspot] === selected.partId;
    s.parent.userData.halo.scale.setScalar(on ? 0.1 : 0.05);
  }
}

const focus = { from: null, to: null, start: 0, camFrom: new THREE.Vector3(), camTo: new THREE.Vector3() };
function focusOn(objects) {
  const box3 = new THREE.Box3();
  for (const o of objects) box3.expandByObject(o);
  if (box3.isEmpty()) return;
  const center = box3.getCenter(new THREE.Vector3());
  const size = box3.getSize(new THREE.Vector3()).length();
  const dir = camera.position.clone().sub(controls.target).normalize();
  const dist = THREE.MathUtils.clamp(size * 2.6, 0.55, 3.2);
  focus.from = controls.target.clone();
  focus.to = center;
  focus.camFrom.copy(camera.position);
  focus.camTo.copy(center).addScaledVector(dir, dist);
  focus.start = performance.now() / 1000;
}

function select(partId, piece = null, { focusCam = true, fromList = false } = {}) {
  selected = partId ? { partId, piece } : null;
  refreshHighlight();
  renderSide();
  if (!partId || !focusCam) return;
  const part = PARTS[partId];
  let objs = partMeshes(partId, piece);
  if (fromList && part.highlight === 'link') objs = objs.filter((m) => !m.userData.link.startsWith('right_'));
  if (part.hotspots) for (const s of hotspotMeshes) if (part.hotspots.includes(s.userData.hotspot)) objs.push(s);
  focusOn(objs);
}

// ------------------------------------------------------------------------------ picking
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const spots = raycaster.intersectObjects(hotspotMeshes, false);
  if (spots.length) {
    const name = spots[0].object.userData.hotspot;
    return { partId: HOTSPOT_TO_PART[name], piece: name };
  }
  for (const hit of raycaster.intersectObjects(pickables, false)) {
    const link = hit.object.userData.link;
    const partId = LINK_TO_PART[link];
    if (partId) return { partId, piece: link };
  }
  return null;
}

const tooltip = $('#tooltip');
let downAt = null;
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (ev.buttons) { tooltip.hidden = true; return; }
  const p = pick(ev);
  const same = p && hovered && p.partId === hovered.partId && p.piece === hovered.piece;
  if (!same) { hovered = p; refreshHighlight(); }
  if (p) {
    tooltip.hidden = false;
    tooltip.innerHTML = `${PARTS[p.partId].title}<small>${pieceLabel(p.partId, p.piece) || ''}</small>`;
    tooltip.style.left = `${ev.clientX + 14}px`;
    tooltip.style.top = `${ev.clientY + 12}px`;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tooltip.hidden = true;
    renderer.domElement.style.cursor = '';
  }
});
renderer.domElement.addEventListener('pointerleave', () => { tooltip.hidden = true; hovered = null; refreshHighlight(); });
renderer.domElement.addEventListener('pointerdown', (ev) => { downAt = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener('pointerup', (ev) => {
  if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5) return;
  const p = pick(ev);
  if (p) {
    select(p.partId, p.piece, { focusCam: false });
    const j = jointOfLink(p.piece);
    if (j && !isParallel(j)) wiggleJoint(j);
  } else select(null);
});
renderer.domElement.addEventListener('dblclick', (ev) => {
  const p = pick(ev);
  if (p) { select(p.partId, p.piece); openCloseup(p.partId, p.piece); }
});

// ------------------------------------------------------------------------------ joint helpers
function jointOfLink(link) {
  if (!link) return null;
  for (const [n, j] of Object.entries(joints)) if (j.data.child === link && (j.data.type === 'revolute' || j.data.type === 'prismatic')) return n;
  return null;
}
function wiggleJoint(name) {
  const j = joints[name];
  wiggle = { joint: j?.data.mimic ? j.data.mimic.joint : name, start: clock.elapsedTime };
}
function linkMass(link) { return links[link]?.userData?.mass; }
const fmtDeg = (r) => `${Math.round(r * DEG)}°`;

function pieceLabel(partId, piece) {
  const part = PARTS[partId];
  if (part.variants && part.variants[piece]) return part.variants[piece];
  const j = jointOfLink(piece);
  if (j) {
    const d = describeJoint(j);
    return `${d.short}${motorOf(j) && partId !== 'inspire' ? ` · ${motorOf(j)}` : ''}`;
  }
  if (piece && /palm|base_link/.test(piece)) return `Lòng bàn tay ${piece.startsWith('left') ? 'trái' : 'phải'}`;
  if (piece && /force_sensor/.test(piece)) return 'Cảm biến lực (Inspire FTP)';
  return '';
}

// ------------------------------------------------------------------------------ side panel
let tab = 'parts';
function setTab(name) {
  tab = name;
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === name));
  renderSide();
}
for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => setTab(b.dataset.tab));

function sourcesEl(keys) {
  return h('p', { class: 'sources' }, 'Nguồn: ', ...keys.flatMap((k, i) => [i ? ' · ' : '', h('a', { href: SRC[k][1], target: '_blank', rel: 'noopener' }, SRC[k][0])]));
}
function kv(rows) {
  return h('dl', { class: 'kv' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', { html: v })]));
}

function renderSide() {
  const body = $('#side-body');
  body.replaceChildren();
  if (tab === 'joints') return renderJointTable(body);
  if (tab === 'system') return renderSystem(body);
  if (tab === 'functions') return fnUI.render(body);
  if (!selected) return renderOverview(body);
  renderPart(body, selected.partId, selected.piece);
}

function partAvailable(id) {
  const p = PARTS[id];
  if (!p.links && !p.hotspots) return true;
  return (p.links || []).some((l) => linkMeshes[l]) || (p.hotspots || []).some((h) => links[HOTSPOTS[h]?.frame]);
}

function renderOverview(body) {
  body.append(
    h('h2', {}, 'Unitree G1 EDU'),
    h('p', { class: 'muted' }, OVERVIEW.body),
    h('div', { class: 'overview-stats' }, ...OVERVIEW.stats.map(([b, s], i) => (i === 2
      ? h('div', {}, h('b', {}, `${Object.values(joints).filter((j) => j.data.type !== 'fixed' && !j.data.mimic).length} khớp`), h('span', {}, `${VARIANTS[handModel].label}`))
      : h('div', {}, h('b', {}, b), h('span', {}, s))))),
  );
  for (const g of GROUPS) {
    body.append(h('div', { class: 'group-title' }, g.title));
    for (const id of g.parts) {
      const p = PARTS[id];
      const ok = partAvailable(id);
      body.append(h('button', {
        class: 'part-item', type: 'button', style: `--c:${p.color}${ok ? '' : ';opacity:.55'}`,
        title: ok ? null : 'Đổi "Tay" trên thanh công cụ để xem trên mô hình',
        onclick: () => select(id, null, { fromList: true }),
      },
      h('span', { class: 'ico' }, p.icon),
      h('span', { class: 'txt' }, h('b', {}, p.title), h('small', {}, p.tag)),
      p.closeup ? h('span', { class: 'more', title: 'Có cutaway 3D' }, '🔍') : null));
    }
  }
  body.append(sourcesEl(['urdf', 'zhongyou', 'qre', 'rllab', 'sdk', 'g1', 'dex3', 'munro', 'arxivSec']));
}

function renderPart(body, id, piece) {
  const part = PARTS[id];
  body.append(
    h('button', { class: 'back', type: 'button', onclick: () => select(null) }, '← Tất cả bộ phận'),
    h('div', { class: 'part-head', style: `--c:${part.color}` }, h('span', { class: 'ico' }, part.icon),
      h('div', {}, h('h2', {}, part.title), h('div', { class: 'part-tag' }, part.tag))),
  );
  if (!partAvailable(id)) {
    const v = PART_VARIANT[id] || 'dex3';
    body.append(h('div', { class: 'caveat' }, '↺ Bộ phận này không có trong phiên bản đang xem. ',
      h('button', { class: 'btn small', type: 'button', onclick: () => { $('#opt-hand').value = v; loadModel(v); } },
        `Đổi sang: ${VARIANTS[v].label}`)));
  }
  body.append(h('p', {}, part.body));

  // the clicked piece: joint data straight from the GLB (URDF) extras
  const j = jointOfLink(piece);
  const pieceRows = [];
  if (j) {
    const jd = joints[j].data;
    const d = describeJoint(j);
    const motor = id === 'inspire' ? null : motorOf(j);
    const M = MOTORS[motor];
    const sdkIdx = SDK_ORDER.indexOf(j);
    const handIdx = HAND_ORDER.indexOf(d.key.replace('hand_', ''));
    pieceRows.push(['Khớp', `<code>${j}</code>`], ['Chức năng', d.what]);
    pieceRows.push(['Tầm (URDF)', jd.type === 'prismatic' ? `${(jd.lower * 1000).toFixed(1)} … ${(jd.upper * 1000).toFixed(1)} mm (khớp tịnh tiến)` : `${fmtDeg(jd.lower)} … ${fmtDeg(jd.upper)}`]);
    pieceRows.push(['Giới hạn (URDF)', jd.type === 'prismatic' ? `${jd.effort} N · ${jd.velocity} m/s` : `${jd.effort} N·m · ${jd.velocity} rad/s`]);
    if (jd.mimic) pieceRows.push(['Đi theo', `<code>${jd.mimic.joint}</code> × ${jd.mimic.multiplier} (thanh nối, không có motor riêng)`]);
    if (motor) pieceRows.push(['Actuator', `<span class="motor-dot" style="background:${M.css}"></span>${motor}${isParallel(j) ? ' × 2 (song song A/B)' : ''}${M.mass ? ` · ${M.mass}` : ''}`]);
    if (sdkIdx >= 0) pieceRows.push(['SDK motor index', `${sdkIdx}${isParallel(j) ? ` (${/pitch/.test(j) ? 'B' : 'A'} trong Mode::AB)` : ''}`]);
    if (handIdx >= 0 && /hand_/.test(j)) pieceRows.push(['Dex3 motor index', `${handIdx}`]);
    const axisIdx = (jd.axis || [0, 0, 1]).findIndex((v) => Math.abs(v) > 0.5);
    pieceRows.push([jd.type === 'prismatic' ? 'Trục trượt' : 'Trục quay', ['x (roll)', 'y (pitch)', 'z (yaw)'][axisIdx]]);
  }
  const mass = linkMass(piece);
  if (mass) pieceRows.push(['Khối lượng link', `${mass.toFixed(3)} kg`]);
  const label = pieceLabel(id, piece);
  if (piece && (pieceRows.length || label)) {
    const pc = h('div', { class: 'piece' }, h('b', {}, j ? describeJoint(j).short : label), pieceRows.length ? kv(pieceRows) : null);
    if (j && !isParallel(j)) pc.append(h('div', { style: 'margin-top:6px' }, h('button', { class: 'btn small', type: 'button', onclick: () => wiggleJoint(j) }, '▶ Cử động khớp này')));
    body.append(pc);
  } else if (part.highlight === 'link') {
    body.append(h('p', { class: 'faint' }, 'Click một khâu cụ thể trên robot để xem khớp, motor, tầm quay và khối lượng của nó.'));
  }

  if (part.closeup) {
    body.append(h('button', { class: 'btn primary open-inside', type: 'button', onclick: () => openCloseup(id, piece) },
      '🔍 Mở bên trong - cấu tạo vật lý 3D'));
  }
  if (part.inside) {
    body.append(h('h3', {}, 'Cấu tạo bên trong'),
      h('ul', { class: 'inside' }, ...part.inside.map(([n, t]) => h('li', {}, h('b', {}, n), t ? h('span', { class: 'muted' }, ` - ${t}`) : null))));
  }
  if (part.specs) body.append(h('h3', {}, 'Thông số'), kv(part.specs));
  if (part.related) {
    body.append(h('h3', {}, 'Liên quan'), h('div', {}, ...part.related.map((r) =>
      h('button', { class: 'chip', type: 'button', style: 'cursor:pointer', onclick: () => select(r, null, { fromList: true }) }, PARTS[r].title))));
  }
  if (part.caveat) body.append(h('div', { class: 'caveat' }, '⚠ ', part.caveat));
  if (part.sources) body.append(sourcesEl(part.sources));
}

function renderJointTable(body) {
  body.append(h('h2', {}, 'Bảng khớp'),
    h('p', { class: 'muted' }, 'Đủ 29 khớp thân theo thứ tự motor của rt/lowcmd + các khớp bàn tay đang hiển thị. '
      + 'Số liệu từ URDF; loại motor từ unitree_rl_lab. Click một dòng để xem và cử động khớp đó.'));
  const rows = [];
  const handJoints = handModel === 'dex3'
    ? ['left', 'right'].flatMap((s) => HAND_ORDER.map((n) => `${s}_hand_${n}_joint`))
    : Object.keys(joints).filter((n) => /(thumb|index|middle|ring|little)_\d_joint$|dex1_finger/.test(n));
  const extra = Object.keys(joints).filter((n) => /^neck_/.test(n));
  for (const n of [...SDK_ORDER, ...extra, ...handJoints]) {
    const j = joints[n];
    if (!j) continue;
    const d = describeJoint(n);
    const motor = handModel === 'inspire' && !SDK_ORDER.includes(n) ? (j.data.mimic ? 'thanh nối' : 'xi-lanh điện') : motorOf(n);
    const M = MOTORS[motor];
    const sdk = SDK_ORDER.indexOf(n);
    const hi = HAND_ORDER.indexOf(d.key.replace('hand_', ''));
    rows.push(h('tr', { onclick: () => { setTab('parts'); select(LINK_TO_PART[j.data.child], j.data.child); wiggleJoint(n); } },
      h('td', { class: 'faint' }, sdk >= 0 ? String(sdk) : hi >= 0 ? `H${hi}` : '·'),
      h('td', {}, d.short),
      h('td', { html: `<span class="motor-dot" style="background:${M?.css || '#56d364'}"></span>${motor}${isParallel(n) ? ' ×2' : ''}` }),
      h('td', {}, j.data.type === 'prismatic' ? `${(j.data.lower * 1000).toFixed(0)}…${(j.data.upper * 1000).toFixed(1)} mm` : `${fmtDeg(j.data.lower)}…${fmtDeg(j.data.upper)}`),
      h('td', {}, `${j.data.effort}`)));
  }
  body.append(h('table', { class: 'joints' },
    h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Khớp'), h('th', {}, 'Motor'), h('th', {}, 'Tầm'), h('th', {}, 'N·m'))),
    h('tbody', {}, ...rows)));
  body.append(sourcesEl(['urdf', 'rllab', 'sdk', 'qre', 'dex3']));
}

function renderSystem(body) {
  body.append(h('h2', {}, 'Hệ thống'),
    h('p', { class: 'muted' }, 'Robot là 3 hệ chồng lên nhau: cơ khí (khung nhôm + vỏ nhựa + 29 khớp + tay), điện (pin 13S → mainboard → '
      + 'chuỗi XT30 tới từng khớp) và dữ liệu (DDS trên Ethernet giữa các máy tính, CAN xuống các khớp).'));
  body.append(h('h3', {}, 'Luồng điều khiển một bước'), h('ul', { class: 'inside' },
    ...[
      ['Cảm biến', 'IMU pelvis + 2 encoder mỗi khớp → mainboard (CAN) → rt/lowstate; D435i, MID-360 → đầu → thân'],
      ['Quyết định', 'service ai_sport của Unitree trên PC1 RK3588S, hoặc code của bạn trên PC2 Jetson'],
      ['Lệnh khớp', 'rt/lowcmd: mỗi motor nhận q, dq, τ, Kp, Kd (+ CRC32) mỗi 2 ms'],
      ['Xuống khớp', 'mainboard gửi qua CAN nối chuỗi tới driver tròn trong từng khớp'],
      ['Trong khớp', 'driver tính τ = Kp·(q* − q) + Kd·(dq* − dq) + τff → FOC → dòng 3 pha'],
      ['Cơ khí', 'rotor 3000–5000 rpm → 2 tầng hành tinh → ổ bi đũa chéo → mặt bích → khâu'],
    ].map(([a, b]) => h('li', {}, h('b', {}, a), h('span', { class: 'muted' }, ` - ${b}`)))));
  body.append(h('h3', {}, 'Họ actuator (đường T-N do Unitree đo)'));
  body.append(h('table', { class: 'joints' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Motor'), h('th', {}, 'Tỉ số'), h('th', {}, 'Đỉnh N·m'), h('th', {}, 'Không tải'), h('th', {}, 'Dùng ở'))),
    h('tbody', {}, ...[
      ['N7520-22.5', 'hông roll, gối'], ['N7520-14.3', 'hông pitch/yaw, eo yaw'],
      ['N5020-16', 'vai, khuỷu, cổ tay roll, cổ chân, eo roll/pitch'], ['W4010-25', 'cổ tay pitch/yaw'],
      ['F-1515-214', '6 khớp ngón Dex3-1'],
    ].map(([n, use]) => {
      const M = MOTORS[n];
      return h('tr', {}, h('td', { html: `<span class="motor-dot" style="background:${M.css}"></span>${n}` }),
        h('td', {}, M.ratio ? `${M.ratio}` : '-'),
        h('td', {}, M.peakSame ? `${M.peakSame} / ${M.peakOpp}` : '-'),
        h('td', {}, M.noLoad ? `${M.noLoad} rad/s` : '-'),
        h('td', { class: 'muted' }, use));
    }))));
  body.append(h('p', { class: 'faint' }, 'Đỉnh: mô-men khi lực và chuyển động cùng chiều / ngược chiều (Y1/Y2 trong unitree_actuators.py). '
    + 'Bản 23 DoF có 9 khớp lớn (~1.1 kg) + 14 khớp nhỏ (525 g) = 17.25 kg, ~49% khối lượng robot (teardown).'));
  // mass distribution, straight from the URDF <inertial><mass> of the loaded variant
  const groupsOf = (n) => (/hand_|thumb|index|middle|ring|little|force_sensor|base_link$|dex1|rubber_hand/.test(n) ? 'Bàn tay / tay kẹp'
    : /hip|knee|ankle/.test(n) ? 'Chân' : /shoulder|elbow|wrist/.test(n) ? 'Tay' : /torso|logo|handle/.test(n) ? 'Thân (gồm pin, board)'
      : /head|neck/.test(n) ? 'Đầu / cổ' : /waist/.test(n) ? 'Eo' : /pelvis/.test(n) ? 'Khung chậu' : 'Khác');
  const massBy = {};
  let massTotal = 0;
  for (const [n, o] of Object.entries(links)) {
    const m = o.userData?.mass;
    if (!m) continue;
    massBy[groupsOf(n)] = (massBy[groupsOf(n)] || 0) + m;
    massTotal += m;
  }
  const maxG = Math.max(...Object.values(massBy));
  body.append(h('h3', {}, `Phân bố khối lượng (URDF · ${VARIANTS[handModel].label} · ${massTotal.toFixed(1)} kg)`),
    ...Object.entries(massBy).sort((a, b) => b[1] - a[1]).map(([g, m]) => h('div', { class: 'fn-tau-row', style: 'grid-template-columns:150px 1fr 70px' },
      h('span', {}, g), h('div', { class: 'bar' }, h('i', { style: `width:${(m / maxG) * 100}%` })), h('b', {}, `${m.toFixed(2)} kg`))),
    h('p', { class: 'faint' }, 'Chân + thân chiếm phần lớn khối lượng; tay nhẹ để vung nhanh. Bật "Lớp xem → Trọng tâm" để thấy trọng tâm từng khâu.'));

  // kinematic tree: link -> joint (type) -> child link, from the GLB node tree
  const tree = [];
  const walk = (link, depth) => {
    for (const j of Object.values(joints).filter((x) => x.data.parent === link)) {
      if (/force_sensor|reference|imu_in|d435|mid360|logo/.test(j.data.child)) continue;
      const t = j.data.type === 'fixed' ? 'cố định' : j.data.type === 'prismatic' ? 'tịnh tiến' : 'quay';
      tree.push(`${'  '.repeat(depth)}└ ${j.node.name.replace('_joint', '')} (${t}) → ${j.data.child}`);
      walk(j.data.child, depth + 1);
    }
  };
  walk('pelvis', 0);
  body.append(h('h3', {}, 'Cây động học (từ URDF)'),
    h('details', {}, h('summary', { style: 'cursor:pointer' }, `pelvis → ${tree.length} khớp (bấm để mở)`),
      h('pre', { style: 'font-size:11px;line-height:1.35;white-space:pre;overflow-x:auto;background:#0d1218;padding:8px;border-radius:6px' }, ['pelvis', ...tree].join('\n'))));

  body.append(h('h3', {}, 'Mở bên trong'), h('div', {}, ...['head', 'torso', 'ports', 'hip', 'foot', 'hand', 'inspire', 'dex1', 'neck', 'depth_camera', 'lidar', 'imu', 'battery', 'compute', 'cooling', 'wiring', 'remote', 'audio'].map((id) => {
    const piece = PARTS[id].links?.[0] || PARTS[id].hotspots?.[0];
    return h('button', { class: 'chip', type: 'button', style: 'cursor:pointer', onclick: () => { select(id, piece, { focusCam: false }); openCloseup(id, piece); } }, PARTS[id].title);
  })));
  body.append(sourcesEl(['zhongyou', 'g1', 'sdk', 'rllab', 'arxivSec']));
}

// ------------------------------------------------------------------------------ close-ups
async function openCloseup(partId, piece) {
  const part = PARTS[partId];
  if (!part?.closeup) return;
  let type = part.closeup.type;
  let jointName = jointOfLink(piece);
  if (type === 'actuator' && !jointName) {
    // list click on a multi-link part: take its first left link
    jointName = jointOfLink((part.links || []).find((l) => !l.startsWith('right_')) || part.links?.[0]);
  }
  const opts = { part, partId, piece, joint: jointName, jointData: jointName ? joints[jointName]?.data : null, handModel, links, joints };
  if (jointName && joints[jointName]) {
    opts.motorName = motorOf(jointName);
    opts.motor = MOTORS[opts.motorName];
    opts.describe = describeJoint(jointName);
    opts.parallel = isParallel(jointName);
  }
  // waist roll/pitch are a two-motor linkage like the ankle - same close-up
  if (type === 'actuator' && opts.parallel) { type = 'ankle'; opts.mode = /waist/.test(jointName) ? 'waist' : 'ankle'; }
  if (type === 'actuator' && !opts.motor) return;
  if (type === 'hand') {
    if (handModel !== 'dex3') return;
    const side = piece && piece.startsWith('right') ? 'right' : 'left';
    opts.side = side;
    opts.palm = links[`${side}_hand_palm_link`];
    opts.joints = Object.fromEntries(Object.entries(joints).filter(([n]) => n.startsWith(`${side}_hand_`)).map(([n, j]) => [n, { data: j.data, restQ: j.restQ.clone(), axis: j.axis.clone() }]));
  }
  if (type === 'inspire') {
    if (handModel !== 'inspire') return;
    const side = piece && piece.startsWith('right') ? 'right' : 'left';
    opts.side = side;
    opts.palm = links[`${side}_base_link`];
    const re = new RegExp(`^${side}_(thumb|index|middle|ring|little)_[0-9]_joint$`);
    opts.joints = Object.fromEntries(Object.entries(joints).filter(([n]) => re.test(n)).map(([n, j]) => [n, { data: j.data, restQ: j.restQ.clone(), axis: j.axis.clone() }]));
  }
  if (type === 'ankle') opts.side = piece && piece.startsWith('right') ? 'right' : 'left';
  const mod = await import(`/viewers/${type}.js`);
  mod.open(opts);
}

// ------------------------------------------------------------------------------ toolbar
$('#opt-xray').addEventListener('change', (e) => setXray(e.target.checked));
$('#opt-explode').addEventListener('input', (e) => { explode = e.target.value / 100; });
$('#opt-pose').addEventListener('change', (e) => setPose(e.target.value));
$('#opt-hand').addEventListener('change', (e) => loadModel(e.target.value));
for (const cb of document.querySelectorAll('[data-layer]')) {
  cb.addEventListener('change', () => {
    overlays.set(cb.dataset.layer, cb.checked);
    const legend = $('#mat-legend');
    if (cb.dataset.layer === 'material') {
      legend.hidden = !cb.checked;
      legend.innerHTML = '<b>Vật liệu (theo teardown, gán theo khâu)</b>' + Object.values(overlays.MATERIALS)
        .map((m) => `<div><i style="background:#${m.color.toString(16).padStart(6, '0')}"></i>${m.label}</div>`).join('');
    }
  });
}
$('#opt-spin').addEventListener('change', (e) => { controls.autoRotate = e.target.checked; });
$('#opt-reset').addEventListener('click', () => {
  focus.from = controls.target.clone();
  focus.to = HOME.target.clone();
  focus.camFrom.copy(camera.position);
  focus.camTo.copy(HOME.pos);
  focus.start = performance.now() / 1000;
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.querySelector('.closeup')) select(null);
  if (e.key === 'x' && !e.target.closest('input,select')) { const c = $('#opt-xray'); c.checked = !c.checked; c.dispatchEvent(new Event('change')); }
});

// ------------------------------------------------------------------------------ loop
function resize() {
  const w = stage.clientWidth;
  const hgt = stage.clientHeight;
  renderer.setSize(w, hgt, false);
  camera.aspect = w / hgt;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (Object.keys(joints).length) {
    applyJoints(dt, t);
    if (drive && currentRoot) applyDriveBase();
    else groundRobot();
    updateRods();
  }
  if (xray) for (const s of spinners) s.rotation.y += dt * 25;
  for (const s of hotspotMeshes) {
    const u = s.parent.userData;
    u.halo.material.opacity = 0.65 + 0.35 * Math.sin(t * 3 + u.phase);
  }
  if (focus.to) {
    const k = Math.min(1, (performance.now() / 1000 - focus.start) / FOCUS_S);
    const e = k * k * (3 - 2 * k);
    controls.target.lerpVectors(focus.from, focus.to, e);
    camera.position.lerpVectors(focus.camFrom, focus.camTo, e);
    if (k >= 1) focus.to = null;
  }
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
  overlays.update(camera, renderer.domElement.getBoundingClientRect());
});

const fnUI = initFunctions({
  h, setPose: (n) => { setPose(n); $('#opt-pose').value = n; }, setDrive,
  setDriveData: (d) => { if (drive) Object.assign(drive, d); else setDrive(d); },
  setLed: (hex) => { if (ledRing) { ledRing.material.color.setHex(hex); ledRing.material.emissive.setHex(hex); } },
  setXray: (on) => { $('#opt-xray').checked = on; setXray(on); },
  sdkOrder: SDK_ORDER,
  rerender: () => { if (tab === 'functions') renderSide(); },
});

loadModel('dex3');

// for the console / debugging poses
window.g1 = { get joints() { return joints; }, get links() { return links; }, setPose, select, POSES, camera, controls, loadModel, openCloseup };

// Close-up of a Dex3-1 hand, opened from any hand link. Uses the real hand meshes (a clone of the
// palm subtree from the main model, so the joint axes/limits are the URDF's) and adds what the
// URDF does not have: the 33 tactile cells in 9 areas (Unitree layout: palm 3 x 2x2, finger pads
// 3 x 2x2, fingertips 3 x 3x1), a motor at each joint, and an exploded F-1515 joint motor.
// The grasp is closed per finger until its cells touch a 5 cm ball (the object Unitree rates the
// 500 g grasp with), then held - a picture of hybrid force/position control, not Unitree's code.
import * as THREE from 'three';
import { openCloseup, gearGeometry } from '/closeup-shell.js';

const BALL_R = 0.025;
// finger -> joints closed together, and the closed pose (left hand; right hand mirrors the sign)
const FINGERS = {
  index: { joints: { index_0: -1.5, index_1: -1.7 } },
  middle: { joints: { middle_0: -1.5, middle_1: -1.7 } },
  thumb: { joints: { thumb_0: 0.0, thumb_1: 0.9, thumb_2: 1.7 } },
};
// tactile areas: link, centre (link frame, left hand), grid [n along u, n along v], u/v axes, normal
const AREAS = [
  { name: 'Lòng bàn tay 1', link: 'palm', c: [0.066, -0.0215, 0.028], grid: [2, 2], u: 'x', v: 'z', finger: null },
  { name: 'Lòng bàn tay 2', link: 'palm', c: [0.066, -0.0215, -0.028], grid: [2, 2], u: 'x', v: 'z', finger: null },
  { name: 'Lòng bàn tay 3', link: 'palm', c: [0.034, -0.0215, 0.0], grid: [2, 2], u: 'x', v: 'z', finger: null },
  { name: 'Đốt trỏ', link: 'index_0', c: [0.03, -0.0155, 0], grid: [2, 2], u: 'x', v: 'z', finger: 'index' },
  { name: 'Đốt giữa', link: 'middle_0', c: [0.03, -0.0155, 0], grid: [2, 2], u: 'x', v: 'z', finger: 'middle' },
  { name: 'Đốt cái', link: 'thumb_1', c: [0.0155, -0.032, 0], grid: [2, 2], u: 'y', v: 'z', finger: 'thumb' },
  { name: 'Đầu trỏ', link: 'index_1', c: [0.032, -0.0098, 0], grid: [3, 1], u: 'x', v: 'z', finger: 'index' },
  { name: 'Đầu giữa', link: 'middle_1', c: [0.032, -0.0098, 0], grid: [3, 1], u: 'x', v: 'z', finger: 'middle' },
  { name: 'Đầu cái', link: 'thumb_2', c: [0.0098, -0.032, 0], grid: [3, 1], u: 'y', v: 'z', finger: 'thumb' },
];

export function open(o) {
  const sideVi = o.side === 'right' ? 'phải' : 'trái';
  openCloseup({
    title: `Bàn tay Dex3-1 ${sideVi} - cấu tạo bên trong`,
    sub: '3 ngón · 7 bậc tự do · 7 motor F-1515 · 33 cảm biến xúc giác trong 9 vùng · 710 g',
    heading: 'Bàn tay cầm một vật như thế nào',
    camera: { pos: [0.22, 0.13, 0.27], target: [0.0, 0.03, 0], min: 0.05, max: 1.2, near: 0.001 },
    steps: [
      ['Lệnh', 'mỗi 1 ms (1000 Hz) gói HandCmd gửi cho 7 motor: q, dq, τ, Kp, Kd (rt/dex3/…/cmd).'],
      ['Motor tại khớp', '6 khớp được motor F-1515 quay trực tiếp (motor + hộp số 1:108 / 1:214 nằm ngay trong đốt ngón).'],
      ['Ngón cái xoay', 'khớp xoay gốc ngón cái truyền qua bánh răng - motor duy nhất "Drive with Gears".'],
      ['Chạm', 'cảm biến áp lực ở lòng bàn tay, đốt ngón, đầu ngón báo điểm chạm (10 g – 2.5 kg mỗi điểm).'],
      ['Điều khiển lực', 'ngón đã chạm thì dừng tăng góc, giữ bằng mô-men (Kp thấp + τ) - lai lực-vị trí.'],
      ['Phản hồi', 'HandState trả về góc, tốc độ, mô-men, nhiệt độ, áp lực + nhiệt độ cảm biến, IMU (rt/dex3/…/state).'],
    ],
    extra: `
      <h5>Bản đồ xúc giác (33 điểm)</h5>
      <canvas data-k="map" width="360" height="190" style="width:100%;background:#0d1218;border:1px solid var(--line);border-radius:8px"></canvas>
      <dl class="hud" style="margin-top:8px">
        <dt>Giai đoạn</dt><dd data-k="phase">-</dd>
        <dt>Ngón trỏ</dt><dd data-k="index">-</dd>
        <dt>Ngón giữa</dt><dd data-k="middle">-</dd>
        <dt>Ngón cái</dt><dd data-k="thumb">-</dd>
        <dt>Tổng lực ước tính</dt><dd data-k="force">-</dd>
      </dl>
      <label class="row">Lực nắm <input type="range" data-k="grip" min="0.1" max="1" step="0.05" value="0.6"><output data-k="gripOut"></output></label>
      <div class="closeup-buttons"><button type="button" class="btn small" data-k="motorBtn">Ẩn/hiện motor F-1515 tháo rời</button></div>
      <h5>Motor ngón F-1515 (Unitree công bố)</h5>
      <dl class="kv">
        <dt>Khối lượng / cỡ</dt><dd>45 g · 34.8 × 23.1 × 23.3 mm</dd>
        <dt>Tỉ số</dt><dd>1:108 (F-1515-108) · 1:214 (F-1515-214)</dd>
        <dt>Mô-men lý tưởng</dt><dd>0.76 / 1.498 N·m</dd>
        <dt>Mô-men thực tế</dt><dd>0.49 / 0.86 N·m cùng chiều · 1.37 / 3.1 N·m ngược chiều</dd>
        <dt>Tốc độ tối đa</dt><dd>23 / 11 rad/s</dd>
        <dt>Encoder</dt><dd>encoder tuyệt đối trên rotor</dd>
        <dt>Bus</dt><dd>High Speed Unibus, 1000 Hz, 12 – 24 V</dd>
      </dl>`,
    note: `Số liệu: unitree.com/Dex3-1. Mesh tay và trục khớp: URDF chính thức. Vị trí ô xúc giác vẽ theo bố cục Unitree công bố
      (lòng bàn tay 3 vùng 2×2, đốt ngón 3 vùng 2×2, đầu ngón 3 vùng 3×1) nhưng toạ độ là minh hoạ. Quá trình nắm là minh hoạ
      cách điều khiển lai lực-vị trí, không phải firmware của Unitree.`,
  }, (ctx) => build(ctx, o));
}

function build(ctx, o) {
  const { scene, add, mat, basic, label } = ctx;
  const qs = ctx.q;
  const sg = o.side === 'right' ? -1 : 1;
  const root = new THREE.Group();
  scene.add(root);

  // clone the real hand, fresh materials, reset joints to rest
  const hand = o.palm.clone(true);
  hand.position.set(0, 0, 0);
  hand.quaternion.identity();
  const holder = new THREE.Group();
  holder.add(hand);
  holder.rotation.x = -Math.PI / 2;            // ROS z-up -> three y-up, as on the main page
  holder.position.set(-0.05, 0, 0);
  root.add(holder);
  // drop what the main page added under these links (X-ray actuators, cables): unnamed objects
  const extras = [];
  hand.traverse((n) => { if (n !== hand && !n.name) extras.push(n); });
  for (const n of extras) n.parent?.remove(n);
  const shell = mat(0xc4cad3, { metalness: 0.25, roughness: 0.42, transparent: true, opacity: 1 });
  const dark = mat(0x2b3038, { metalness: 0.45, roughness: 0.45, transparent: true, opacity: 1 });
  const links = {};
  const jnodes = {};
  hand.traverse((n) => {
    if (n.isMesh) {
      n.material = /thumb_0|palm/.test(n.name) ? dark : shell;
      n.material.side = THREE.FrontSide;
    }
    if (n.userData?.joint) jnodes[n.name] = n;
    else if (!n.isMesh && n.name) links[n.name.replace(`${o.side}_hand_`, '').replace('_link', '')] = n;
  });
  const J = {};
  for (const [name, j] of Object.entries(o.joints)) {
    const n = jnodes[name];
    if (!n) continue;
    J[name.replace(`${o.side}_hand_`, '').replace('_joint', '')] = { node: n, restQ: j.restQ, axis: j.axis, data: j.data, q: 0 };
  }
  const tq = new THREE.Quaternion();
  const setJ = (k, q) => {
    const j = J[k];
    if (!j) return;
    j.q = Math.max(j.data.lower, Math.min(j.data.upper, q));
    j.node.quaternion.copy(j.restQ).multiply(tq.setFromAxisAngle(j.axis, j.q));
  };

  // motors at the joints (in the parent link, axis = joint axis)
  const motorMat = mat(0x3fb950, { metalness: 0.5, emissive: 0x3fb950, emissiveIntensity: 0.35 });
  const gearMotorMat = mat(0x7ee787, { metalness: 0.5, emissive: 0x7ee787, emissiveIntensity: 0.35 });
  const motorMeshes = [];
  for (const [k, j] of Object.entries(J)) {
    const parent = j.node.parent;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.02, 20), k === 'thumb_0' ? gearMotorMat : motorMat);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), j.axis.clone().applyQuaternion(j.restQ));
    m.position.copy(j.node.position);
    parent.add(m);
    motorMeshes.push(m);
    if (k === 'thumb_0') {
      label(m, 'Motor + bánh răng (xoay ngón cái)', [0, 0, 0]);
      const g = new THREE.Mesh(gearGeometry(0.008, 16, 0.003), mat(0xe3b341, { metalness: 0.8 }));
      g.position.copy(j.node.position).add(new THREE.Vector3(0.0, 0.0, 0.012));
      parent.add(g);
      motorMeshes.push(g);
    }
  }
  label(motorMeshes.find((m, i) => Object.keys(J)[i] === 'index_0') || motorMeshes[0], 'Motor F-1515 tại khớp', [0, 0, 0]);

  // tactile cells
  const cells = [];
  const cellGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const a of AREAS) {
    const link = links[a.link];
    if (!link) continue;
    const [nu, nv] = a.grid;
    const pitch = 0.0075;
    for (let i = 0; i < nu; i += 1) {
      for (let k = 0; k < nv; k += 1) {
        const pos = new THREE.Vector3(...a.c);
        pos.y *= sg;
        const du = (i - (nu - 1) / 2) * pitch;
        const dv = (k - (nv - 1) / 2) * pitch;
        pos[a.u] += a.u === 'y' ? du * sg : du;
        pos[a.v] += dv;
        const m = new THREE.Mesh(cellGeo, new THREE.MeshStandardMaterial({ color: 0x1f6feb, emissive: 0x1f6feb, emissiveIntensity: 0.4, roughness: 0.6 }));
        const size = { x: 0.0065, y: 0.0065, z: 0.0065 };
        size[a.u] = 0.0065;
        size[a.v] = 0.0065;
        const normalAxis = ['x', 'y', 'z'].find((ax) => ax !== a.u && ax !== a.v);
        size[normalAxis] = 0.0012;
        m.scale.set(size.x, size.y, size.z);
        m.position.copy(pos);
        link.add(m);
        cells.push({ mesh: m, area: a, p: 0 });
      }
    }
  }
  label(cells[0].mesh, 'Xúc giác lòng bàn tay (3 × 2×2)', [0, 0, 0]);
  label(cells.find((c) => c.area.name === 'Đầu trỏ').mesh, 'Xúc giác đầu ngón (3×1)', [0, 0, 0]);
  label(cells.find((c) => c.area.name === 'Đốt giữa').mesh, 'Xúc giác đốt ngón (2×2)', [0, 0, 0]);

  // the ball, in palm frame (in front of the palm face)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), mat(0xf0883e, { roughness: 0.5, transparent: true, opacity: 0.85 }));
  ball.position.set(0.108, -0.04 * sg, 0);
  hand.add(ball);
  label(ball, 'Vật tròn ø5 cm', [0, -0.02 * sg, 0], true);

  // exploded F-1515 next to the hand
  const fm = new THREE.Group();
  fm.position.set(-0.01, 0.085, -0.03);
  fm.scale.setScalar(2);
  root.add(fm);
  const can = add(fm, new THREE.BoxGeometry(0.0348, 0.0231, 0.0233), mat(0x30363d, { metalness: 0.6, transparent: true, opacity: 0.35 }));
  const statorM = add(fm, new THREE.CylinderGeometry(0.008, 0.008, 0.012, 20), mat(0xc87533, { metalness: 0.8 }), -0.008, 0, 0);
  statorM.rotation.z = Math.PI / 2;
  const rotorM = add(fm, new THREE.CylinderGeometry(0.0045, 0.0045, 0.013, 16), mat(0x0969da), -0.008, 0, 0);
  rotorM.rotation.z = Math.PI / 2;
  const stages = [];
  for (let i = 0; i < 3; i += 1) {
    const g = add(fm, gearGeometry(0.008, 18, 0.0025), mat(i === 2 ? 0xe3b341 : 0xd0d7de, { metalness: 0.8 }), 0.004 + i * 0.0045, 0, 0);
    g.rotation.z = Math.PI / 2;
    stages.push(g);
  }
  const outShaft = add(fm, new THREE.CylinderGeometry(0.0025, 0.0025, 0.012, 12), mat(0xe3b341, { metalness: 0.9 }), 0.022, 0, 0);
  outShaft.rotation.z = Math.PI / 2;
  const encM = add(fm, new THREE.BoxGeometry(0.001, 0.008, 0.008), mat(0x6e40c9, { emissive: 0x6e40c9, emissiveIntensity: 0.5 }), -0.0165, 0, 0);
  label(can, 'F-1515 (tháo rời, phóng to 2×)', [0, 0.016, 0], true);
  label(statorM, 'Motor', [0, 0.01, 0]);
  label(stages[1], 'Hộp số 1:108 / 1:214', [0, 0.01, 0]);
  label(encM, 'Encoder tuyệt đối rotor', [0, -0.008, 0]);
  label(outShaft, 'Trục ra → đốt ngón', [0.006, 0, 0]);

  // panel
  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['map', 'phase', 'index', 'middle', 'thumb', 'force', 'grip', 'gripOut', 'motorBtn'].map((k) => [k, el(k)]));
  ui.motorBtn.addEventListener('click', () => { fm.visible = !fm.visible; }, { signal: ctx.signal });
  const g2 = ui.map.getContext('2d');

  const k = { index: 0, middle: 0, thumb: 0 };
  const contactAt = { index: null, middle: null, thumb: null };
  const ballW = new THREE.Vector3();
  const cellW = new THREE.Vector3();
  let cycleStart = performance.now() / 1000 + 1.0;
  let phase = 'mở tay';

  function drawMap() {
    const w = ui.map.width;
    g2.clearRect(0, 0, w, ui.map.height);
    g2.font = '10px Segoe UI';
    const layout = { 'Lòng bàn tay 1': [10, 120], 'Lòng bàn tay 2': [80, 120], 'Lòng bàn tay 3': [150, 120],
      'Đốt trỏ': [10, 62], 'Đốt giữa': [80, 62], 'Đốt cái': [150, 62], 'Đầu trỏ': [10, 14], 'Đầu giữa': [80, 14], 'Đầu cái': [150, 14] };
    for (const a of AREAS) {
      const [x0, y0] = layout[a.name];
      const mine = cells.filter((c) => c.area === a);
      const [nu, nv] = a.grid;
      mine.forEach((c, idx) => {
        const i = Math.floor(idx / nv);
        const j = idx % nv;
        const v = c.p;
        g2.fillStyle = heat(v);
        g2.fillRect(x0 + i * 19, y0 + j * 19, 17, 17);
      });
      g2.fillStyle = '#8b949e';
      g2.fillText(a.name, x0, y0 + nv * 19 + 10);
    }
    g2.fillStyle = '#8b949e';
    g2.fillText('0 g', 240, 30);
    for (let i = 0; i < 60; i += 1) { g2.fillStyle = heat(i / 59); g2.fillRect(240 + i * 1.8, 36, 2, 10); }
    g2.fillText('2.5 kg', 330, 30);
  }

  return {
    update(now, dt, e) {
      const grip = Number(ui.grip.value);
      ui.gripOut.textContent = `${Math.round(grip * 100)}%`;
      shell.opacity = 1 - 0.55 * e;
      dark.opacity = 1 - 0.55 * e;
      for (const m of motorMeshes) m.visible = e > 0.2;
      // grasp cycle: 0-1.5 open, 1.5-5 close until contact, 5-8 hold, 8-9.5 release
      const t = (now - cycleStart) % 9.5;
      hand.updateMatrixWorld(true);
      ball.getWorldPosition(ballW);
      for (const f of Object.keys(FINGERS)) {
        let touching = false;
        for (const c of cells) {
          if (c.area.finger !== f) continue;
          c.mesh.getWorldPosition(cellW);
          if (cellW.distanceTo(ballW) < BALL_R + 0.005) { touching = true; break; }
        }
        if (t < 1.5) { k[f] = Math.max(0, k[f] - dt * 1.2); contactAt[f] = null; phase = 'mở tay'; }
        else if (t < 8) {
          if (touching && contactAt[f] === null) contactAt[f] = now;
          if (contactAt[f] === null) k[f] = Math.min(1, k[f] + dt * 0.45);
          phase = t < 5 ? 'khép ngón tới khi chạm' : 'giữ bằng mô-men';
        } else { k[f] = Math.max(0, k[f] - dt * 0.9); contactAt[f] = null; phase = 'thả'; }
        for (const [jn, qClosed] of Object.entries(FINGERS[f].joints)) setJ(jn, qClosed * k[f] * sg);
      }
      // pressure: cells near the ball surface, ramping after contact, scaled by grip
      hand.updateMatrixWorld(true);
      let total = 0;
      for (const c of cells) {
        c.mesh.getWorldPosition(cellW);
        const d = cellW.distanceTo(ballW) - BALL_R;
        const fingerHold = c.area.finger ? (contactAt[c.area.finger] !== null ? Math.min(1, (now - contactAt[c.area.finger]) * 0.8) : 0) : (t > 2 && t < 8 ? 1 : 0);
        const target = d < 0.006 ? Math.max(0, 1 - d / 0.006) * fingerHold * grip : 0;
        c.p += (target - c.p) * Math.min(1, dt * 6);
        total += c.p;
        const col = new THREE.Color(heat(c.p));
        c.mesh.material.color.copy(col);
        c.mesh.material.emissive.copy(col);
        c.mesh.material.emissiveIntensity = 0.3 + c.p * 1.5;
      }
      const deg = (r) => `${Math.round(r * 57.3)}°`;
      ui.phase.textContent = phase;
      ui.index.textContent = `${deg(J.index_0?.q || 0)} / ${deg(J.index_1?.q || 0)}${contactAt.index ? ' · chạm' : ''}`;
      ui.middle.textContent = `${deg(J.middle_0?.q || 0)} / ${deg(J.middle_1?.q || 0)}${contactAt.middle ? ' · chạm' : ''}`;
      ui.thumb.textContent = `${deg(J.thumb_0?.q || 0)} / ${deg(J.thumb_1?.q || 0)} / ${deg(J.thumb_2?.q || 0)}${contactAt.thumb ? ' · chạm' : ''}`;
      ui.force.textContent = `${Math.round(total * 2500 / 6)} g (minh hoạ)`;
      const step = phase === 'mở tay' ? 0 : phase === 'khép ngón tới khi chạm' ? (Math.floor(now) % 2 ? 1 : 2) : phase === 'giữ bằng mô-men' ? (Math.floor(now / 1.5) % 2 ? 3 : 4) : 5;
      ctx.setActiveStep(e > 0.3 ? step : -1);
      rotorM.rotation.x += dt * (contactAt.index ? 0 : 20);
      for (const [i, g] of stages.entries()) g.rotation.x += dt * (contactAt.index ? 0 : 20 / (i + 2) ** 2);
      drawMap();
    },
  };
}

function heat(v) {
  const c = new THREE.Color();
  if (v < 0.02) return '#1f3b66';
  c.setHSL(0.62 - 0.62 * Math.min(1, v), 0.9, 0.35 + 0.25 * v);
  return `#${c.getHexString()}`;
}

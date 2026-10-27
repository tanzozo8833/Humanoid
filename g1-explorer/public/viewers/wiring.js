// Close-up of the G1's power and data wiring, laid out on the REAL joint positions of the robot on the
// main page (joint origins taken from the loaded URDF model, in the torso frame). What is drawn is the
// teardown's description (中邮证券 p.35-38, JONVER, Munro): the battery feeds the mainboard; from the
// board one branch per limb leaves as an XT30 power pair + a CAN H/L pair; each branch runs THROUGH the
// hollow centre of every joint module in turn (daisy chain: "entry" and "exit" at each module); a
// capacitor board sits at the far end of the leg and arm chains; the head gets its own branch (power,
// LiDAR, camera, LED, mic). Total harness < 10 m.
// The voltage-sag demo (capacitor on/off) is an RC illustration - no values are published.
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const CHAINS = [
  { name: 'Chân trái', color: 0xffa657, joints: ['left_hip_pitch', 'left_hip_roll', 'left_hip_yaw', 'left_knee'], extra: 'left_ankle', cap: 'left_knee_link' },
  { name: 'Chân phải', color: 0xffa657, joints: ['right_hip_pitch', 'right_hip_roll', 'right_hip_yaw', 'right_knee'], extra: 'right_ankle', cap: 'right_knee_link' },
  { name: 'Tay trái', color: 0xe3b341, joints: ['left_shoulder_pitch', 'left_shoulder_roll', 'left_shoulder_yaw', 'left_elbow', 'left_wrist_roll', 'left_wrist_pitch', 'left_wrist_yaw'], cap: 'left_elbow_link' },
  { name: 'Tay phải', color: 0xe3b341, joints: ['right_shoulder_pitch', 'right_shoulder_roll', 'right_shoulder_yaw', 'right_elbow', 'right_wrist_roll', 'right_wrist_pitch', 'right_wrist_yaw'], cap: 'right_elbow_link' },
  { name: 'Eo', color: 0xf0883e, joints: ['waist_yaw', 'waist_roll', 'waist_pitch'] },
];

export function open(o) {
  openCloseup({
    title: 'Dây, nguồn & bus CAN của G1',
    sub: 'Đặt trên vị trí khớp thật của mô hình đang xem · nguồn XT30 + CAN H/L nối chuỗi qua tâm rỗng từng khớp · < 10 m dây',
    heading: 'Điện và lệnh đi đến từng khớp thế nào',
    camera: { pos: [0.9, 0.25, 1.15], target: [0, -0.15, 0], min: 0.2, max: 4 },
    steps: [
      ['Pin → mainboard', 'pin 13S (~47 V) cắm vào mainboard: dây nguồn + dây phản hồi BMS.'],
      ['Chia nhánh', 'mainboard có đầu cắm riêng cho: chân (nguồn + CAN), tay trái, tay phải (nguồn + CAN), đầu, LiDAR, camera, micro, LED, quạt.'],
      ['Một cặp dây cho cả chuỗi', 'mỗi chi chỉ 1 cặp XT30 (nguồn) + 1 cặp CAN H/L; mọi khớp trên chi đó "treo" song song trên cùng bus.'],
      ['Xuyên tâm khớp', 'cáp chui vào tâm rỗng của khớp, ra phía bên kia rồi sang khớp kế tiếp - quay khớp không kéo dây, không dây chạy ngoài.'],
      ['Tụ đệm cuối chuỗi', 'ở cuối chân và tay có board tụ: khi motor đột ngột kéo dòng lớn, tụ bù cho sụt áp trên dây dài.'],
      ['Đầu', 'nhánh riêng: nguồn + cáp vi sai tốc độ cao cho LiDAR / camera, dây LED và micro.'],
    ],
    extra: `
      <h5>Thử: robot giật mạnh (minh hoạ)</h5>
      <div class="closeup-buttons">
        <button type="button" class="btn small" data-k="kick">⚡ Tải đột ngột ở cổ chân</button>
        <button type="button" class="btn small" data-k="cap">Tụ đệm: bật</button>
      </div>
      <canvas data-k="scope" width="360" height="120" style="width:100%;background:#0d1218;border:1px solid var(--line);border-radius:8px"></canvas>
      <p class="faint" style="margin:4px 0">Điện áp ở khớp cuối chuỗi khi motor kéo dòng lớn: không có tụ thì sụt sâu hơn. Số liệu minh hoạ, Unitree không công bố.</p>
      <h5>Các nhánh trên mainboard (nhãn trong ảnh tháo rời)</h5>
      <ul class="inside">
        <li><b>Pin</b> <span class="muted">- nguồn + phản hồi BMS</span></li>
        <li><b>Chi dưới</b> <span class="muted">- nguồn + CAN</span></li>
        <li><b>Tay trái / tay phải</b> <span class="muted">- nguồn + CAN mỗi bên</span></li>
        <li><b>Đầu</b> <span class="muted">- nguồn, LiDAR, camera, LED, micro</span></li>
        <li><b>Quạt</b></li>
      </ul>`,
    note: 'Nguồn: báo cáo tháo rời 中邮证券 (tr.35–38: XT30 + CAN H/L, đi qua tâm khớp "lối vào / lối ra", tụ đệm cuối chi, nhánh trên mainboard), JONVER, Munro (tụ phân tán trên DC bus). Vị trí khớp lấy từ URDF của phiên bản đang xem; đường dây trong thân là sơ đồ. Bus khớp: teardown ghi CAN; một bài CSDN đoán RS-485 - chưa thống nhất.',
  }, (ctx) => build(ctx, o));
}

function build(ctx, o) {
  const { scene, add, mat, basic, label } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;                      // ROS z-up -> y-up
  scene.add(root);
  const torso = o.links?.torso_link;
  const pelvis = o.links?.pelvis;
  if (!torso) return { update() {} };
  torso.updateWorldMatrix(true, true);
  const inv = torso.matrixWorld.clone().invert();
  const P = (name) => {
    const j = o.joints?.[`${name}_joint`];
    if (!j) return null;
    return j.node.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
  };
  const L = (name) => (o.links?.[name] ? o.links[name].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv) : null);
  const off = new THREE.Vector3(0, 0, -0.15);
  const V = (v) => v.clone().add(off);

  // faint silhouette: torso + pelvis outline boxes
  add(root, new THREE.BoxGeometry(0.15, 0.22, 0.32), mat(0x30363d, { transparent: true, opacity: 0.15 }), 0, 0, 0.0);
  const board = add(root, new THREE.BoxGeometry(0.006, 0.15, 0.11), mat(0x16352a), -0.056, 0, -0.01);
  label(board, 'Mainboard (trung tâm dây)', [0, 0, 0.07], true);
  const battery = add(root, new THREE.BoxGeometry(0.065, 0.15, 0.09), mat(0x8b949e, { emissive: 0xf85149, emissiveIntensity: 0.15 }), 0.012, 0.03, -0.05);
  label(battery, 'Pin 13S ~47 V', [0, 0.09, 0], true);
  const boardPt = new THREE.Vector3(-0.056, 0, -0.01);

  const pulses = [];
  const ringGeo = new THREE.TorusGeometry(0.022, 0.006, 8, 24);
  function cableAlong(points, color, name) {
    const curve = new THREE.CatmullRomCurve3(points);
    add(root, new THREE.TubeGeometry(curve, points.length * 16, 0.0028, 6), mat(color, { emissive: color, emissiveIntensity: 0.3 }));
    const can = new THREE.CatmullRomCurve3(points.map((p) => p.clone().add(new THREE.Vector3(0.006, 0.006, 0))));
    add(root, new THREE.TubeGeometry(can, points.length * 16, 0.0016, 6), mat(0x79c0ff, { emissive: 0x79c0ff, emissiveIntensity: 0.3 }));
    for (let i = 0; i < 3; i += 1) pulses.push({ curve, mesh: add(root, new THREE.SphereGeometry(0.006, 8, 8), basic(0xffd33d)), u: i / 3, speed: 0.25 });
    pulses.push({ curve: can, mesh: add(root, new THREE.SphereGeometry(0.005, 8, 8), basic(0x79c0ff)), u: 0, speed: 0.5 });
    pulses.push({ curve: can, mesh: add(root, new THREE.SphereGeometry(0.005, 8, 8), basic(0x3fb950)), u: 0.5, speed: -0.5 });
    const end = points.at(-1);
    const tag = new THREE.Object3D();
    tag.position.copy(end);
    root.add(tag);
    label(tag, name, [0, 0, -0.04], true);
  }

  // battery -> board
  cableAlong([new THREE.Vector3(0.012, 0.03, -0.01), new THREE.Vector3(-0.03, 0.03, -0.01), boardPt.clone()], 0xf85149, 'Pin → mainboard');

  let lastLegEnd = null;
  for (const ch of CHAINS) {
    const pts = ch.joints.map(P).filter(Boolean);
    if (!pts.length) continue;
    if (ch.extra) {
      // ankle motors B (upper) and A (lower) sit on the calf: approximate along the shin
      const knee = P(`${ch.extra.split('_')[0]}_knee`);
      const ankle = P(`${ch.extra}_pitch`);
      if (knee && ankle) pts.push(knee.clone().lerp(ankle, 0.22), knee.clone().lerp(ankle, 0.43));
    }
    for (const p of pts) {
      const r = add(root, ringGeo, mat(0x1f2328, { metalness: 0.6, emissive: ch.color, emissiveIntensity: 0.12 }), ...V(p).toArray());
      r.lookAt(V(p).add(new THREE.Vector3(1, 0, 0)));
    }
    const route = [boardPt.clone(), ...pts.map(V)];
    cableAlong(route, ch.color, ch.name);
    if (ch.cap && o.links?.[ch.cap]) {
      const cp = pts.at(-1);
      const cap = new THREE.Group();
      cap.position.copy(V(cp)).add(new THREE.Vector3(-0.03, 0, -0.02));
      root.add(cap);
      add(cap, new THREE.BoxGeometry(0.004, 0.03, 0.03), mat(0x1a7f37));
      for (const [y, z] of [[-0.008, -0.008], [0.008, -0.008], [-0.008, 0.008], [0.008, 0.008]]) {
        const c = add(cap, new THREE.CylinderGeometry(0.006, 0.006, 0.012, 12), mat(0xd0d7de, { metalness: 0.7 }), 0.008, y, z);
        c.rotation.z = Math.PI / 2;
      }
      if (ch.extra) { label(cap, 'Board tụ đệm', [0, 0, -0.02]); lastLegEnd = cap; }
    }
  }
  // head branch
  const head = L('head_link') || new THREE.Vector3(0, 0, 0.4);
  cableAlong([boardPt.clone(), new THREE.Vector3(-0.05, 0, 0.12).add(off), V(head).add(new THREE.Vector3(0, 0, 0.04))], 0xd29922, 'Đầu: nguồn + LiDAR + camera + LED + mic');
  if (pelvis) add(root, new THREE.BoxGeometry(0.1, 0.13, 0.14), mat(0x30363d, { transparent: true, opacity: 0.12 }), ...V(L('pelvis')).add(new THREE.Vector3(0, 0, -0.07)).toArray());
  const ringLabel = root.children.find((c) => c.geometry === ringGeo);
  if (ringLabel) label(ringLabel, 'Khớp (cáp xuyên qua tâm rỗng)', [0, 0.03, 0]);

  // voltage scope
  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = { kick: el('kick'), cap: el('cap'), scope: el('scope') };
  const g = ui.scope.getContext('2d');
  let capOn = true;
  let kickAt = -10;
  const trace = [];
  ui.cap.addEventListener('click', () => { capOn = !capOn; ui.cap.textContent = `Tụ đệm: ${capOn ? 'bật' : 'tắt'}`; }, { signal: ctx.signal });
  ui.kick.addEventListener('click', () => { kickAt = performance.now() / 1000; }, { signal: ctx.signal });
  let v = 47;
  return {
    update(now, dt, e) {
      for (const p of pulses) {
        p.u = (p.u + dt * p.speed + 1) % 1;
        p.curve.getPointAt(p.u, p.mesh.position);
        p.mesh.visible = e > 0.2;
      }
      const t = now - kickAt;
      const load = t >= 0 && t < 0.35 ? 1 : 0;                 // a 0.35 s current spike
      const target = 47 - load * (capOn ? 3 : 9);               // illustrative droop at the chain end
      v += (target - v) * Math.min(1, dt * (capOn ? 6 : 25));
      trace.push(v);
      if (trace.length > 180) trace.shift();
      if (lastLegEnd) lastLegEnd.children[0].material.emissive?.setHex(load ? 0xffd33d : 0x000000);
      g.clearRect(0, 0, 360, 120);
      g.strokeStyle = '#30363d';
      g.beginPath(); g.moveTo(0, 30); g.lineTo(360, 30); g.stroke();
      g.fillStyle = '#6b7683';
      g.font = '10px Segoe UI';
      g.fillText('47 V', 2, 26);
      g.fillText('áp ở khớp cuối chuỗi', 250, 112);
      g.strokeStyle = capOn ? '#3fb950' : '#f85149';
      g.lineWidth = 2;
      g.beginPath();
      trace.forEach((x, i) => { const y = 30 + (47 - x) * 8; if (i) g.lineTo(i * 2, y); else g.moveTo(0, y); });
      g.stroke();
      const step = load ? 4 : Math.floor((now % 10) / 2);
      ctx.setActiveStep(e < 0.3 ? -1 : Math.min(5, step));
    },
  };
}

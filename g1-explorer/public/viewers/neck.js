// Close-up of the G1+ (2026-09) neck. Real geometry: a clone of the head_base_link subtree of the
// loaded g1_pl.urdf model (head base, neck pitch link, head, camera / lidar reference frames).
// Real joint data: neck_pitch_joint (y axis, -0.436..+0.628 rad, 41 N·m -> 5019-16) and
// neck_yaw_joint (z axis, +-2.007 rad, 13.4 N·m -> 5010-16), motor families from motor_info.md.
// The torque comparison table is read from the two official URDFs (g1_29dof_with_hand_rev_1_0 vs
// g1_pl). Head sensors / audio of the G1+ are from press coverage (no full official sheet yet).
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const COMPARE = [   // [joint, G1 rev1.0 URDF effort, G1+ URDF effort]
  ['Hông pitch', 88, 121], ['Hông roll', 139, 121], ['Hông yaw', 88, 77], ['Gối', 139, 121], ['Cổ chân (×2 motor)', 35, 61.5],
  ['Eo yaw', 88, 77], ['Eo roll / pitch', 35, 90], ['Vai pitch', 25, 60], ['Vai roll / yaw', 25, 41], ['Khuỷu', 25, 41],
  ['Cổ tay roll', 25, 41], ['Cổ tay pitch / yaw', 5, 13.4], ['Cổ pitch', null, 41], ['Cổ yaw', null, 13.4],
];

export function open(o) {
  const rows = COMPARE.map(([n, a, b]) => `<tr><td>${n}</td><td>${a ?? '-'}</td><td><b>${b}</b></td><td class="${a && b > a ? '' : 'faint'}">${a ? `${b > a ? '+' : ''}${Math.round(((b - a) / a) * 100)}%` : 'mới'}</td></tr>`).join('');
  openCloseup({
    title: 'Cổ G1+ - đầu quay được',
    sub: 'URDF g1_pl.urdf (2026-09-23) · cổ pitch −25°…+36° (5019-16, 41 N·m) · yaw ±115° (5010-16, 13.4 N·m)',
    heading: 'Vì sao thêm cổ và nó hoạt động thế nào',
    camera: { pos: [0.42, 0.18, 0.42], target: [0, 0.05, 0], min: 0.1, max: 2 },
    steps: [
      ['Vấn đề của G1 cũ', 'đầu bắt cứng vào thân: muốn nhìn sang bên phải xoay eo hoặc cả người.'],
      ['Khớp cổ pitch', 'motor 5019-16 (41 N·m) ở gốc cổ: gật xuống −25°, ngửa lên +36°.'],
      ['Khớp cổ yaw', 'motor 5010-16 (13.4 N·m) phía trên: quay đầu ±115° - nhẹ hơn vì chỉ phải quay đầu, không phải nâng.'],
      ['Cảm biến đi theo đầu', 'khung camera trái và LiDAR tham chiếu gắn trên head_link → quay đầu là đổi hướng nhìn.'],
      ['Đầu mới', 'camera đôi + camera góc rộng ở ngực, cảm biến chạm trên đầu, 6 micro, 2 loa 10 W (báo chí).'],
      ['Toàn thân mạnh hơn', 'G1+ dùng họ motor mới (5019 / 6010 / 7519): vai, eo, cổ chân tăng mô-men nhiều (bảng bên).'],
    ],
    extra: `
      <label class="row">Cổ pitch <input type="range" data-k="pitch" min="-0.436" max="0.628" step="0.01" value="0"><output data-k="po"></output></label>
      <label class="row">Cổ yaw <input type="range" data-k="yaw" min="-2.007" max="2.007" step="0.01" value="0"><output data-k="yo"></output></label>
      <div class="closeup-buttons"><button type="button" class="btn small" data-k="demo">Demo tự động: bật</button></div>
      <h5>Mô-men đỉnh trong URDF (N·m): G1 rev 1.0 → G1+</h5>
      <table class="joints"><thead><tr><th>Khớp</th><th>G1</th><th>G1+</th><th>Đổi</th></tr></thead><tbody>${rows}</tbody></table>
      <h5>G1+ (báo chí, 2026-09)</h5>
      <dl class="kv">
        <dt>Cao / nặng</dt><dd>1.34 m · ~35 kg · bản thường 25 DoF, EDU tới 45</dd>
        <dt>Cảm biến</dt><dd>camera đôi + góc rộng ở ngực · chạm trên đầu · 6 micro · 2 loa 10 W</dd>
        <dt>Khác</dt><dd>tay cầm sau lưng · nguồn ngoài · tay ~3 kg · giảm nhiệt 72% (vai/eo) ở cùng mô-men</dd>
      </dl>`,
    note: 'Hình học, trục, giới hạn, mô-men: URDF Unitree g1_pl.urdf và g1_29dof_with_hand_rev_1_0.urdf (cùng repo unitree_ros). Họ motor: motor_info.md. Thông số cảm biến / âm thanh G1+: báo chí (humanoidsdaily, TechNode), chưa có bảng chính thức.',
  }, (ctx) => build(ctx, o));
}

function build(ctx, o) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const holder = new THREE.Group();
  holder.rotation.x = -Math.PI / 2;
  scene.add(holder);
  const src = o.links?.head_base_link;
  if (!src) {
    label(holder, 'Mở phiên bản "G1+ (2026) có cổ" để xem cổ', [0, 0, 0], true);
    return { update() {} };
  }
  const head = src.clone(true);
  head.position.set(0, 0, -0.06);
  head.quaternion.identity();
  holder.add(head);
  const extras = [];
  head.traverse((n) => { if (n !== head && !n.name) extras.push(n); });
  for (const n of extras) n.parent?.remove(n);
  const shell = fade(mat(0x9aa4ae, { roughness: 0.45, metalness: 0.2 }), 0.3);
  head.traverse((n) => { if (n.isMesh) n.material = shell; });
  const J = {};
  for (const name of ['neck_pitch_joint', 'neck_yaw_joint']) {
    const node = head.getObjectByName(name);
    const j = o.joints?.[name];
    if (node && j) J[name] = { node, restQ: j.restQ.clone(), axis: j.axis.clone(), lo: j.data.lower, hi: j.data.upper };
  }
  // motors at the two neck joints, axis = joint axis (in the parent frame)
  const Y = new THREE.Vector3(0, 1, 0);
  for (const [name, motor, color, txt] of [['neck_pitch_joint', '5019-16', 0x58a6ff, 'Cổ pitch · 5019-16 · 41 N·m'], ['neck_yaw_joint', '5010-16', 0xd2a8ff, 'Cổ yaw · 5010-16 · 13.4 N·m']]) {
    const j = J[name];
    if (!j) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(motor === '5019-16' ? 0.034 : 0.026, motor === '5019-16' ? 0.034 : 0.026, 0.035, 28),
      mat(color, { metalness: 0.5, emissive: color, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }));
    m.quaternion.setFromUnitVectors(Y, j.axis.clone().applyQuaternion(j.restQ));
    m.position.copy(j.node.position);
    j.node.parent.add(m);
    label(m, txt, [0, 0, 0]);
  }
  // camera FOV following the head
  const camRef = head.getObjectByName('camera_left_reference_link');
  if (camRef) {
    const L = 0.35;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(0.75) * L, L, 4, 1, true),
      basic(0x58a6ff, { transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    cone.rotation.z = Math.PI / 2;
    cone.position.x = L / 2;
    camRef.add(cone);
    const dot = add(camRef, new THREE.SphereGeometry(0.007, 12, 12), basic(0x58a6ff));
    label(dot, 'Camera (khung camera_left_reference)', [0, 0, 0]);
  }
  const lidRef = head.getObjectByName('lidar_reference_link');
  if (lidRef) label(add(lidRef, new THREE.SphereGeometry(0.007, 12, 12), basic(0x3fb950)), 'LiDAR (khung tham chiếu trên đầu)', [0, 0, 0]);
  const touch = head.getObjectByName('head_link');
  if (touch) {
    const pad = add(touch, new THREE.SphereGeometry(0.035, 20, 10, 0, Math.PI * 2, 0, 0.6), basic(0xffa657, { transparent: true, opacity: 0.35 }), 0, 0, 0.1);
    pad.rotation.x = Math.PI / 2;
    label(pad, 'Vùng cảm biến chạm (vị trí ước lượng)', [0, 0, 0.03]);
  }

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['pitch', 'po', 'yaw', 'yo', 'demo'].map((k) => [k, el(k)]));
  let demo = true;
  ui.demo.addEventListener('click', () => { demo = !demo; ui.demo.textContent = `Demo tự động: ${demo ? 'bật' : 'tắt'}`; }, { signal: ctx.signal });
  for (const k of ['pitch', 'yaw']) ui[k].addEventListener('input', () => { demo = false; ui.demo.textContent = 'Demo tự động: tắt'; }, { signal: ctx.signal });
  const tq = new THREE.Quaternion();
  return {
    update(now, dt, e) {
      if (demo) {
        ui.yaw.value = 1.6 * Math.sin(now * 0.5);
        ui.pitch.value = 0.1 + 0.4 * Math.sin(now * 0.8);
      }
      const p = Number(ui.pitch.value);
      const y = Number(ui.yaw.value);
      ui.po.textContent = `${(p * 57.3).toFixed(0)}°`;
      ui.yo.textContent = `${(y * 57.3).toFixed(0)}°`;
      for (const [name, q] of [['neck_pitch_joint', p], ['neck_yaw_joint', y]]) {
        const j = J[name];
        if (j) j.node.quaternion.copy(j.restQ).multiply(tq.setFromAxisAngle(j.axis, Math.min(j.hi, Math.max(j.lo, q))));
      }
      const t = now % 12;
      ctx.setActiveStep(e < 0.3 ? 0 : Math.floor(t / 2));
    },
  };
}

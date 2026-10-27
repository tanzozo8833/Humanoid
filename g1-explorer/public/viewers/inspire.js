// Close-up of the Inspire RH56 five-finger hand (option for the G1 EDU). Real geometry: a clone of the
// hand subtree from the main model (URDF g1_29dof_rev_1_0_with_inspire_hand_FTP), including its force
// sensor links. Real coupling: the URDF <mimic> tags - each finger has one driven joint and the distal
// one follows with a fixed ratio (index_2 = 1.0843 x index_1, thumb_3 = 0.8024 x thumb_2,
// thumb_4 = 0.9487 x thumb_3). Specs: the RH56 table in the G1 docs (6 DoF / 12 joints, 540 g, 24 V,
// RS485). The 6 linear actuators in the palm are drawn as a diagram (motor + lead screw); Inspire does
// not publish their exact placement.
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const DRIVEN = ['thumb_1', 'thumb_2', 'index_1', 'middle_1', 'ring_1', 'little_1'];

export function open(o) {
  const sideVi = o.side === 'right' ? 'phải' : 'trái';
  openCloseup({
    title: `Bàn tay Inspire RH56 ${sideVi} - 5 ngón, 6 bậc chủ động`,
    sub: '12 khớp nhưng chỉ 6 xi-lanh điện · đốt ngọn đi theo qua thanh nối (URDF mimic) · cảm biến lực FTP · 540 g · 24 V · RS485',
    heading: 'Vì sao 5 ngón mà chỉ 6 motor',
    camera: { pos: [0.22, 0.16, 0.26], target: [0, 0.07, 0], min: 0.05, max: 1.2, near: 0.001 },
    steps: [
      ['Lệnh', 'robot gửi góc đích + lực giới hạn cho 6 bậc qua RS485.'],
      ['Xi-lanh điện', 'mỗi bậc là một motor nhỏ + hộp số + vít me trong lòng bàn tay: quay → đẩy / kéo thẳng.'],
      ['Thanh nối', 'đầu vít me kéo đốt gốc của ngón gập lại.'],
      ['Đốt ngọn đi theo', 'cơ cấu 4 khâu bắt đốt ngọn gập theo tỉ lệ cố định (ngón trỏ: 1.0843 lần) - không cần motor riêng.'],
      ['Cảm biến lực', 'bản FTP có miếng cảm biến ở lòng bàn tay và từng đốt ngón, đo lực khi chạm vật.'],
      ['Giới hạn lực', 'khi lực đạt ngưỡng đặt trước thì ngón dừng - nắm được vật mềm mà không bóp hỏng.'],
    ],
    extra: `
      <dl class="hud">
        <dt>Mức khép</dt><dd data-k="k">-</dd>
        <dt>Ngón trỏ</dt><dd data-k="index">-</dd>
        <dt>Ngón cái</dt><dd data-k="thumb">-</dd>
      </dl>
      <h5>Thông số (bảng RH56 trong tài liệu G1)</h5>
      <dl class="kv">
        <dt>Bậc / khớp</dt><dd>6 chủ động / 12 khớp</dd><dt>Khối lượng</dt><dd>540 g</dd>
        <dt>Điện</dt><dd>24 V ±10% · tĩnh 0.2 A · đỉnh 2 A</dd><dt>Giao tiếp</dt><dd>RS485</dd>
        <dt>Lặp lại</dt><dd>±0.20 mm</dd><dt>Độ phân giải lực</dt><dd>0.5 N</dd>
        <dt>RH56DFX</dt><dd>lực ngón cái 15 N · ngón khác 10 N · xoay ngón cái 107°/s · gập ngón 260°/s</dd>
        <dt>RH56BFX</dt><dd>lực 6 N / 4 N · nhanh hơn: gập ngón 570°/s</dd>
      </dl>`,
    note: 'Mesh, trục khớp, tỉ lệ mimic: URDF Unitree (bản FTP). Thông số: bảng Inspire RH56 trong tài liệu G1. Vị trí 6 xi-lanh trong lòng bàn tay là sơ đồ; lực trong mô phỏng là minh hoạ.',
  }, (ctx) => build(ctx, o));
}

function build(ctx, o) {
  const { scene, add, mat, basic, label } = ctx;
  const qs = ctx.q;
  const s = o.side === 'right' ? 'right' : 'left';
  const holder = new THREE.Group();
  holder.rotation.x = -Math.PI / 2;
  scene.add(holder);
  const hand = o.palm.clone(true);
  hand.position.set(0, 0, 0);
  hand.quaternion.identity();
  holder.add(hand);
  // drop main-page X-ray extras (unnamed objects) from the clone
  const extras = [];
  hand.traverse((n) => { if (n !== hand && !n.name) extras.push(n); });
  for (const n of extras) n.parent?.remove(n);

  const shell = mat(0x30363d, { metalness: 0.3, roughness: 0.5, transparent: true });
  const sensorMats = [];
  const jnodes = {};
  hand.traverse((n) => {
    if (n.isMesh) {
      if (/force_sensor/.test(n.name)) {
        n.material = mat(0x1f6feb, { emissive: 0x1f6feb, emissiveIntensity: 0.4 });
        sensorMats.push(n.material);
      } else n.material = shell;
    }
    if (n.userData?.joint) jnodes[n.name] = n;
  });
  const J = {};
  for (const [name, j] of Object.entries(o.joints)) {
    if (!jnodes[name]) continue;
    J[name.replace(`${s}_`, '').replace('_joint', '')] = { node: jnodes[name], ...j, q: 0 };
  }
  const tq = new THREE.Quaternion();
  const apply = (j) => j.node.quaternion.copy(j.restQ).multiply(tq.setFromAxisAngle(j.axis, j.q));
  const far = (j) => (Math.abs(j.data.upper) > Math.abs(j.data.lower) ? j.data.upper : j.data.lower);

  // labels on real links
  const palmSensor = hand.getObjectByName(`${s}_palm_force_sensor`);
  if (palmSensor) label(palmSensor, 'Cảm biến lực lòng bàn tay', [0, 0, 0]);
  const idxSensor = hand.getObjectByName(`${s}_index_force_sensor_3`);
  if (idxSensor) label(idxSensor, 'Cảm biến lực đầu ngón', [0, 0, 0]);
  const idx2 = hand.getObjectByName(`${s}_index_2`);
  if (idx2) label(idx2, 'Đốt ngọn (đi theo, ×1.0843)', [0.02, 0, 0]);
  const th1 = hand.getObjectByName(`${s}_thumb_1`);
  if (th1) label(th1, 'Ngón cái xoay (bậc riêng)', [0, 0, 0]);

  // 6 linear actuators in the palm (diagram): body + extending rod
  const acts = DRIVEN.map((n, i) => {
    const g = new THREE.Group();
    g.position.set(-0.022 + (i % 3) * 0.02, i < 3 ? 0.007 : -0.007, 0.1);
    hand.add(g);
    add(g, new THREE.CylinderGeometry(0.0045, 0.0045, 0.035, 16), mat(0x56d364, { metalness: 0.5, emissive: 0x56d364, emissiveIntensity: 0.3 })).rotation.x = Math.PI / 2;
    const rod = add(g, new THREE.CylinderGeometry(0.0015, 0.0015, 0.03, 8), mat(0xd0d7de, { metalness: 0.9 }));
    rod.rotation.x = Math.PI / 2;
    return { g, rod, name: n };
  });
  label(acts[2].g, '6 xi-lanh điện (motor + vít me)', [0, 0, -0.02]);

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = { k: el('k'), index: el('index'), thumb: el('thumb') };
  const deg = (r) => `${Math.round(r * 57.3)}°`;
  return {
    update(now, dt, e) {
      shell.opacity = 1 - 0.5 * e;
      const k = 0.5 - 0.5 * Math.cos(now * 0.9);
      for (const n of DRIVEN) {
        const j = J[n];
        if (!j) continue;
        j.q = n === 'thumb_1' ? far(j) * 0.8 : far(j) * 0.85 * k;
      }
      // mimic chain (thumb_4 <- thumb_3 <- thumb_2), resolved in order
      for (let pass = 0; pass < 2; pass += 1) {
        for (const j of Object.values(J)) {
          if (!j.data.mimic) continue;
          const src = J[j.data.mimic.joint.replace(`${s}_`, '').replace('_joint', '')];
          if (src) j.q = src.q * j.data.mimic.multiplier + j.data.mimic.offset;
        }
      }
      for (const j of Object.values(J)) apply(j);
      acts.forEach((a, i) => { a.rod.position.z = 0.017 + 0.012 * (i === 0 ? 0.8 : k); });
      const force = Math.max(0, (k - 0.7) / 0.3);
      for (const m of sensorMats) {
        m.color.setHSL(0.62 - 0.62 * force, 0.9, 0.5);
        m.emissive.copy(m.color);
        m.emissiveIntensity = 0.3 + force;
      }
      ui.k.textContent = `${Math.round(k * 100)}%${force > 0 ? ` · lực ~${(force * 10).toFixed(1)} N (minh hoạ)` : ''}`;
      if (J.index_1 && J.index_2) ui.index.textContent = `gốc ${deg(J.index_1.q)} → ngọn ${deg(J.index_2.q)}`;
      if (J.thumb_2 && J.thumb_3 && J.thumb_4) ui.thumb.textContent = `${deg(J.thumb_2.q)} → ${deg(J.thumb_3.q)} → ${deg(J.thumb_4.q)}`;
      ctx.setActiveStep(e < 0.3 ? -1 : force > 0.6 ? 5 : force > 0 ? 4 : Math.floor((now % 8) / 2));
    },
  };
}

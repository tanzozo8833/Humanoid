// Close-up of the pelvis and the G1's cooling. Real pieces: the pelvis shell (URDF mesh), the two hip
// pitch joints and the waist yaw joint at their URDF origins, the main IMU (imu_in_pelvis). From the
// teardowns: two centrifugal fans in the hip area blowing through machined channels around the
// actuators (Munro Live), a small centrifugal fan in the waist joint module, a copper heat spreader on
// the knee, NTCs and current derating when too hot (中邮证券 p.39-42). The thermal numbers in the
// simulation (thermal resistance, thresholds) are NOT published - they only show the mechanism.
import * as THREE from 'three';
import { openCloseup, cloneLinkVisual } from '/closeup-shell.js';

const T_AMB = 25;
const T_FAN_FULL = 70;             // illustrative
const T_DERATE = 85;               // illustrative
const PARTICLES = 160;

export function open(o) {
  openCloseup({
    title: 'Khung chậu + hệ tản nhiệt',
    sub: 'Vỏ pelvis thật (URDF) · 2 khớp hông pitch · khớp eo yaw · 2 quạt ly tâm + rãnh gió · IMU chính',
    heading: 'Nhiệt sinh ra ở đâu và được đưa đi thế nào',
    camera: { pos: [0.3, 0.2, 0.32], target: [0, -0.03, 0], min: 0.1, max: 2 },
    steps: [
      ['Sinh nhiệt', 'dòng điện qua cuộn đồng stator tạo nhiệt ∝ mô-men² (tổn hao đồng) - khớp càng gánh nặng càng nóng.'],
      ['Dẫn nhiệt', 'vỏ actuator bằng nhôm có cánh ôm chặt stator, truyền nhiệt sang khung nhôm của hông.'],
      ['Thổi gió', '2 quạt ly tâm ở vùng hông thổi gió qua các rãnh gia công quanh actuator rồi ra ngoài.'],
      ['Đo nhiệt', 'mỗi motor báo 2 nhiệt độ (MotorState_.temperature[2]); NTC ở SoC và BMS.'],
      ['Bảo vệ', 'nóng quá ngưỡng → quạt chạy hết cỡ, driver giảm giới hạn dòng (derating) để nam châm không bị khử từ.'],
      ['Chỗ khác', 'eo: quạt nhỏ trong module; gối: tấm VC / tản đồng thụ động; mainboard: quạt + tản nhôm (+ ống đồng ở EDU).'],
    ],
    extra: `
      <h5>Mô phỏng nhiệt (minh hoạ cơ chế)</h5>
      <label class="row">Tải khớp hông <input type="range" data-k="load" min="0" max="100" step="1" value="45"><output data-k="loadOut"></output></label>
      <label class="row">Quạt <select data-k="fanMode" style="grid-column:2/4;background:#161c25;border:1px solid var(--line);border-radius:6px;padding:2px 6px"><option value="auto">Tự động theo nhiệt</option><option value="off">Tắt (thử)</option></select></label>
      <dl class="hud" style="margin-top:6px">
        <dt>Nhiệt cuộn dây</dt><dd data-k="temp">-</dd>
        <dt>Công suất nhiệt</dt><dd data-k="heat">-</dd>
        <dt>Quạt</dt><dd data-k="fan">-</dd>
        <dt>Giới hạn dòng</dt><dd data-k="limit">-</dd>
      </dl>
      <div class="bar"><i data-k="tempbar"></i></div>
      <h5>Từ teardown</h5>
      <dl class="kv">
        <dt>Hông</dt><dd>2 quạt ly tâm, gió theo rãnh gia công quanh actuator (Munro)</dd>
        <dt>Eo</dt><dd>quạt ly tâm nhỏ trong module khớp eo</dd>
        <dt>Gối</dt><dd>tấm VC / tản đồng + băng đồng ra khung (không quạt)</dd>
        <dt>Bảo vệ</dt><dd>NTC + derating dòng, quạt chạy hết cỡ khi quá ngưỡng</dd>
      </dl>`,
    note: 'Vỏ và vị trí khớp: URDF. Quạt / rãnh gió: Munro Live (humanoid.guide) + 中邮证券. Ngưỡng nhiệt (quạt hết cỡ 70 °C, derating 85 °C), nhiệt trở, công suất trong mô phỏng là số minh hoạ - Unitree không công bố.',
  }, (ctx) => build(ctx, o));
}

function build(ctx, o) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const ros = new THREE.Group();
  ros.rotation.x = -Math.PI / 2;
  scene.add(ros);
  const P = new THREE.Group();                      // pelvis frame
  P.position.set(0, 0, 0.07);
  ros.add(P);
  const shellMat = fade(mat(0xc4cad3, { metalness: 0.25, roughness: 0.45, side: THREE.DoubleSide }), 0.1);
  P.add(cloneLinkVisual(o.links?.pelvis, shellMat));
  P.add(cloneLinkVisual(o.links?.pelvis_contour_link, shellMat));

  // hip pitch joints (N7520-14.3) at the URDF origins, waist yaw on top
  const motorMat = mat(0x1f2328, { metalness: 0.6, roughness: 0.4, emissive: 0xf0883e, emissiveIntensity: 0.15 });
  const hips = [0.064452, -0.064452].map((y) => {
    const m = add(P, new THREE.CylinderGeometry(0.045, 0.045, 0.05, 32), motorMat, 0, y, -0.1027);
    for (let i = 0; i < 6; i += 1) add(m, new THREE.CylinderGeometry(0.048, 0.048, 0.003, 32), motorMat, 0, -0.02 + i * 0.008, 0);
    return m;
  });
  label(hips[0], 'Khớp hông pitch (N7520-14.3)', [0, 0.03, 0.05]);
  const waist = add(P, new THREE.CylinderGeometry(0.042, 0.042, 0.05, 32), motorMat, 0, 0, 0.025);
  waist.rotation.x = Math.PI / 2;
  label(waist, 'Khớp eo yaw (N7520-14.3)', [0, 0.05, 0]);
  const imu = add(P, new THREE.BoxGeometry(0.022, 0.022, 0.006), mat(0xbc8cff, { emissive: 0xbc8cff, emissiveIntensity: 0.6 }), 0.04525, 0, -0.08339);
  label(imu, 'IMU chính (imu_in_pelvis)', [0.01, 0, 0]);

  // two centrifugal fans + their outlets
  const fans = [0.03, -0.03].map((y) => {
    const g = new THREE.Group();
    g.position.set(-0.035, y, -0.05);
    P.add(g);
    add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.011, 24), mat(0x30363d, { transparent: true, opacity: 0.85 }));
    const blades = new THREE.Group();
    g.add(blades);
    for (let i = 0; i < 11; i += 1) {
      const b = add(blades, new THREE.BoxGeometry(0.011, 0.009, 0.001), mat(0x79c0ff, { emissive: 0x79c0ff, emissiveIntensity: 0.6 }), Math.cos(i * 0.571) * 0.012, 0, Math.sin(i * 0.571) * 0.012);
      b.rotation.y = -i * 0.571 + 0.5;
    }
    return { g, blades };
  });
  label(fans[0].g, 'Quạt ly tâm × 2', [0, 0.02, 0.015]);
  const waistFan = add(P, new THREE.CylinderGeometry(0.014, 0.014, 0.008, 20), mat(0x30363d), -0.045, 0, 0.03);
  label(waistFan, 'Quạt module eo', [0, 0, 0.012]);

  // airflow: particles from each fan, around the hip actuator, out at the side
  const paths = [1, -1].map((s) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.035, 0.03 * s, -0.05), new THREE.Vector3(-0.02, 0.045 * s, -0.075),
    new THREE.Vector3(0.0, 0.06 * s, -0.135), new THREE.Vector3(0.04, 0.07 * s, -0.11), new THREE.Vector3(0.07, 0.1 * s, -0.07),
  ]));
  const pts = new Float32Array(PARTICLES * 3);
  const pcol = new Float32Array(PARTICLES * 3);
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const cloud = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.004, vertexColors: true, transparent: true, opacity: 0.9 }));
  P.add(cloud);
  const seeds = Array.from({ length: PARTICLES }, (_, i) => ({ path: i % 2, u: Math.random(), jit: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5] }));
  const vent = new THREE.Object3D();
  vent.position.set(0.07, 0.1, -0.07);
  P.add(vent);
  label(vent, 'Gió nóng ra ngoài', [0, 0, 0], true);

  // thermal sim
  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['load', 'loadOut', 'fanMode', 'temp', 'heat', 'fan', 'limit', 'tempbar'].map((k) => [k, el(k)]));
  let T = 40;
  let fanSpeed = 0.3;
  const tmpV = new THREE.Vector3();
  const color = new THREE.Color();
  return {
    update(now, dt, e) {
      const load = Number(ui.load.value) / 100;
      ui.loadOut.textContent = `${Math.round(load * 100)}%`;
      const derate = T > T_DERATE ? Math.max(0.4, 1 - (T - T_DERATE) / 20) : 1;
      const tau = 71 * load * derate;                     // N·m on a hip pitch joint (peak 71)
      const heat = 0.012 * tau * tau;                     // copper loss, illustrative coefficient
      const autoFan = ui.fanMode.value === 'auto';
      const fanTarget = autoFan ? Math.min(1, Math.max(0.25, (T - 40) / (T_FAN_FULL - 40))) : 0;
      fanSpeed += (fanTarget - fanSpeed) * Math.min(1, dt * 2);
      const rth = 1.2 / (0.35 + 1.6 * fanSpeed);          // K/W, falls as the fan speeds up
      T += ((heat - (T - T_AMB) / rth) / 60) * dt * 6;     // heat capacity 60 J/K, time x6
      ui.temp.textContent = `${T.toFixed(1)} °C`;
      ui.heat.textContent = `${heat.toFixed(0)} W ở ${tau.toFixed(0)} N·m`;
      ui.fan.textContent = `${Math.round(fanSpeed * 100)}%${!autoFan ? ' (tắt thử)' : ''}`;
      ui.limit.textContent = derate < 1 ? `${Math.round(derate * 100)}% - đang derating` : '100%';
      ui.tempbar.style.width = `${Math.min(100, ((T - T_AMB) / 80) * 100)}%`;
      ui.tempbar.style.background = T > T_DERATE ? '#f85149' : T > T_FAN_FULL ? '#d29922' : '#3fb950';
      motorMat.emissive.setHSL(0.08 - Math.min(0.08, (T - 40) / 600), 1, 0.5);
      motorMat.emissiveIntensity = Math.min(1, Math.max(0.05, (T - 35) / 70));
      for (const f of fans) f.blades.rotation.y += dt * 40 * fanSpeed;
      seeds.forEach((s, i) => {
        s.u = (s.u + dt * 0.5 * fanSpeed) % 1;
        paths[s.path].getPointAt(s.u, tmpV);
        pts[i * 3] = tmpV.x + s.jit[0] * 0.012;
        pts[i * 3 + 1] = tmpV.y + s.jit[1] * 0.012;
        pts[i * 3 + 2] = tmpV.z + s.jit[2] * 0.012;
        color.setHSL(0.58 - 0.58 * Math.min(1, s.u * (T - 25) / 60), 0.9, 0.6);
        pcol[i * 3] = color.r; pcol[i * 3 + 1] = color.g; pcol[i * 3 + 2] = color.b;
      });
      pgeo.attributes.position.needsUpdate = true;
      pgeo.attributes.color.needsUpdate = true;
      cloud.visible = e > 0.3 && fanSpeed > 0.05;
      const step = T > T_DERATE ? 4 : Math.floor((now % 8) / 2);
      ctx.setActiveStep(e < 0.3 ? -1 : step);
    },
  };
}

// Close-up of one G1 joint module, opened from any directly driven joint (hip, knee, shoulder,
// elbow, wrist, waist yaw). Layer by layer along the joint axis, in the order of the real teardown
// of a small joint (中邮证券 2026-03, p.20-24, 43):
//   back cap -> round driver PCB (FOC, power stage, 2 connectors: XT30 power + CAN) -> rotor (magnet
//   hub) inside the stator pressed into the ribbed black housing -> planetary stage 1 (sun 18 /
//   planets 14 / ring 46) -> planetary stage 2 (16 / 20 / 56) running in the thin-section crossed
//   roller bearing -> front cap -> steel output flange, with the wiring through the hollow centre.
// Per-family gear ratios, torque-speed curve and inertia: unitree_rl_lab. Large joints (7520) were
// not torn down in a source we found - same layout is assumed, flagged in the note.
//
// The joint is simulated with the law the SDK exposes per motor in rt/lowcmd:
//   tau = Kp (q* - q) + Kd (dq* - dq) + tau_ff, clipped by the motor's torque-speed curve,
// on a link inertia, slowed down 10x so it can be followed by eye.
import * as THREE from 'three';
import { openCloseup, gearGeometry, ringGearGeometry, tubeGeometry } from '/closeup-shell.js';
import { SMALL_JOINT_TEARDOWN, ARM_COPPER_B } from '/parts.js';

const SLOW = 0.1;                  // simulated seconds per real second
const R = 0.05;                    // drawn housing radius (all motor families drawn the same size)
const DEMO_EVERY = 3.2;            // real seconds between demo targets
const POLES = 20;                  // rotor magnets counted on the teardown photo (~10 per visible half)
const SLOTS = 18;                  // stator teeth - estimate (18 slots / 20 poles is a usual pairing)

// Kp/Kd = what Unitree uses for RL training (unitree_rl_lab); motors without a published value
// (G1+ families, N5010) fall back on their size class.
const KP_BY_SIZE = { large: 120, small: 40, wrist: 40 };
const KD_BY_SIZE = { large: 3, small: 1, wrist: 1 };
const INERTIA_BY_SIZE = { large: 0.11, small: 0.025, wrist: 0.004 };
const KP_DEFAULT = { 'N7520-22.5': 150, 'N7520-14.3': 100, 'N5020-16': 40, 'W4010-25': 40 };
const KD_DEFAULT = { 'N7520-22.5': 4, 'N7520-14.3': 2, 'N5020-16': 1, 'W4010-25': 1 };
const LINK_INERTIA = { 'N7520-22.5': 0.12, 'N7520-14.3': 0.1, 'N5020-16': 0.025, 'W4010-25': 0.004 };
const kpOf = (n, M) => KP_DEFAULT[n] ?? KP_BY_SIZE[M.size] ?? 40;
const kdOf = (n, M) => KD_DEFAULT[n] ?? KD_BY_SIZE[M.size] ?? 1;
const inertiaOf = (n, M) => LINK_INERTIA[n] ?? INERTIA_BY_SIZE[M.size] ?? 0.02;

const STEPS = [
  ['Lệnh', 'mainboard gửi lệnh của rt/lowcmd (q*, dq*, Kp, Kd, τff) xuống khớp qua bus CAN nối chuỗi, ~2 ms một lần.'],
  ['Đo', 'hai encoder (MotorState.sensor[2]): một đọc nam châm ở đuôi rotor, một đo phía đầu ra - khử ảnh hưởng độ rơ bánh răng.'],
  ['Tính mô-men', 'driver tính τ = Kp·(q* − q) + Kd·(dq* − dq) + τff, giới hạn theo đường T-N; mô-men ≈ tỉ lệ dòng motor.'],
  ['FOC', 'driver đóng/ngắt tầng công suất → dòng 3 pha trong cuộn stator tạo từ trường quay, rotor nam châm quay theo (3000–5000 rpm).'],
  ['Giảm tốc', 'hai tầng hành tinh: rotor quay nhanh, đầu ra chậm hơn N lần nhưng mô-men lớn hơn N lần.'],
  ['Đầu ra', 'giá hành tinh tầng 2 quay trong ổ bi đũa chéo thành mỏng (đỡ lực hướng kính + dọc trục + lật); mặt bích thép bắt vào khâu.'],
];

export function open(o) {
  const M = o.motor;
  const name = o.motorName;
  const jd = o.jointData;
  const N = M.ratio;
  const s1 = M.stages[0];
  const s2 = M.stages[1];
  const zp = (s) => Math.round((s.ring - s.sun) / 2);
  const stageTxt = (s) => (s.teethIllustrative ? `${s.ratio.toFixed(2)}` : `1 + ${s.ring}/${s.sun} = ${s.ratio.toFixed(2)} (răng ${s.sun}/${zp(s)}/${s.ring})`);
  const key = o.describe.key;
  const copperB = ARM_COPPER_B[key];
  const isKnee = key === 'knee';
  const isWaist = key === 'waist_yaw';
  const isHip = /hip/.test(key);
  const total = SMALL_JOINT_TEARDOWN.masses.reduce((a, [, g]) => a + g, 0);
  const massBars = SMALL_JOINT_TEARDOWN.masses.map(([n, g]) => `<div style="display:grid;grid-template-columns:1fr 46px;gap:6px;align-items:center;font-size:12px">
      <span class="muted">${n}</span><b style="text-align:right">${g} g</b>
      <div class="bar" style="grid-column:1/3;margin:0 0 4px"><i style="width:${(g / 95) * 100}%"></i></div></div>`).join('');

  openCloseup({
    title: `${o.describe.short} - khớp ${name}`,
    sub: `${o.describe.what}. Tầm ${Math.round(jd.lower * 57.3)}°…${Math.round(jd.upper * 57.3)}° · ${jd.effort} N·m · ${jd.velocity} rad/s (URDF) · ${M.mass || ''}`,
    heading: 'Một khớp G1 đạt tới góc như thế nào',
    steps: STEPS,
    camera: { pos: [0.27, 0.19, 0.31], target: [0, 0.0, 0], min: 0.06, max: 1 },
    extra: `
      <h5>Trạng thái (mô phỏng, chậm 10×)</h5>
      <dl class="hud">
        <dt>Góc đích q*</dt><dd data-k="qd">-</dd>
        <dt>Góc q</dt><dd data-k="q">-</dd>
        <dt>Tốc độ đầu ra</dt><dd data-k="dq">-</dd>
        <dt>Rotor</dt><dd data-k="rpm">-</dd>
        <dt>Mô-men τ</dt><dd data-k="tau">-</dd>
        ${copperB !== undefined ? '<dt>Nhiệt cuộn dây</dt><dd data-k="heat">-</dd>' : ''}
      </dl>
      <div class="bar"><i data-k="taubar"></i></div>
      <h5>Đường mô-men - tốc độ (Unitree đo)</h5>
      <canvas data-k="tn" width="360" height="150" style="width:100%;background:#0d1218;border:1px solid var(--line);border-radius:8px"></canvas>
      <h5>Thử điều khiển</h5>
      <label class="row">Góc đích <input type="range" data-k="target" min="${jd.lower}" max="${jd.upper}" step="0.01" value="0"><output data-k="targetOut">0°</output></label>
      <label class="row">Kp (N·m/rad) <input type="range" data-k="kp" min="5" max="300" step="1" value="${kpOf(name, M)}"><output data-k="kpOut"></output></label>
      <label class="row">Kd (N·m·s/rad) <input type="range" data-k="kd" min="0" max="10" step="0.1" value="${kdOf(name, M)}"><output data-k="kdOut"></output></label>
      <label class="row">Tải ngoài <input type="range" data-k="load" min="${-jd.effort}" max="${jd.effort}" step="0.5" value="0"><output data-k="loadOut">0</output></label>
      <div class="closeup-buttons"><button type="button" class="btn small" data-k="demo">Demo tự động: bật</button></div>
      <h5>Thông số ${name}</h5>
      <dl class="kv">
        <dt>Tỉ số truyền</dt><dd>${N} = tầng 1 ${stageTxt(s1)} × tầng 2 ${stageTxt(s2)}</dd>
        <dt>Mô-men đỉnh</dt><dd>${M.peakSame} N·m (cùng chiều) · ${M.peakOpp} N·m (ngược chiều)</dd>
        <dt>Tốc độ</dt><dd>đủ mô-men tới ${M.kneeSpeed} rad/s · không tải ${M.noLoad} rad/s</dd>
        <dt>Quán tính rotor</dt><dd>${M.rotorInertia || '(chưa công bố)'} · quy về đầu ra ${M.armature} kg·m²</dd>
        ${M.curveEstimated ? '<dt>Lưu ý G1+</dt><dd>motor_info.md chỉ cho mô-men và tốc độ: đường T-N vẽ ước lượng từ 2 số đó, tầng bánh răng minh hoạ.</dd>' : ''}
        <dt>Dùng ở</dt><dd>${M.role}</dd>
        ${isKnee ? '<dt>Tản nhiệt gối</dt><dd>tấm VC / tản đồng ôm stator + băng đồng dẫn nhiệt ra khung nhôm đùi (thụ động)</dd>' : ''}
        ${isWaist ? '<dt>Tản nhiệt eo</dt><dd>quạt ly tâm nhỏ gắn trên module khớp eo</dd>' : ''}
        ${isHip ? '<dt>Tản nhiệt hông</dt><dd>2 quạt ly tâm ở vùng hông thổi gió qua rãnh gia công quanh actuator</dd>' : ''}
      </dl>
      <h5>Tháo rời thật một khớp nhỏ (N5020, cẳng chân)</h5>
      <p class="muted" style="margin:0 0 6px">ø~60 × 70 mm, ${total} g. Thứ tự từ sau ra trước: ${SMALL_JOINT_TEARDOWN.order.join(' → ')}.</p>
      ${massBars}
      <dl class="kv" style="margin-top:6px">
        <dt>Ổ bi</dt><dd>${SMALL_JOINT_TEARDOWN.bearing}</dd>
        <dt>Rotor</dt><dd>${SMALL_JOINT_TEARDOWN.speed}</dd>
        <dt>Dây</dt><dd>${SMALL_JOINT_TEARDOWN.bus}</dd>
        <dt>Driver</dt><dd>PCB tròn 12.8 g, FOC, mọi nhãn chip bị xoá (chống sao chép)</dd>
      </dl>`,
    note: `Nguồn: tỉ số từng tầng, đường T-N, quán tính - unitree_rl_lab (Unitree). Thứ tự lớp, số răng tầng 1/2 (18/14/46, 16/20/56),
      khối lượng từng chi tiết, ổ bi LYBN CRBT355A - báo cáo tháo rời 中邮证券 (khớp nhỏ). Báo cáo ghi vành răng 60 răng và tổng ~20.58,
      nhưng 18 + 2×14 = 46 và Unitree ghi tỉ số 16 - mô hình dùng 46/56. ${s1.teethIllustrative || s2.teethIllustrative ? 'Răng ở tầng có ghi tỉ số thập phân là chọn cho đúng tỉ số. ' : ''}
      ${M.size === 'large' ? 'Khớp lớn 7520 (~1.1 kg) chưa có bài tháo rời chi tiết - giả định cùng kiểu cấu tạo. ' : ''}
      Số cực rotor (${POLES}) đếm từ ảnh, số rãnh stator (${SLOTS}) là ước lượng. ${copperB !== undefined ? `Hệ số nhiệt cuộn dây b = ${copperB} W/(N·m)² đo trên G1 thật (arXiv 2606.15915).` : ''}
      Kp/Kd mặc định = giá trị Unitree dùng khi train RL.`,
  }, (ctx) => build(ctx, o, copperB, isKnee, isWaist));
}

function planetary(ctx, parent, stage, colors) {
  const { add, mat } = ctx;
  const ringR = R * 0.78;                  // ring pitch radius
  const m = (2 * ringR) / stage.ring;      // module
  const zs = stage.sun;
  const zp = Math.round((stage.ring - stage.sun) / 2);
  const rs = (m * zs) / 2;
  const rp = (m * zp) / 2;
  const orbit = rs + rp;
  const th = 0.007;
  const g = new THREE.Group();
  parent.add(g);
  const ring = add(g, ringGearGeometry(ringR, R * 0.9, stage.ring, th), mat(0x484f58, { metalness: 0.8, roughness: 0.35 }));
  const sun = add(g, gearGeometry(rs, zs, th * 1.1, 0.004), mat(colors.sun, { metalness: 0.7, roughness: 0.3 }));
  const carrier = new THREE.Group();
  g.add(carrier);
  for (let i = 0; i < 3; i += 1) {                // 3-arm carrier, open so the gears stay visible
    const arm = add(carrier, new THREE.BoxGeometry(orbit, 0.0015, 0.004), mat(0xb1bac4, { metalness: 0.6 }), 0, th * 0.75, 0);
    arm.geometry.translate(orbit / 2, 0, 0);
    arm.rotation.y = -(i / 3) * Math.PI * 2;
  }
  add(carrier, tubeGeometry(0.0045, 0.008, 0.0016), mat(0xb1bac4, { metalness: 0.6 }), 0, th * 0.75, 0);
  const planets = [];
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2;
    const p = add(carrier, gearGeometry(rp, zp, th, 0.0012), mat(colors.planet, { metalness: 0.7, roughness: 0.3 }), Math.cos(a) * orbit, 0, Math.sin(a) * orbit);
    add(p, new THREE.CylinderGeometry(0.0012, 0.0012, th * 1.8, 8), mat(0xd0d7de, { metalness: 0.9 }));
    planets.push(p);
  }
  return { g, ring, sun, carrier, planets, zs, zp, zr: stage.ring };
}

/** Planetary kinematics, ring fixed: carrier = sun * zs/(zs+zr); planet spin rel. carrier. */
function drivePlanetary(p, sunAngle) {
  const carrier = (sunAngle * p.zs) / (p.zs + p.zr);
  p.sun.rotation.y = sunAngle;
  p.carrier.rotation.y = carrier;
  const spin = -((sunAngle - carrier) * p.zs) / p.zp;
  for (const pl of p.planets) pl.rotation.y = spin;
  return carrier;
}

function build(ctx, o, copperB, isKnee, isWaist) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const M = o.motor;
  const name = o.motorName;
  const jd = o.jointData;
  const N = M.ratio;
  const root = new THREE.Group();
  scene.add(root);
  const layers = [];                       // [group, closedY, openY]
  const layer = (closedY, openY) => {
    const g = new THREE.Group();
    g.position.y = closedY;
    root.add(g);
    layers.push([g, closedY, openY]);
    return g;
  };

  // ---- black ribbed aluminium housing (holds the stator), fades as it opens
  const housingMat = fade(mat(0x1f2328, { metalness: 0.6, roughness: 0.45 }), 0.08);
  const housing = layer(-0.022, -0.04);
  add(housing, tubeGeometry(R * 0.9, R * 0.97, 0.05), housingMat);
  for (let i = 0; i < 7; i += 1) add(housing, tubeGeometry(R * 0.96, R * 1.04, 0.003), housingMat, 0, -0.02 + i * 0.0065, 0);
  if (isKnee) {
    const vc = new THREE.Mesh(new THREE.TorusGeometry(R * 1.08, 0.004, 8, 40, Math.PI * 1.1), mat(0xe3b341, { metalness: 0.9, roughness: 0.25, emissive: 0x8a5a00, emissiveIntensity: 0.4 }));
    vc.rotation.x = Math.PI / 2;
    housing.add(vc);
    label(vc, 'Tấm VC / tản đồng (gối)', [R * 1.1, 0, 0], true);
  }

  // ---- back cap + round driver PCB (bottom of the stack)
  const cap = layer(-0.052, -0.12);
  add(cap, tubeGeometry(0.006, R * 0.95, 0.003), fade(mat(0x30363d, { metalness: 0.6 }), 0.2));
  const pcb = layer(-0.046, -0.095);
  add(pcb, tubeGeometry(0.0075, R * 0.86, 0.0016), mat(0x161b22, { roughness: 0.7 }));
  const mosfets = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const mo = add(pcb, new THREE.BoxGeometry(0.007, 0.002, 0.006), mat(0x0d1117, { roughness: 0.4, emissive: 0xff7b00, emissiveIntensity: 0 }), Math.cos(a) * 0.031, 0.0018, Math.sin(a) * 0.031);
    mo.rotation.y = -a;
    mosfets.push(mo);
  }
  for (let i = 0; i < 14; i += 1) {                // passive parts ring
    const a = (i / 14) * Math.PI * 2;
    add(pcb, new THREE.BoxGeometry(0.003, 0.0015, 0.002), mat(0x8b949e), Math.cos(a) * 0.04, 0.0015, Math.sin(a) * 0.04);
  }
  const mcu = add(pcb, new THREE.BoxGeometry(0.009, 0.0018, 0.009), mat(0x0d1117, { roughness: 0.3 }), -0.016, 0.0017, 0.006);
  const encChip = add(pcb, new THREE.BoxGeometry(0.004, 0.0016, 0.004), mat(0x6e40c9, { emissive: 0x6e40c9, emissiveIntensity: 0.4 }), 0.012, 0.0016, -0.003);
  const connPow = add(pcb, new THREE.BoxGeometry(0.016, 0.008, 0.009), mat(0x0d1117, { roughness: 0.5 }), -0.034, 0.005, -0.012);
  const connCan = add(pcb, new THREE.BoxGeometry(0.016, 0.008, 0.009), mat(0x0d1117, { roughness: 0.5 }), -0.034, 0.005, 0.0);
  const busLed = add(pcb, new THREE.BoxGeometry(0.003, 0.0015, 0.003), basic(0x3fb950), 0.02, 0.0016, 0.024);

  // ---- PMSM: stator (in the housing) + rotor magnet hub inside it - "internal rotor"
  const motor = layer(-0.022, -0.04);
  const copper = mat(0xc87533, { metalness: 0.85, roughness: 0.3 });
  const lam = mat(0x3d444d, { metalness: 0.7, roughness: 0.4 });
  add(motor, tubeGeometry(R * 0.74, R * 0.88, 0.022), lam);
  const coils = [];
  for (let i = 0; i < SLOTS; i += 1) {
    const a = (i / SLOTS) * Math.PI * 2;
    const coil = add(motor, new THREE.BoxGeometry(0.008, 0.024, 0.0065), copper.clone(), Math.cos(a) * R * 0.66, 0, Math.sin(a) * R * 0.66);
    coil.rotation.y = -a;
    coils.push({ mesh: coil, phase: i % 3 });
  }
  const rotor = new THREE.Group();
  motor.add(rotor);
  add(rotor, tubeGeometry(0.0075, R * 0.49, 0.021), mat(0xb1bac4, { metalness: 0.8 }));    // aluminium magnet hub
  for (let i = 0; i < POLES; i += 1) {
    const a = (i / POLES) * Math.PI * 2;
    const mg = add(rotor, new THREE.BoxGeometry(0.003, 0.021, 0.0072), mat(i % 2 ? 0xd1242f : 0x0969da, { metalness: 0.3, roughness: 0.4 }), Math.cos(a) * R * 0.52, 0, Math.sin(a) * R * 0.52);
    mg.rotation.y = -a;
  }
  const encMagnet = add(rotor, new THREE.CylinderGeometry(0.004, 0.004, 0.003, 16), mat(0xbc8cff), 0.012, -0.013, -0.003);

  // ---- two planetary stages; stage-2 carrier runs in the crossed roller bearing
  const st1 = layer(-0.004, 0.0);
  const p1 = planetary(ctx, st1, M.stages[0], { sun: 0xd0d7de, planet: 0xc9d1d9 });
  const st2 = layer(0.008, 0.032);
  const p2 = planetary(ctx, st2, M.stages[1], { sun: 0xe3b341, planet: 0xd29922 });
  const brg = layer(0.019, 0.058);
  add(brg, tubeGeometry(R * 0.55, R * 0.62, 0.01), mat(0xb1bac4, { metalness: 0.9, roughness: 0.2 }));
  add(brg, tubeGeometry(R * 0.76, R * 0.84, 0.01), mat(0xb1bac4, { metalness: 0.9, roughness: 0.2 }));
  const rollers = new THREE.Group();
  brg.add(rollers);
  for (let i = 0; i < 28; i += 1) {
    const a = (i / 28) * Math.PI * 2;
    const r = add(rollers, new THREE.CylinderGeometry(0.0032, 0.0032, 0.0062, 10), mat(0xe6edf3, { metalness: 0.95, roughness: 0.15 }), Math.cos(a) * R * 0.69, 0, Math.sin(a) * R * 0.69);
    r.rotation.order = 'YXZ';
    r.rotation.y = -a;
    r.rotation.x = i % 2 ? Math.PI / 4 : -Math.PI / 4;   // alternately crossed at 90 deg
  }

  // ---- front cap + steel output flange + output-side encoder ring + link stub
  const front = layer(0.028, 0.08);
  add(front, tubeGeometry(R * 0.62, R * 0.95, 0.003), fade(mat(0x30363d, { metalness: 0.6 }), 0.2));
  const outL = layer(0.034, 0.1);
  const flange = new THREE.Group();
  outL.add(flange);
  add(flange, tubeGeometry(0.0075, R * 0.6, 0.006), mat(0x8b949e, { metalness: 0.9, roughness: 0.3 }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    add(flange, new THREE.CylinderGeometry(0.0022, 0.0022, 0.0065, 10), mat(0x30363d), Math.cos(a) * R * 0.45, 0, Math.sin(a) * R * 0.45);
  }
  add(flange, new THREE.BoxGeometry(0.008, 0.002, 0.02), basic(0xf85149), R * 0.3, 0.004, 0);
  const outEnc = add(flange, tubeGeometry(R * 0.2, R * 0.26, 0.002), mat(0xbc8cff, { emissive: 0x6e40c9, emissiveIntensity: 0.3 }), 0, -0.004, 0);
  const link = add(flange, new THREE.BoxGeometry(0.09, 0.008, 0.022), mat(M.color, { transparent: true, opacity: 0.85, roughness: 0.4 }), 0.06, 0.008, 0);
  let fan = null;
  if (isWaist) {
    fan = new THREE.Group();
    fan.position.set(-0.075, -0.03, 0);
    root.add(fan);
    add(fan, new THREE.CylinderGeometry(0.02, 0.02, 0.01, 24), mat(0x30363d, { transparent: true, opacity: 0.7 }));
    for (let i = 0; i < 10; i += 1) {
      const b = add(fan, new THREE.BoxGeometry(0.01, 0.008, 0.001), mat(0x79c0ff, { emissive: 0x79c0ff, emissiveIntensity: 0.5 }), Math.cos(i * 0.628) * 0.012, 0, Math.sin(i * 0.628) * 0.012);
      b.rotation.y = -i * 0.628 + 0.5;
    }
    label(fan, 'Quạt ly tâm của module eo', [0, 0.015, 0], true);
  }

  // ---- XT30 + CAN harness: enters the centre at the back, exits at the front to the next joint
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.11, -0.06, -0.012), new THREE.Vector3(-0.05, -0.05, -0.006), new THREE.Vector3(0, -0.055, 0),
    new THREE.Vector3(0, 0.0, 0), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.02, 0.1, 0), new THREE.Vector3(0.09, 0.115, 0.02),
  ]);
  const cable = add(root, new THREE.TubeGeometry(cableCurve, 80, 0.0028, 8), mat(0xffa657, { emissive: 0xffa657, emissiveIntensity: 0.35 }));
  const busCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.12, -0.075, 0.05), new THREE.Vector3(-0.07, -0.06, 0.02), new THREE.Vector3(-0.034, -0.045, 0.0)]);
  add(root, new THREE.TubeGeometry(busCurve, 30, 0.0016, 8), mat(0xe6edf3));
  const packet = add(root, new THREE.SphereGeometry(0.0035, 12, 12), basic(0x79c0ff));
  packet.visible = false;

  label(mcu, 'Chip điều khiển (đã xoá nhãn)', [0, 0.003, 0]);
  label(mosfets[0], 'Tầng công suất 3 pha', [0, 0.003, 0]);
  label(encChip, 'Encoder 1 (đuôi rotor)', [0, 0.002, 0]);
  label(connPow, 'Đầu XT30 nguồn', [0, 0.006, 0]);
  label(connCan, 'Đầu CAN', [0, 0.006, 0]);
  label(coils[4].mesh, 'Stator - cuộn đồng bọc keo (94 g)', [0, 0.014, 0]);
  label(rotor, `Rotor ${POLES} nam châm (43 g)`, [0, 0.013, 0.0]);
  label(p1.planets[0], `Tầng 1 · ${M.stages[0].ratio.toFixed(2)}:1`, [0, 0.005, 0]);
  label(p2.planets[1], `Tầng 2 · ${M.stages[1].ratio.toFixed(2)}:1`, [0, 0.005, 0]);
  label(p2.ring, 'Vành răng thép (cố định)', [R * 0.85, 0, 0]);
  label(rollers.children[5], 'Ổ bi đũa chéo CRBT355A', [0, 0.006, 0]);
  label(outEnc, 'Encoder 2 (phía ra)', [R * 0.25, 0, 0]);
  label(cable, 'Dây XT30 + CAN qua tâm rỗng', [0, 0, 0]);
  const linkTip = new THREE.Object3D();
  linkTip.position.set(0.1, 0.012, 0);
  flange.add(linkTip);
  label(linkTip, 'Mặt bích thép → khâu tiếp theo', [0, 0, 0], true);

  // ---- panel wiring
  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['qd', 'q', 'dq', 'rpm', 'tau', 'heat', 'taubar', 'tn', 'target', 'targetOut', 'kp', 'kpOut', 'kd', 'kdOut', 'load', 'loadOut', 'demo'].map((k) => [k, el(k)]));
  let demo = true;
  ui.demo.addEventListener('click', () => { demo = !demo; ui.demo.textContent = `Demo tự động: ${demo ? 'bật' : 'tắt'}`; }, { signal: ctx.signal });
  ui.target.addEventListener('input', () => { demo = false; ui.demo.textContent = 'Demo tự động: tắt'; send(Number(ui.target.value)); }, { signal: ctx.signal });
  const tn = ui.tn.getContext('2d');

  // ---- simulation state
  const J = M.armature + inertiaOf(name, M);
  let q = Math.min(jd.upper, Math.max(jd.lower, 0));
  let dq = 0;
  let qd = q;
  let pending = null;
  let lastCmdAt = -10;
  let nextDemo = performance.now() / 1000 + 1.5;
  let tau = 0;
  const trail = [];

  function send(target) {
    pending = { target: Math.min(jd.upper, Math.max(jd.lower, target)), at: performance.now() / 1000 };
  }
  function tnLimit(speed, dir) {
    const peak = dir ? M.peakSame : M.peakOpp;
    const s = Math.abs(speed);
    if (s <= M.kneeSpeed) return peak;
    return Math.max(0, peak * (1 - (s - M.kneeSpeed) / (M.noLoad - M.kneeSpeed)));
  }

  function drawTN() {
    const w = ui.tn.width;
    const h = ui.tn.height;
    const pad = 28;
    const maxT = M.peakOpp * 1.1;
    const maxS = M.noLoad * 1.1;
    const X = (s) => pad + (s / maxS) * (w - pad - 8);
    const Y = (t) => h - pad + 6 - (t / maxT) * (h - pad - 6);
    tn.clearRect(0, 0, w, h);
    tn.strokeStyle = '#30363d';
    tn.beginPath(); tn.moveTo(pad, 4); tn.lineTo(pad, h - pad + 6); tn.lineTo(w - 4, h - pad + 6); tn.stroke();
    tn.fillStyle = '#6b7683';
    tn.font = '10px Segoe UI';
    tn.fillText('τ (N·m)', 2, 12);
    tn.fillText('tốc độ (rad/s)', w - 80, h - 4);
    tn.fillText(`${M.peakSame}`, 2, Y(M.peakSame) + 3);
    tn.fillText(`${M.noLoad}`, X(M.noLoad) - 10, h - pad + 18);
    tn.strokeStyle = M.css;
    tn.lineWidth = 2;
    tn.beginPath(); tn.moveTo(X(0), Y(M.peakSame)); tn.lineTo(X(M.kneeSpeed), Y(M.peakSame)); tn.lineTo(X(M.noLoad), Y(0)); tn.stroke();
    tn.setLineDash([4, 3]);
    tn.strokeStyle = '#8b949e';
    tn.lineWidth = 1;
    tn.beginPath(); tn.moveTo(X(0), Y(M.peakOpp)); tn.lineTo(X(M.kneeSpeed), Y(M.peakOpp)); tn.stroke();
    tn.beginPath(); tn.moveTo(X(0), Y(jd.effort)); tn.lineTo(w - 4, Y(jd.effort)); tn.stroke();
    tn.setLineDash([]);
    tn.fillText(`URDF ${jd.effort}`, w - 60, Y(jd.effort) - 3);
    for (let i = 0; i < trail.length; i += 1) {
      const [s, t] = trail[i];
      tn.fillStyle = `rgba(121,192,255,${(i / trail.length) * 0.8})`;
      tn.fillRect(X(Math.abs(s)) - 1.5, Y(Math.abs(t)) - 1.5, 3, 3);
    }
    tn.fillStyle = '#fff';
    tn.beginPath(); tn.arc(X(Math.abs(dq)), Y(Math.abs(tau)), 4, 0, Math.PI * 2); tn.fill();
  }

  return {
    update(now, dt, e) {
      for (const [g, c, op] of layers) g.position.y = c + (op - c) * e;
      link.material.opacity = 0.85 - 0.4 * e;
      if (fan) fan.rotation.y += dt * 20;
      const kp = Number(ui.kp.value);
      const kd = Number(ui.kd.value);
      const load = Number(ui.load.value);
      ui.kpOut.textContent = kp;
      ui.kdOut.textContent = kd.toFixed(1);
      ui.loadOut.textContent = `${load}`;

      if (demo && now >= nextDemo && !pending && e > 0.5) {
        const span = jd.upper - jd.lower;
        let t;
        do t = jd.lower + span * (0.15 + 0.7 * Math.random()); while (Math.abs(t - q) < span * 0.15);
        send(t);
        nextDemo = now + DEMO_EVERY;
      }
      let step = -1;
      if (pending) {
        const k = Math.max(0, Math.min(1, (now - pending.at) / 0.6));
        packet.visible = true;
        busCurve.getPointAt(k, packet.position);
        step = 0;
        if (k >= 1) { qd = pending.target; pending = null; packet.visible = false; lastCmdAt = now; }
      }
      busLed.material.color.setHex(pending || now - lastCmdAt < 0.2 ? 0x7ee787 : 0x1a4d2a);

      // physics, slowed down: PD + load, torque clipped to the T-N curve
      const simDt = dt * SLOW;
      const sub = 8;
      for (let i = 0; i < sub; i += 1) {
        const h = simDt / sub;
        let t = kp * (qd - q) + kd * (0 - dq);
        const lim = tnLimit(dq, t * dq >= 0);
        t = Math.max(-lim, Math.min(lim, t));
        tau = t;
        const acc = (t - load - 0.15 * Math.sign(dq)) / J;
        dq += acc * h;
        q += dq * h;
        if (q < jd.lower) { q = jd.lower; dq = Math.max(0, dq); }
        if (q > jd.upper) { q = jd.upper; dq = Math.min(0, dq); }
      }
      trail.push([dq, tau]);
      if (trail.length > 90) trail.shift();

      // kinematics of the drawn train: output = carrier 2, rotor = N x output
      const rotorAngle = q * N;
      rotor.rotation.y = rotorAngle;
      drivePlanetary(p2, drivePlanetary(p1, rotorAngle));    // stage-2 sun is carried by stage-1 carrier
      flange.rotation.y = q;
      rollers.rotation.y = q / 2;                             // rollers' cage turns at half the output speed

      // FOC: phase currents follow the rotor's electrical angle (POLES/2 pole pairs), scaled by torque
      const amp = Math.min(1, Math.abs(tau) / M.peakSame);
      const elec = rotorAngle * (POLES / 2);
      for (const c of coils) {
        const i = Math.sin(elec + (c.phase * 2 * Math.PI) / 3) * amp;
        c.mesh.material.emissive.setHex(i > 0 ? 0xff5a36 : 0x3d8bfd);
        c.mesh.material.emissiveIntensity = Math.abs(i) * 1.6;
      }
      for (let i = 0; i < 6; i += 1) {
        const on = Math.sin(elec + (Math.floor(i / 2) * 2 * Math.PI) / 3) * (i % 2 ? -1 : 1) > 0.3 && amp > 0.02;
        mosfets[i].material.emissiveIntensity = on ? 1.2 * amp + 0.2 : 0;
      }
      encMagnet.rotation.y = rotorAngle;

      if (step < 0) {
        const err = Math.abs(qd - q);
        if (now - lastCmdAt < 0.5) step = 1;
        else if (Math.abs(dq) > 0.05 && err > 0.05) step = Math.floor(now / 1.2) % 3 === 0 ? 2 : (Math.floor(now / 1.2) % 3 === 1 ? 3 : 4);
        else step = 5;
      }
      ctx.setActiveStep(e > 0.3 ? step : -1);

      const deg = (r) => `${(r * 57.2958).toFixed(1)}°`;
      ui.qd.textContent = deg(qd);
      ui.q.textContent = deg(q);
      ui.dq.textContent = `${dq.toFixed(2)} rad/s`;
      ui.rpm.textContent = `${Math.round(Math.abs(dq) * N * 60 / (2 * Math.PI))} rpm (= ${N} × đầu ra)`;
      ui.tau.textContent = `${tau.toFixed(1)} N·m (${Math.round((Math.abs(tau) / M.peakSame) * 100)}% đỉnh)`;
      if (ui.heat) ui.heat.textContent = `≈ ${(copperB * tau * tau).toFixed(1)} W (b·τ², b = ${copperB})`;
      ui.taubar.style.width = `${Math.min(100, (Math.abs(tau) / M.peakOpp) * 100)}%`;
      ui.taubar.style.background = Math.abs(tau) > M.peakSame * 0.95 ? '#f85149' : M.css;
      if (!pending && demo) ui.target.value = qd;
      ui.targetOut.textContent = deg(Number(ui.target.value));
      drawTN();
    },
  };
}

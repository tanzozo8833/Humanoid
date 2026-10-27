// Close-up of a G1 IMU (two of them: imu_in_pelvis -> LowState.imu_state, imu_in_torso ->
// rt/secondary_imu). Unitree does not name the chip, so this is a generic 6-axis MEMS IMU drawn
// as its two sensing structures: an accelerometer proof mass on springs between capacitor combs,
// and a vibrating gyroscope mass deflected by the Coriolis force. The chip tilts and turns like a
// torso would; the readings and the attitude are computed from that motion.
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const G = 9.81;

export function open() {
  openCloseup({
    title: 'IMU - cảm biến quán tính (pelvis + thân)',
    sub: 'Gia tốc kế 3 trục + con quay 3 trục MEMS · G1 có 2 IMU: pelvis (LowState.imu_state) và thân (rt/secondary_imu)',
    heading: 'IMU biết robot đang nghiêng thế nào',
    camera: { pos: [0.05, 0.045, 0.06], target: [0, 0.0, 0], min: 0.02, max: 0.5, near: 0.0005 },
    steps: [
      ['Gia tốc kế', 'khối thử treo trên lò xo silicon; khi nghiêng, trọng lực kéo khối lệch đi vài nano-mét.'],
      ['Đọc tụ', 'các răng lược quanh khối thay đổi khoảng cách → điện dung đổi → ra gia tốc theo trục.'],
      ['Con quay', 'một khối được cho rung liên tục; khi chip quay, lực Coriolis đẩy khối lệch vuông góc.'],
      ['Tốc độ quay', 'độ lệch đó tỉ lệ với tốc độ quay (rad/s) quanh trục tương ứng.'],
      ['Kết hợp', 'bộ lọc trộn con quay (nhanh, nhưng trôi) với gia tốc kế (chậm, nhưng biết hướng trọng lực) → roll/pitch/yaw.'],
      ['Gửi đi', 'quaternion, gyroscope, accelerometer, rpy trong IMUState_ - bộ điều khiển cân bằng dùng mỗi chu kỳ.'],
    ],
    extra: `
      <dl class="hud">
        <dt>Gia tốc (m/s²)</dt><dd data-k="acc">-</dd>
        <dt>Con quay (rad/s)</dt><dd data-k="gyr">-</dd>
        <dt>Roll / pitch / yaw</dt><dd data-k="rpy">-</dd>
      </dl>
      <h5>Trên G1 (URDF)</h5>
      <dl class="kv">
        <dt>imu_in_pelvis</dt><dd>pelvis (0.045, 0, −0.083) m → LowState.imu_state</dd>
        <dt>imu_in_torso</dt><dd>torso_link (−0.040, −0.002, 0.148) m → rt/secondary_imu</dd>
        <dt>Vì sao 2 cái</dt><dd>thân xoay được so với hông qua 3 khớp eo, nên tư thế thân ≠ tư thế pelvis</dd>
      </dl>`,
    note: 'Unitree không công bố chip IMU; cấu trúc MEMS vẽ phóng to hàng nghìn lần, chuyển động khối thử phóng đại để thấy được.',
  }, build);
}

function build(ctx) {
  const { scene, add, mat, label, fade } = ctx;
  const qs = ctx.q;
  const chip = new THREE.Group();
  scene.add(chip);
  const pkg = fade(mat(0x161b22, { roughness: 0.4 }), 0.12);
  add(chip, new THREE.BoxGeometry(0.03, 0.006, 0.03), pkg);
  add(chip, new THREE.BoxGeometry(0.028, 0.0008, 0.028), mat(0x8b949e, { metalness: 0.6 }), 0, -0.0032, 0);
  const die = (x) => add(chip, new THREE.BoxGeometry(0.012, 0.001, 0.024), mat(0x30363d, { metalness: 0.5 }), x, -0.001, 0);
  const dieA = die(-0.007);
  const dieG = die(0.007);
  label(dieA, 'Gia tốc kế MEMS', [0, 0.004, -0.01]);
  label(dieG, 'Con quay MEMS', [0, 0.004, -0.01]);

  // accelerometer: proof mass + springs + combs
  const accel = new THREE.Group();
  accel.position.set(-0.007, 0.0005, 0);
  chip.add(accel);
  const proof = add(accel, new THREE.BoxGeometry(0.006, 0.0008, 0.01), mat(0xd29922, { metalness: 0.7, emissive: 0x6b4d00, emissiveIntensity: 0.3 }));
  const combs = [];
  for (let i = 0; i < 6; i += 1) {
    const z = -0.004 + i * 0.0016;
    add(accel, new THREE.BoxGeometry(0.0022, 0.0006, 0.0005), mat(0x8b949e, { metalness: 0.8 }), -0.0045, 0, z);
    add(accel, new THREE.BoxGeometry(0.0022, 0.0006, 0.0005), mat(0x8b949e, { metalness: 0.8 }), 0.0045, 0, z);
    combs.push(add(proof, new THREE.BoxGeometry(0.0016, 0.0006, 0.0004), mat(0xd29922), -0.0035, 0, z + 0.0008));
  }
  for (const s of [-1, 1]) add(accel, new THREE.BoxGeometry(0.0004, 0.0004, 0.002), mat(0x58a6ff), 0, 0, s * 0.006);
  label(proof, 'Khối thử', [0, 0.001, 0]);
  label(combs[0], 'Răng lược (tụ điện)', [0, 0.001, 0]);

  // gyro: driven mass
  const gyro = new THREE.Group();
  gyro.position.set(0.007, 0.0005, 0);
  chip.add(gyro);
  const gmass = add(gyro, new THREE.BoxGeometry(0.006, 0.0008, 0.006), mat(0x3fb950, { metalness: 0.7, emissive: 0x0f3d1a, emissiveIntensity: 0.4 }));
  add(gyro, new THREE.BoxGeometry(0.009, 0.0004, 0.0004), mat(0x58a6ff), 0, 0, 0.0045);
  add(gyro, new THREE.BoxGeometry(0.009, 0.0004, 0.0004), mat(0x58a6ff), 0, 0, -0.0045);
  label(gmass, 'Khối rung (Coriolis)', [0, 0.001, 0]);

  // axes
  const axes = new THREE.AxesHelper(0.02);
  axes.position.y = 0.004;
  chip.add(axes);

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = { acc: el('acc'), gyr: el('gyr'), rpy: el('rpy') };
  const prev = new THREE.Euler();
  const gWorld = new THREE.Vector3(0, -G, 0);
  const gLocal = new THREE.Vector3();
  const qInv = new THREE.Quaternion();
  return {
    update(now, dt, e) {
      const roll = 0.35 * Math.sin(now * 0.7);
      const pitch = 0.25 * Math.sin(now * 0.5 + 1);
      const yaw = 0.6 * Math.sin(now * 0.3);
      chip.rotation.set(roll, yaw, pitch, 'YXZ');
      const w = [(roll - prev.x) / Math.max(dt, 1e-3), (yaw - prev.y) / Math.max(dt, 1e-3), (pitch - prev.z) / Math.max(dt, 1e-3)];
      prev.set(roll, yaw, pitch);
      qInv.copy(chip.quaternion).invert();
      gLocal.copy(gWorld).applyQuaternion(qInv).negate();     // what an accelerometer reads at rest
      proof.position.x = THREE.MathUtils.clamp(-gLocal.x / G, -1, 1) * 0.0008;
      proof.position.z = THREE.MathUtils.clamp(-gLocal.z / G, -1, 1) * 0.0008;
      gmass.position.x = Math.sin(now * 30) * 0.0006;            // drive vibration
      gmass.position.z = Math.sin(now * 30) * w[1] * 0.002;      // Coriolis sense deflection
      ui.acc.textContent = `x ${gLocal.x.toFixed(2)} · y ${gLocal.z.toFixed(2)} · z ${gLocal.y.toFixed(2)}`;
      ui.gyr.textContent = `x ${w[0].toFixed(2)} · y ${w[2].toFixed(2)} · z ${w[1].toFixed(2)}`;
      ui.rpy.textContent = `${(roll * 57.3).toFixed(1)}° / ${(pitch * 57.3).toFixed(1)}° / ${(yaw * 57.3).toFixed(1)}°`;
      const t = now % 9;
      ctx.setActiveStep(e < 0.3 ? -1 : t < 1.5 ? 0 : t < 3 ? 1 : t < 4.5 ? 2 : t < 6 ? 3 : t < 7.5 ? 4 : 5);
    },
  };
}

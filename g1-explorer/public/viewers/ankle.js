// Close-up of a two-motor parallel joint: the G1 ankle (and, with mode 'waist', waist roll/pitch).
// The URDF models these as a serial pitch + roll pair; the hardware has two N5020-16 motors (A, B)
// higher up that push/pull two rods. unitree_sdk2 exposes both views: Mode::PR (command pitch/roll,
// firmware solves the linkage) and Mode::AB (command the two motors directly).
//
// The linkage here is solved for real (rod length constant): PR -> AB by a 1-D Newton per motor,
// AB -> PR by a 2-D Newton on that. Dimensions are illustrative (not Unitree's drawing), so the
// motor angles are "of this model", but the coupling - same direction = pitch, opposite = roll -
// is exactly what the hardware does.
import * as THREE from 'three';
import { openCloseup, tubeGeometry } from '/closeup-shell.js';

const C = 0.03;                    // crank length
// Motors stacked on the calf like Unitree's diagram (zhongyou p.45): B on top, A below. side +1 = A, -1 = B.
const MOTOR_Y = { 1: 0.15, '-1': 0.22 };
const HALF = 0.024;                // lateral half-spacing of the two rods (cranks sit on either face)
const ATTACH = new THREE.Vector3(-0.045, 0.012, 0);  // rod foot end, behind the joint (+/- HALF in z)
const MOTOR_X = -0.012;

function crankTip(theta, side, out) {
  return out.set(MOTOR_X - C * Math.cos(theta), MOTOR_Y[side] + C * Math.sin(theta), side * HALF);
}
const rot = new THREE.Matrix4();
const rx = new THREE.Matrix4();
function footMatrix(pitch, roll) {
  // three axes: x forward, y up, z lateral. Pitch about z, then roll about x (URDF order).
  return rot.makeRotationZ(-pitch).multiply(rx.makeRotationX(roll));   // URDF +pitch (about ROS y = three -z) = toes down
}
const tipV = new THREE.Vector3();
const attV = new THREE.Vector3();
function attachPoint(pitch, roll, side, out) {
  out.set(ATTACH.x, ATTACH.y, side * HALF);
  return out.applyMatrix4(footMatrix(pitch, roll));
}
const ROD_L = Object.fromEntries([1, -1].map((side) => [side, crankTip(0, side, new THREE.Vector3()).distanceTo(attachPoint(0, 0, side, new THREE.Vector3()))]));

/** Motor angle (rad) that keeps the rod at its length for this foot pose. */
function solveMotor(pitch, roll, side, guess = 0) {
  attachPoint(pitch, roll, side, attV);
  let th = guess;
  for (let i = 0; i < 20; i += 1) {
    const f = crankTip(th, side, tipV).distanceTo(attV) - ROD_L[side];
    const f2 = crankTip(th + 1e-4, side, tipV).distanceTo(attV) - ROD_L[side];
    const d = (f2 - f) / 1e-4;
    if (Math.abs(d) < 1e-9) break;
    th -= f / d;
    if (Math.abs(f) < 1e-7) break;
  }
  return th;
}
/** AB -> PR (forward kinematics) by Newton on the inverse map. */
function solvePose(thA, thB, guess) {
  let [p, r] = guess;
  for (let i = 0; i < 15; i += 1) {
    const a = solveMotor(p, r, 1, thA) - thA;
    const b = solveMotor(p, r, -1, thB) - thB;
    if (Math.abs(a) + Math.abs(b) < 1e-6) break;
    const e = 1e-4;
    const ap = (solveMotor(p + e, r, 1, thA) - thA - a) / e;
    const bp = (solveMotor(p + e, r, -1, thB) - thB - b) / e;
    const ar = (solveMotor(p, r + e, 1, thA) - thA - a) / e;
    const br = (solveMotor(p, r + e, -1, thB) - thB - b) / e;
    const det = ap * br - ar * bp;
    if (Math.abs(det) < 1e-12) break;
    p -= (a * br - ar * b) / det;
    r -= (ap * b - a * bp) / det;
  }
  return [p, r];
}

export function open(o) {
  const waist = o.mode === 'waist';
  const lim = waist ? { p: [-0.52, 0.52], r: [-0.52, 0.52] } : { p: [-0.87267, 0.5236], r: [-0.2618, 0.2618] };
  const what = waist ? 'Eo roll / pitch' : `Cổ chân ${o.side === 'right' ? 'phải' : 'trái'}`;
  openCloseup({
    title: `${what} - cơ cấu song song 2 motor (A/B)`,
    sub: waist
      ? 'Hai N5020-16 trong thân đẩy hai thanh xuống khâu eo · SDK index 13 (roll/A), 14 (pitch/B)'
      : `Hai N5020-16 trên cẳng chân đẩy hai thanh xuống gót · SDK index ${o.side === 'right' ? '10 (pitch/B), 11 (roll/A)' : '4 (pitch/B), 5 (roll/A)'}`,
    heading: 'Vì sao 2 motor điều khiển 2 trục cùng lúc',
    camera: { pos: [0.5, 0.32, 0.56], target: [0.01, 0.1, 0], min: 0.1, max: 2 },
    steps: [
      ['Lệnh', 'Mode::PR: gửi góc pitch + roll như hai khớp nối tiếp trong URDF. Mode::AB: gửi thẳng góc motor A, B.'],
      ['Giải động học', 'ở PR, firmware tính góc A, B sao cho mỗi thanh truyền giữ đúng chiều dài.'],
      ['Tay quay', 'mỗi motor quay một tay quay ngắn ở đầu trên thanh truyền.'],
      ['Thanh truyền', 'đẩy / kéo hai điểm sau khớp, hai bên trái phải.'],
      ['Cùng chiều = pitch', 'hai thanh cùng lên/xuống → bàn chân gập lên / duỗi xuống.'],
      ['Ngược chiều = roll', 'một thanh lên, một thanh xuống → bàn chân nghiêng sang bên.'],
    ],
    extra: `
      <h5>Trạng thái</h5>
      <dl class="hud">
        <dt>Pitch</dt><dd data-k="p">-</dd><dt>Roll</dt><dd data-k="r">-</dd>
        <dt>Motor A</dt><dd data-k="a">-</dd><dt>Motor B</dt><dd data-k="b">-</dd>
        <dt>Đang làm</dt><dd data-k="phase">-</dd>
      </dl>
      <h5>Thử</h5>
      <div class="closeup-buttons">
        <button type="button" class="btn small" data-k="demo">Demo tự động: bật</button>
        <button type="button" class="btn small" data-k="mode">Chế độ: PR (pitch/roll)</button>
      </div>
      <label class="row"><span data-k="l1">Pitch</span><input type="range" data-k="s1" min="-1" max="1" step="0.01" value="0"><output data-k="o1"></output></label>
      <label class="row"><span data-k="l2">Roll</span><input type="range" data-k="s2" min="-1" max="1" step="0.01" value="0"><output data-k="o2"></output></label>
      <h5>Vì sao làm vậy</h5>
      <ul class="inside">
        <li><b>Chân nhẹ ở đầu mút</b> <span class="muted">- motor nằm cao gần gối, bàn chân chỉ có khớp + thanh: quán tính khi vung chân nhỏ.</span></li>
        <li><b>Chia tải</b> <span class="muted">- cả hai motor cùng gánh pitch (hoặc roll), nên URDF cho 35 N·m mỗi trục dù một N5020 chỉ 25 N·m.</span></li>
        <li><b>Đổi lại</b> <span class="muted">- quan hệ A/B ↔ pitch/roll phi tuyến, phải giải động học (firmware làm ở Mode::PR).</span></li>
        <li><b>Khớp cầu ở 2 đầu thanh</b> <span class="muted">- thanh truyền lệch khỏi mặt phẳng khi chân nghiêng nên phải dùng khớp cầu (Munro).</span></li>
        <li><b>Khớp cardan lộ ra ngoài</b> <span class="muted">- có mỡ bôi trơn, dễ bám bụi; Munro gợi ý thêm ủng che.</span></li>
      </ul>`,
    note: `Mode::PR / Mode::AB và chỉ số motor theo unitree_sdk2 (example/g1/low_level/g1_ankle_swing_example.cpp);
      tầm ${waist ? 'eo ±30°' : 'pitch −50…+30°, roll ±15°'} theo URDF. Kích thước tay quay / thanh truyền là minh hoạ,
      nên góc motor A/B hiển thị là của mô hình này - nhưng quy luật ghép cặp là thật. ${waist ? 'Vị trí 2 motor eo chưa có ảnh tháo rời.' : 'Cách xếp motor B trên / A dưới theo sơ đồ Unitree in trong báo cáo tháo rời 中邮证券 (tr.45); motor là khớp nhỏ ø60 × 70 mm, 525 g.'}`,
  }, (ctx) => build(ctx, o, waist, lim));
}

function build(ctx, o, waist, lim) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  scene.add(root);

  // upper body part (shin or torso bottom), fades so the motors show
  const shellMat = fade(mat(0xc4cad3, { metalness: 0.25, roughness: 0.45 }), 0.12);
  add(root, new THREE.BoxGeometry(0.07, 0.3, 0.075), shellMat, -0.005, 0.17, 0);
  const upperLabelObj = new THREE.Object3D();
  upperLabelObj.position.set(0.04, 0.29, 0);
  root.add(upperLabelObj);
  label(upperLabelObj, waist ? 'Thân trên (torso)' : 'Cẳng chân - thanh thép (knee_link)', [0, 0, 0], true);

  // the two motors + cranks
  const motorMat = mat(0x1f2328, { metalness: 0.6, roughness: 0.4, emissive: 0x4fa3ff, emissiveIntensity: 0.12 });
  const cranks = [];
  for (const side of [1, -1]) {
    // small joint module ø60 x 70 mm lying across the calf (axis lateral), ribbed black housing
    const m = add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.042, 32), motorMat, MOTOR_X, MOTOR_Y[side], 0);
    m.rotation.x = Math.PI / 2;
    add(m, tubeGeometry(0.008, 0.022, 0.044), mat(0x30363d), 0, 0, 0);
    const crank = new THREE.Group();
    crank.position.set(MOTOR_X, MOTOR_Y[side], side * HALF);
    root.add(crank);
    const arm = add(crank, new THREE.BoxGeometry(C, 0.008, 0.006), mat(0xd0d7de, { metalness: 0.85, roughness: 0.25 }));
    arm.geometry.translate(-C / 2, 0, 0);
    add(crank, new THREE.SphereGeometry(0.0055, 12, 12), mat(0x8b949e, { metalness: 0.9 }), -C, 0, 0);
    cranks.push(crank);
    label(m, side > 0 ? 'Motor A (dưới) · N5020-16' : 'Motor B (trên) · N5020-16', [0, 0, 0.035]);
  }

  // joint (cardan) at the origin
  add(root, new THREE.SphereGeometry(0.012, 20, 20), mat(0x2b3038, { metalness: 0.6 }));
  const cross = add(root, new THREE.CylinderGeometry(0.004, 0.004, 0.06, 10), mat(0x8b949e, { metalness: 0.9 }));
  cross.rotation.x = Math.PI / 2;

  // foot (or waist link) - pitches about z, rolls about x
  const foot = new THREE.Group();
  root.add(foot);
  const footMat = mat(0xc4cad3, { metalness: 0.25, roughness: 0.45 });
  if (waist) {
    add(foot, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 32), footMat, 0, -0.03, 0);
    add(foot, new THREE.BoxGeometry(0.1, 0.05, 0.12), mat(0x2b3038, { metalness: 0.4 }), 0, -0.075, 0);
  } else {
    add(foot, new THREE.BoxGeometry(0.21, 0.028, 0.085), footMat, 0.04, -0.03, 0);
    add(foot, new THREE.BoxGeometry(0.215, 0.008, 0.09), mat(0x1f2328, { roughness: 0.9 }), 0.04, -0.048, 0);
  }
  add(foot, new THREE.BoxGeometry(0.03, 0.03, 0.06), mat(0x2b3038, { metalness: 0.5 }), -0.035, 0.002, 0);
  const footLabel = new THREE.Object3D();
  footLabel.position.set(waist ? 0.06 : 0.14, -0.03, 0);
  foot.add(footLabel);
  label(footLabel, waist ? 'Khâu eo yaw (phía hông)' : 'Bàn chân (ankle_roll_link)', [0, 0, 0], true);
  label(cross, 'Khớp các-đăng (pitch + roll)', [0, -0.01, 0.03]);

  // rods
  const rodMat = mat(0xe6edf3, { metalness: 0.9, roughness: 0.2 });
  const rods = [1, -1].map(() => {
    const r = add(root, new THREE.CylinderGeometry(0.0035, 0.0035, 1, 12), rodMat);
    return r;
  });
  const balls = [1, -1].map(() => add(root, new THREE.SphereGeometry(0.0055, 12, 12), mat(0x8b949e, { metalness: 0.9 })));
  label(rods[0], 'Thanh truyền A', [0, 0.0, 0.01]);
  label(rods[1], 'Thanh truyền B', [0, 0.0, -0.01]);

  // ground under the foot
  if (!waist) {
    const g = add(root, new THREE.CircleGeometry(0.3, 48), mat(0x161b22, { roughness: 1 }), 0, -0.06, 0);
    g.rotation.x = -Math.PI / 2;
  }

  // panel
  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['p', 'r', 'a', 'b', 'phase', 'demo', 'mode', 's1', 's2', 'o1', 'o2', 'l1', 'l2'].map((k) => [k, el(k)]));
  let demo = true;
  let modeAB = false;
  let pose = [0, 0];
  let th = [0, 0];
  const setSliders = () => {
    if (modeAB) {
      ui.l1.textContent = 'Motor A'; ui.l2.textContent = 'Motor B';
      for (const s of [ui.s1, ui.s2]) { s.min = -1.2; s.max = 1.2; }
      ui.s1.value = th[0]; ui.s2.value = th[1];
    } else {
      ui.l1.textContent = 'Pitch'; ui.l2.textContent = 'Roll';
      ui.s1.min = lim.p[0]; ui.s1.max = lim.p[1]; ui.s2.min = lim.r[0]; ui.s2.max = lim.r[1];
      ui.s1.value = pose[0]; ui.s2.value = pose[1];
    }
  };
  setSliders();
  ui.demo.addEventListener('click', () => { demo = !demo; ui.demo.textContent = `Demo tự động: ${demo ? 'bật' : 'tắt'}`; }, { signal: ctx.signal });
  ui.mode.addEventListener('click', () => {
    modeAB = !modeAB;
    ui.mode.textContent = modeAB ? 'Chế độ: AB (2 motor)' : 'Chế độ: PR (pitch/roll)';
    setSliders();
  }, { signal: ctx.signal });
  for (const s of [ui.s1, ui.s2]) s.addEventListener('input', () => { demo = false; ui.demo.textContent = 'Demo tự động: tắt'; }, { signal: ctx.signal });

  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const Yup = new THREE.Vector3(0, 1, 0);
  const deg = (r) => `${(r * 57.2958).toFixed(1)}°`;
  let phaseText = '';
  return {
    update(now, dt, e) {
      let target;
      if (demo) {
        // 0-4 s pitch only, 4-8 s roll only, 8-12 s both
        const t = now % 12;
        const s = Math.sin((t % 4) / 4 * Math.PI * 2);
        if (t < 4) { target = [s > 0 ? s * lim.p[1] : -s * lim.p[0] * 0.8, 0]; phaseText = 'chỉ pitch → A, B cùng chiều'; }
        else if (t < 8) { target = [0, s * lim.r[1]]; phaseText = 'chỉ roll → A, B ngược chiều'; }
        else { target = [0.5 * s * lim.p[1], Math.cos((t % 4) / 4 * Math.PI * 2) * lim.r[1] * 0.8]; phaseText = 'pitch + roll cùng lúc'; }
        pose = [pose[0] + (target[0] - pose[0]) * Math.min(1, dt * 6), pose[1] + (target[1] - pose[1]) * Math.min(1, dt * 6)];
        th = [solveMotor(pose[0], pose[1], 1, th[0]), solveMotor(pose[0], pose[1], -1, th[1])];
        if (modeAB) { ui.s1.value = th[0]; ui.s2.value = th[1]; } else { ui.s1.value = pose[0]; ui.s2.value = pose[1]; }
      } else if (modeAB) {
        th = [Number(ui.s1.value), Number(ui.s2.value)];
        pose = solvePose(th[0], th[1], pose);
        pose = [Math.max(lim.p[0] - 0.2, Math.min(lim.p[1] + 0.2, pose[0])), Math.max(lim.r[0] - 0.2, Math.min(lim.r[1] + 0.2, pose[1]))];
        phaseText = 'bạn điều khiển thẳng 2 motor';
      } else {
        pose = [Number(ui.s1.value), Number(ui.s2.value)];
        th = [solveMotor(pose[0], pose[1], 1, th[0]), solveMotor(pose[0], pose[1], -1, th[1])];
        phaseText = 'firmware giải pitch/roll → A, B';
      }

      foot.setRotationFromMatrix(footMatrix(pose[0], pose[1]));
      cranks.forEach((c, i) => { c.rotation.z = -th[i]; });
      [1, -1].forEach((side, i) => {
        crankTip(th[i], side, pa);
        attachPoint(pose[0], pose[1], side, pb);
        const r = rods[i];
        r.position.copy(pa).add(pb).multiplyScalar(0.5);
        r.scale.set(1, pa.distanceTo(pb), 1);
        r.quaternion.setFromUnitVectors(Yup, pb.clone().sub(pa).normalize());
        balls[i].position.copy(pb);
      });

      const same = Math.sign(th[0]) === Math.sign(th[1]) && Math.abs(th[0]) > 0.02;
      const step = !demo && modeAB ? 2 : (Math.abs(pose[1]) > 0.03 && !same ? 5 : (Math.abs(pose[0]) > 0.03 ? 4 : 1));
      ctx.setActiveStep(e > 0.3 ? step : -1);
      ui.p.textContent = deg(pose[0]);
      ui.r.textContent = deg(pose[1]);
      ui.a.textContent = deg(th[0]);
      ui.b.textContent = deg(th[1]);
      ui.phase.textContent = phaseText;
      ui.o1.textContent = deg(Number(ui.s1.value));
      ui.o2.textContent = deg(Number(ui.s2.value));
    },
  };
}

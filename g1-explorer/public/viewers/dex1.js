// Close-up of the Dex1-1 two-finger gripper (unitree.com/Dex1-1): 143 x 78 x 67 mm, 550 g, 90 mm stroke,
// 5-120 N adjustable force, 50-375 mm/s, one M4010 motor (1:25, 15-bit absolute encoder, 5 N·m peak)
// driven over high-speed RS485 at 1000 Hz with the usual Unitree joint command (angle, velocity,
// torque, stiffness, damping). The URDF models the two fingers as prismatic joints moving in opposite
// directions. Unitree does not say how rotation becomes translation: the rack-and-pinion drawn here is
// a diagram. The grasp demo closes on an object and stops at the set force - force control by
// limiting motor torque.
import * as THREE from 'three';
import { openCloseup, gearGeometry } from '/closeup-shell.js';

const STROKE = 0.09;               // m, both fingers together
const S = 1;                       // real size (the gripper is ~14 cm)

export function open() {
  openCloseup({
    title: 'Tay kẹp Dex1-1 - 2 ngón song song, 1 motor',
    sub: '143 × 78 × 67 mm · 550 g · hành trình 90 mm · lực 5–120 N · 50–375 mm/s · M4010 1:25 · RS485 6 Mbps 1000 Hz',
    heading: 'Một motor làm hai ngón kẹp lại thế nào',
    camera: { pos: [0.16, 0.16, 0.24], target: [0.02, 0.0, 0], min: 0.08, max: 1 },
    steps: [
      ['Lệnh', 'robot gửi cho motor M4010 lệnh như một khớp: góc, vận tốc, mô-men, độ cứng, giảm chấn (1000 Hz, RS485).'],
      ['Motor + hộp số', 'motor quay qua hộp số 1:25, encoder tuyệt đối 15 bit biết vị trí tuyệt đối ngay khi bật.'],
      ['Quay → tịnh tiến', 'một bánh răng ăn khớp hai thanh răng đối diện: bánh quay, hai thanh (hai ngón) đi ngược chiều nhau.'],
      ['Khép ngón', 'hai ngón trượt trên ray song song - mặt kẹp luôn song song nhau, hành trình tổng 90 mm.'],
      ['Chạm vật', 'khi ngón chạm vật, vị trí không đổi nữa nhưng mô-men tăng lên.'],
      ['Giữ lực', 'mô-men bị giới hạn theo lực đặt (5–120 N): kẹp chặt mà không bóp nát; tải tối đa 20 kg (ôm khít) / 5 kg (ma sát).'],
    ],
    extra: `
      <label class="row">Lực kẹp <input type="range" data-k="force" min="5" max="120" step="1" value="40"><output data-k="forceOut"></output></label>
      <label class="row">Tốc độ <input type="range" data-k="speed" min="50" max="375" step="5" value="150"><output data-k="speedOut"></output></label>
      <label class="row">Vật <select data-k="obj" style="grid-column:2/4;background:#161c25;border:1px solid var(--line);border-radius:6px;padding:2px 6px">
        <option value="0.06">hộp cứng 60 mm</option><option value="0.035">ống 35 mm</option><option value="0.075">bóng mềm 75 mm</option><option value="0">không có vật</option></select></label>
      <dl class="hud" style="margin-top:6px">
        <dt>Độ mở</dt><dd data-k="open">-</dd><dt>Lực</dt><dd data-k="f">-</dd><dt>Motor</dt><dd data-k="m">-</dd><dt>Trạng thái</dt><dd data-k="st">-</dd>
      </dl>
      <h5>Thông số (unitree.com/Dex1-1)</h5>
      <dl class="kv">
        <dt>Kẹp</dt><dd>hành trình 90 mm · lực 5–120 N · 50–375 mm/s · đóng hết 0.24 s · 0.1 mm ở đầu ngón · ngón dài 80 mm</dd>
        <dt>Tải</dt><dd>20 kg ôm khít · 5 kg nhờ ma sát</dd>
        <dt>Motor</dt><dd>M4010 · 1:25 · 5 N·m đỉnh · 27 rad/s @64 V · encoder tuyệt đối 15 bit · phản hồi góc, vận tốc, mô-men, nhiệt độ</dd>
        <dt>Điện</dt><dd>24–64 V (khuyên 24/48 V) · tĩnh 0.03 A · đỉnh 3.5 A</dd>
        <dt>Bản Advanced</dt><dd>camera 1080p 30/60 fps, FOV 118° × 87° × 140°</dd>
      </dl>`,
    note: 'Thông số: unitree.com/Dex1-1. Hai ngón tịnh tiến ngược chiều: URDF g1_29dof_mode_15_with_dex1_1. Cơ cấu thanh răng - bánh răng là sơ đồ (Unitree không công bố). Mô phỏng lực là minh hoạ.',
  }, build);
}

function build(ctx) {
  const { scene, add, mat, label, fade } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  root.scale.setScalar(S);
  scene.add(root);
  // housing (fades) - 143 x 78 x 67 mm; jaws point +x
  const shell = fade(mat(0x2b3038, { roughness: 0.5, metalness: 0.3 }), 0.1);
  add(root, new THREE.BoxGeometry(0.075, 0.067, 0.078), shell, -0.03, 0, 0);
  // motor + gearbox along y
  const motor = add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.03, 24), mat(0x1f2328, { metalness: 0.6, emissive: 0x79c0ff, emissiveIntensity: 0.15 }), -0.04, -0.012, 0);
  const pinion = add(root, gearGeometry(0.012, 16, 0.008, 0.002), mat(0xe3b341, { metalness: 0.8 }), -0.04, 0.012, 0);
  label(motor, 'Motor M4010 + hộp số 1:25', [0, -0.02, 0.025]);
  label(pinion, 'Bánh răng (sơ đồ)', [0, 0.01, 0]);
  const enc = add(root, new THREE.BoxGeometry(0.006, 0.002, 0.006), mat(0x6e40c9, { emissive: 0x6e40c9, emissiveIntensity: 0.5 }), -0.04, -0.029, 0);
  label(enc, 'Encoder tuyệt đối 15 bit', [0, -0.006, 0]);
  const board = add(root, new THREE.BoxGeometry(0.05, 0.002, 0.06), mat(0x1a7f37), -0.02, -0.031, 0);
  label(board, 'Driver + RS485 6 Mbps', [0.02, -0.004, 0.03]);
  // rails
  for (const y of [0.025]) add(root, new THREE.BoxGeometry(0.004, 0.004, 0.13), mat(0xd0d7de, { metalness: 0.9 }), 0.0, y, 0);
  // two racks + fingers (opposite directions along z)
  const fingers = [1, -1].map((sz) => {
    const g = new THREE.Group();
    root.add(g);
    const rack = add(g, new THREE.BoxGeometry(0.008, 0.006, 0.06), mat(0xc9d1d9, { metalness: 0.85 }), -0.04, 0.012 + sz * 0.0, sz * 0.0);
    rack.position.x = -0.04 + sz * 0.014;
    const jaw = add(g, new THREE.BoxGeometry(0.08, 0.03, 0.012), mat(0x8b949e, { metalness: 0.5, roughness: 0.4 }), 0.045, 0.012, 0);
    const pad = add(g, new THREE.BoxGeometry(0.06, 0.026, 0.003), mat(0x161b22, { roughness: 0.9 }), 0.055, 0.012, -sz * 0.0075);
    return { g, sz, rack, jaw, pad };
  });
  label(fingers[0].jaw, 'Ngón kẹp 80 mm', [0.03, 0.02, 0]);
  label(fingers[0].rack, 'Thanh răng (sơ đồ)', [0, 0.008, 0]);
  // object
  const obj = add(root, new THREE.BoxGeometry(0.05, 0.05, 1), mat(0xf0883e, { roughness: 0.6, transparent: true, opacity: 0.9 }), 0.06, 0.012, 0);
  label(obj, 'Vật', [0, 0.035, 0], true);

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['force', 'forceOut', 'speed', 'speedOut', 'obj', 'open', 'f', 'm', 'st'].map((k) => [k, el(k)]));
  let gap = STROKE;                // current opening between pads (m)
  let closing = true;
  let holdUntil = 0;
  let pinionAngle = 0;
  return {
    update(now, dt, e) {
      const Fset = Number(ui.force.value);
      const v = Number(ui.speed.value) / 1000;
      const size = Number(ui.obj.value);
      ui.forceOut.textContent = `${Fset} N`;
      ui.speedOut.textContent = `${Math.round(v * 1000)} mm/s`;
      obj.visible = size > 0;
      obj.scale.z = Math.max(0.001, size);
      const soft = ui.obj.selectedIndex === 2;
      let F = 0;
      let state;
      if (closing) {
        const contact = size > 0 && gap <= size;
        if (contact) {
          // squeeze: a soft object gives a little, a hard one does not
          const comp = soft ? Math.min(0.012, (Fset / 120) * 0.012) : 0.0005 * (Fset / 120);
          gap = Math.max(size - comp, gap - v * dt * 0.2);
          F = Fset;
          state = `đang giữ - mô-men bị giới hạn ở ${Fset} N`;
          if (!holdUntil) holdUntil = now + 2.5;
          if (now > holdUntil) { closing = false; holdUntil = 0; }
        } else {
          gap = Math.max(0, gap - v * dt);
          state = 'đang khép';
          if (gap <= 0.0005) { if (!holdUntil) holdUntil = now + 1; if (now > holdUntil) { closing = false; holdUntil = 0; } }
        }
      } else {
        gap = Math.min(STROKE, gap + v * dt);
        state = 'đang mở';
        if (gap >= STROKE) closing = true;
      }
      const prev = pinionAngle;
      pinionAngle = ((STROKE - gap) / 2) / 0.012;           // rack travel = r * angle
      pinion.rotation.y = pinionAngle;
      for (const f of fingers) f.g.position.z = f.sz * (gap / 2 + 0.0075);
      const motorSpeed = ((pinionAngle - prev) / Math.max(dt, 1e-3)) * 25;
      motor.material.emissiveIntensity = 0.15 + Math.min(1, Math.abs(motorSpeed) / 50) + (F ? 0.5 : 0);
      ui.open.textContent = `${(gap * 1000).toFixed(1)} mm / 90 mm`;
      ui.f.textContent = F ? `${F} N` : '0 N';
      ui.m.textContent = F ? `mô-men giữ ~${((F * 0.012) / 25).toFixed(3)} N·m (trước hộp số, minh hoạ)` : `${Math.abs(motorSpeed).toFixed(0)} rad/s`;
      ui.st.textContent = state;
      ctx.setActiveStep(e < 0.3 ? -1 : F ? 5 : closing ? (gap > STROKE * 0.6 ? 1 : 3) : 2);
    },
  };
}

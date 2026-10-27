// Close-up of the G1 wireless remote. Hardware list and key combinations: the G1 manual ("Controls",
// QRE copy of Unitree's docs). Data path: the remote's state reaches the robot and appears in
// LowState.wireless_remote[40]; unitree_sdk2 example/g1/low_level/gamepad.hpp gives the exact layout:
//   bytes 0-1  head
//   bytes 2-3  16 button bits: R1 L1 START SELECT R2 L2 F1 F2 A B X Y UP RIGHT DOWN LEFT (bit 0..15)
//   bytes 4-23 five little-endian float32: lx, rx, ry, L2 (analog), ly
//   bytes 24-39 unused
// Clicking a button (or pressing the keyboard key shown) sets that bit; dragging a stick sets the floats;
// the panel shows the 40 bytes exactly as your code would receive them. The 3D shape is drawn from the
// product photo (proportions approximate).
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const BITS = ['R1', 'L1', 'START', 'SELECT', 'R2', 'L2', 'F1', 'F2', 'A', 'B', 'X', 'Y', 'UP', 'RIGHT', 'DOWN', 'LEFT'];
const COMBOS = [
  ['L2', 'B', 'Damping - dừng khẩn: robot mềm và khuỵu từ từ'],
  ['L2', 'Y', 'Zero torque - motor không lực'],
  ['L2', 'UP', 'Đứng sẵn sàng (lock stand)'],
  ['L2', 'LEFT', 'Ngồi'],
  ['L2', 'X', 'Nằm ↔ đứng dậy'],
  ['L2', 'A', 'Ngồi xổm ↔ đứng'],
  ['L2', 'R2', 'Chế độ debug (nhường quyền cho SDK)'],
  ['R2', 'A', 'Vào chế độ điều khiển chạy'],
  ['R1', 'X', 'Vào điều khiển chính (R1 + Y với eo 3 DoF)'],
  ['SELECT', 'Y', 'Vẫy tay'],
  ['SELECT', 'A', 'Bắt tay'],
  ['SELECT', 'X', 'Quay người và vẫy'],
  ['START', null, 'Đứng ↔ đi (trong điều khiển chính)'],
  ['F1', 'F3', 'Hiệu chỉnh cần (xoay 2 cần hết cỡ, bấm F3 để lưu)'],
];
const KEYMAP = { a: 'A', b: 'B', x: 'X', y: 'Y', arrowup: 'UP', arrowdown: 'DOWN', arrowleft: 'LEFT', arrowright: 'RIGHT', q: 'L1', e: 'R1', z: 'L2', c: 'R2', enter: 'START', backspace: 'SELECT', '1': 'F1', '3': 'F3' };

export function open() {
  openCloseup({
    title: 'Tay cầm điều khiển G1',
    sub: '2 cần analog · 16 nút · F3 · đèn báo · pin 780 mAh · >100 m · trạng thái gửi vào robot thành 40 byte',
    heading: 'Bấm một nút thì robot nhận được gì',
    camera: { pos: [0, 0.32, 0.26], target: [0, 0, 0.01], min: 0.12, max: 1 },
    autoRotate: false,
    toggle: false,
    steps: [
      ['Bấm / gạt cần', 'tay cầm đọc 16 nút + 2 cần (mỗi cần 2 trục) + cò L2 analog.'],
      ['Gửi không dây', 'tới module thu trên robot (đèn DL sáng khi đã liên kết); có thêm Bluetooth cho điện thoại.'],
      ['Vào bộ điều khiển', 'bộ điều khiển của Unitree đọc tổ hợp phím để đổi chế độ (damp, đứng, đi...) và cần để lấy vận tốc.'],
      ['Vào LowState', 'đúng các byte đó được đẩy vào LowState.wireless_remote[40] và rt/wirelesscontroller.'],
      ['Code của bạn', 'gamepad.hpp giải mã: bit nút + 5 số float, có lọc vùng chết 0.01 và làm mượt 0.03.'],
      ['Dừng khẩn', 'luôn nhớ L2 + B: robot về damp và khuỵu xuống từ từ.'],
    ],
    extra: `
      <h5>40 byte wireless_remote (thật như code nhận)</h5>
      <div data-k="bytes" style="font:11.5px Consolas,monospace;display:grid;grid-template-columns:repeat(8,1fr);gap:3px"></div>
      <dl class="hud" style="margin-top:8px" data-k="decoded"></dl>
      <p class="faint" style="margin:4px 0">Bấm nút trên mô hình hoặc phím: A B X Y · mũi tên · Q=L1 E=R1 Z=L2 C=R2 · Enter=START · Backspace=SELECT · 1=F1 3=F3. Kéo cần bằng chuột.</p>
      <h5>Tổ hợp phím (manual G1)</h5>
      <div data-k="combos"></div>
      <h5>Phần cứng (manual)</h5>
      <dl class="kv">
        <dt>Bộ phận</dt><dd>2 cần (rocker), L1/L2, R1/R2, D-pad, A/B/X/Y, SELECT, START, F1, F3, nút nguồn, cổng USB-C sạc, đèn: nguồn, sạc, kết nối, truyền dữ liệu (DL), Bluetooth</dd>
        <dt>Pin</dt><dd>780 mAh, sạc 5 V 700 mA, ~5 giờ (teardown ghi 4.5 giờ)</dd>
        <dt>Tầm</dt><dd>>100 m nơi thoáng</dd>
        <dt>Bật / tắt</dt><dd>bấm nhanh rồi giữ 2 s: 2 tiếng bíp = bật, 3 tiếng = tắt</dd>
        <dt>Hẹn giờ</dt><dd>không kết nối 10 phút → robot tự tắt</dd>
      </dl>`,
    note: 'Nguồn: manual điều khiển G1 (bản QRE của tài liệu Unitree), unitree_sdk2 gamepad.hpp (bố cục byte), IDL LowState_. Bit 7 tên "F2" trong SDK; trên tay cầm thật nút đó in là F3. Hình 3D theo ảnh sản phẩm, tỉ lệ ước lượng.',
  }, build);
}

function build(ctx) {
  const { scene, add, mat, basic, label, camera, renderer } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  scene.add(root);
  const body = mat(0x2b3038, { roughness: 0.55, metalness: 0.2 });
  // body: centre slab + two grips
  add(root, new THREE.BoxGeometry(0.2, 0.025, 0.095), body, 0, 0, 0);
  for (const sx of [-1, 1]) {
    const grip = add(root, new THREE.CylinderGeometry(0.035, 0.03, 0.03, 24), body, sx * 0.105, -0.002, 0.03);
    grip.scale.set(1, 1, 1.5);
  }
  // phone tray / screen area
  const tray = add(root, new THREE.BoxGeometry(0.11, 0.004, 0.06), mat(0x0d1117, { roughness: 0.3 }), 0, 0.014, -0.005);
  label(tray, 'Khay kẹp điện thoại', [0, 0.01, -0.03], true);

  const buttons = {};
  const pick = [];
  const mk = (name, geo, color, x, y, z, rot) => {
    const m = add(root, geo, mat(color, { roughness: 0.4, emissive: 0x58a6ff, emissiveIntensity: 0 }), x, y, z);
    if (rot) m.rotation.set(...rot);
    m.userData.btn = name;
    buttons[name] = m;
    pick.push(m);
    return m;
  };
  const roundBtn = (r) => new THREE.CylinderGeometry(r, r, 0.006, 20);
  // ABXY (right), D-pad (left)
  const abxy = { Y: [0.11, 0.0, -0.017], A: [0.11, 0.0, 0.017], X: [0.093, 0, 0], B: [0.127, 0, 0] };
  for (const [n, [x, , z]] of Object.entries(abxy)) mk(n, roundBtn(0.0065), 0x484f58, x, 0.015, z);
  const dpad = { UP: [-0.11, -0.017], DOWN: [-0.11, 0.017], LEFT: [-0.127, 0], RIGHT: [-0.093, 0] };
  for (const [n, [x, z]] of Object.entries(dpad)) mk(n, new THREE.BoxGeometry(0.011, 0.006, 0.011), 0x484f58, x, 0.015, z);
  // shoulder keys
  mk('L1', new THREE.BoxGeometry(0.035, 0.008, 0.012), 0x30363d, -0.1, 0.006, -0.05);
  mk('L2', new THREE.BoxGeometry(0.035, 0.012, 0.012), 0x30363d, -0.1, -0.006, -0.054);
  mk('R1', new THREE.BoxGeometry(0.035, 0.008, 0.012), 0x30363d, 0.1, 0.006, -0.05);
  mk('R2', new THREE.BoxGeometry(0.035, 0.012, 0.012), 0x30363d, 0.1, -0.006, -0.054);
  // small keys
  mk('SELECT', new THREE.BoxGeometry(0.012, 0.004, 0.006), 0x484f58, -0.07, 0.014, 0.036);
  mk('F1', new THREE.BoxGeometry(0.012, 0.004, 0.006), 0x484f58, -0.052, 0.014, 0.036);
  mk('F3', new THREE.BoxGeometry(0.012, 0.004, 0.006), 0x484f58, 0.052, 0.014, 0.036);
  mk('START', new THREE.BoxGeometry(0.012, 0.004, 0.006), 0x484f58, 0.07, 0.014, 0.036);
  // sticks
  const sticks = {};
  for (const [n, x] of [['left', -0.075], ['right', 0.075]]) {
    const base = add(root, new THREE.CylinderGeometry(0.016, 0.018, 0.006, 24), mat(0x161b22), x, 0.015, -0.03);
    const knob = new THREE.Group();
    knob.position.set(x, 0.018, -0.03);
    root.add(knob);
    const cap = add(knob, new THREE.CylinderGeometry(0.011, 0.009, 0.014, 20), mat(0x484f58, { roughness: 0.6 }), 0, 0.009, 0);
    cap.userData.stick = n;
    pick.push(cap);
    sticks[n] = { knob, x: 0, y: 0 };
    label(base, n === 'left' ? 'Cần trái: tiến/lùi + ngang (ly, lx)' : 'Cần phải: quay (rx, ry)', [0, 0.02, -0.02], true);
  }
  // LEDs + USB-C + power key
  const leds = [-0.012, -0.004, 0.004, 0.012].map((x) => add(root, new THREE.BoxGeometry(0.003, 0.002, 0.002), basic(0x3fb950), x, 0.013, 0.04));
  label(leds[0], 'Đèn: nguồn · sạc · DL · Bluetooth', [0, 0.004, 0.006]);
  const usb = add(root, new THREE.BoxGeometry(0.009, 0.003, 0.002), mat(0x8b949e, { metalness: 0.9 }), 0, 0.0, -0.048);
  label(usb, 'USB-C sạc', [0, 0, -0.004]);
  const power = add(root, new THREE.CylinderGeometry(0.003, 0.003, 0.004, 12), mat(0xf85149), 0, 0.014, 0.03);
  label(power, 'Nút nguồn', [0, 0.004, 0]);
  label(buttons.A, 'A B X Y', [0, 0.01, 0.012]);
  label(buttons.UP, 'D-pad', [0, 0.01, -0.012]);
  label(buttons.L2, 'L1 / L2', [0, 0, -0.01]);
  label(buttons.R2, 'R1 / R2', [0, 0, -0.01]);
  label(buttons.SELECT, 'SELECT · F1', [0, 0.006, 0.008]);
  label(buttons.START, 'F3 · START', [0, 0.006, 0.008]);

  // ---- input
  const pressed = new Set();
  const sticky = new Set();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let dragging = null;
  let dragStart = null;
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (ev) => {
    const r = cv.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pick, false)[0];
    if (!hit) return;
    ctx.controls.enabled = false;
    if (hit.object.userData.btn) { const b = hit.object.userData.btn; if (sticky.has(b)) sticky.delete(b); else sticky.add(b); }
    if (hit.object.userData.stick) { dragging = sticks[hit.object.userData.stick]; dragStart = [ev.clientX, ev.clientY]; }
  }, { signal: ctx.signal });
  window.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    dragging.x = Math.max(-1, Math.min(1, (ev.clientX - dragStart[0]) / 60));
    dragging.y = Math.max(-1, Math.min(1, -(ev.clientY - dragStart[1]) / 60));
  }, { signal: ctx.signal });
  window.addEventListener('pointerup', () => { if (dragging) { dragging.x = 0; dragging.y = 0; } dragging = null; ctx.controls.enabled = true; }, { signal: ctx.signal });
  window.addEventListener('keydown', (ev) => { const b = KEYMAP[ev.key.toLowerCase()]; if (b) { pressed.add(b); ev.preventDefault(); } }, { signal: ctx.signal });
  window.addEventListener('keyup', (ev) => { const b = KEYMAP[ev.key.toLowerCase()]; if (b) pressed.delete(b); }, { signal: ctx.signal });

  // ---- combos list
  const combosEl = qs('[data-k="combos"]');
  combosEl.innerHTML = COMBOS.map(([a, b, t], i) => `<div class="fn-item" data-combo="${i}" style="cursor:pointer;padding:4px 0">
    <b>${a}${b ? ` + ${b}` : ''}</b> <span class="muted">${t}</span></div>`).join('');
  let demo = null;
  for (const el of combosEl.querySelectorAll('[data-combo]')) {
    el.addEventListener('click', () => { demo = { combo: COMBOS[Number(el.dataset.combo)], at: performance.now() / 1000 }; }, { signal: ctx.signal });
  }

  const bytesEl = qs('[data-k="bytes"]');
  const decEl = qs('[data-k="decoded"]');
  const buf = new ArrayBuffer(40);
  const dv = new DataView(buf);
  return {
    update(now) {
      const active = new Set([...pressed, ...sticky]);
      let activeCombo = null;
      if (demo && now - demo.at < 1.6) { activeCombo = demo.combo; active.add(demo.combo[0]); if (demo.combo[1]) active.add(demo.combo[1]); }
      for (const [n, m] of Object.entries(buttons)) {
        const onB = active.has(n);
        m.material.emissiveIntensity = onB ? 1.4 : 0;
        m.position.y = (m.userData.y0 ??= m.position.y) - (onB ? 0.002 : 0);
      }
      for (const s of Object.values(sticks)) s.knob.rotation.set(s.y * 0.35, 0, -s.x * 0.35);
      // pack exactly like xRockerBtnDataStruct
      dv.setUint8(0, 0); dv.setUint8(1, 0);               // head: content not documented in the SDK, left at 0
      let bits = 0;
      BITS.forEach((b, i) => { if (active.has(b === 'F2' ? 'F3' : b)) bits |= 1 << i; });
      dv.setUint16(2, bits, true);
      const L2a = active.has('L2') ? 1 : 0;
      [sticks.left.x, sticks.right.x, sticks.right.y, L2a, sticks.left.y].forEach((f, i) => dv.setFloat32(4 + i * 4, f, true));
      const u8 = new Uint8Array(buf);
      bytesEl.innerHTML = [...u8].map((b, i) => {
        const role = i < 2 ? 'head' : i < 4 ? 'btn' : i < 24 ? 'float' : 'idle';
        const col = { head: '#6b7683', btn: '#ffa657', float: '#79c0ff', idle: '#30363d' }[role];
        return `<span title="byte ${i} · ${role}" style="padding:2px;border-radius:3px;text-align:center;background:#0d1218;color:${b ? col : '#3d444d'}">${b.toString(16).padStart(2, '0')}</span>`;
      }).join('');
      decEl.innerHTML = `<dt>btn (bit 0–15)</dt><dd>${BITS.filter((b, i) => bits & (1 << i)).join(' + ') || '-'}  <span class="faint">0x${bits.toString(16).padStart(4, '0')}</span></dd>
        <dt>lx · ly</dt><dd>${sticks.left.x.toFixed(2)} · ${sticks.left.y.toFixed(2)}</dd>
        <dt>rx · ry</dt><dd>${sticks.right.x.toFixed(2)} · ${sticks.right.y.toFixed(2)}</dd>
        <dt>L2 (analog)</dt><dd>${L2a.toFixed(2)}</dd>
        ${activeCombo ? `<dt>Robot sẽ</dt><dd style="color:#7ee787">${activeCombo[2]}</dd>` : ''}`;
      const step = activeCombo ? 2 : (bits || sticks.left.x || sticks.left.y || sticks.right.x) ? 3 : Math.floor((now % 12) / 2);
      ctx.setActiveStep(step);
    },
  };
}

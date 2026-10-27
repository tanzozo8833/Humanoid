// Close-up of the electrical interface on the back of the G1's neck, from the G1 developer docs
// ("Electrical Interface", mirrored at docs.quadruped.de): 3 XT30UPB-F power outputs (VBAT, 24 V,
// 12 V), 2 Gigabit RJ45, 3 USB-C 3.0 host, 1 USB-C with DisplayPort Alt Mode, a 5577 I/O power
// connector and 6 GPIO pins wired to the Jetson Orin NX module. The panel layout (order and
// spacing of the connectors) is drawn from the table, not from a mechanical drawing.
// Hovering a row in the side panel lights the matching connector, and the reverse.
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const PORTS = [
  { id: 1, name: 'XT30 · VBAT', spec: 'nối thẳng pin (39 – 54.6 V)', kind: 'xt30', color: 0xf85149 },
  { id: 2, name: 'XT30 · 24 V', spec: '24 V / 5 A', kind: 'xt30', color: 0xd29922 },
  { id: 3, name: 'XT30 · 12 V', spec: '12 V / 5 A', kind: 'xt30', color: 0xe3b341 },
  { id: 4, name: 'RJ45 · Gigabit', spec: '1000BASE-T, mạng 192.168.123.x', kind: 'rj45', color: 0x58a6ff },
  { id: 5, name: 'RJ45 · Gigabit', spec: '1000BASE-T', kind: 'rj45', color: 0x58a6ff },
  { id: 6, name: 'USB-C · USB 3.0 host', spec: 'cấp 5 V / 1.5 A', kind: 'usbc', color: 0xbc8cff },
  { id: 7, name: 'USB-C · USB 3.0 host', spec: 'cấp 5 V / 1.5 A', kind: 'usbc', color: 0xbc8cff },
  { id: 8, name: 'USB-C · USB 3.0 host', spec: 'cấp 5 V / 1.5 A', kind: 'usbc', color: 0xbc8cff },
  { id: 9, name: 'USB-C · Alt Mode', spec: 'USB 3.2 + DisplayPort 1.4 (cắm màn hình)', kind: 'usbc', color: 0x3fb950 },
  { id: 10, name: '5577 · I/O OUT', spec: '12 V / 3 A', kind: 'molex', color: 0xffa657 },
];
const GPIO = [['GPIO1', '203', 'UART1_TXD'], ['GPIO2', '205', 'UART1_RXD'], ['GPIO3', '232', 'I2C2_SCL'], ['GPIO4', '234', 'I2C2_SDA'], ['GPIO5', '128', 'GPIO'], ['GPIO6', '130', 'GPIO']];

export function open() {
  openCloseup({
    title: 'Cổng mở rộng sau gáy G1',
    sub: 'Gắn thêm thiết bị: nguồn từ pin, mạng Gigabit, USB-C, màn hình, GPIO của Jetson',
    heading: 'Mỗi cổng dùng để làm gì',
    camera: { pos: [0.0, 0.05, 0.3], target: [0, 0, 0], min: 0.08, max: 1 },
    autoRotate: false,
    toggle: false,
    steps: [
      ['Nguồn VBAT', 'lấy thẳng điện áp pin (~39–54.6 V) cho thiết bị chịu được dải này.'],
      ['Nguồn 24 V / 12 V', 'đã hạ áp sẵn, mỗi đường tối đa 5 A - cấp cho camera, tay gắp, máy tính phụ.'],
      ['Gigabit Ethernet', 'cắm laptop vào mạng nội bộ robot (đặt IP tĩnh 192.168.123.x, ví dụ .99) để dùng SDK / ROS 2.'],
      ['USB-C 3.0', 'gắn camera, micro, USB ngoài vào Jetson; mỗi cổng cấp 5 V 1.5 A.'],
      ['USB-C Alt Mode', 'USB 3.2 + DisplayPort 1.4 - cắm màn hình để làm việc trực tiếp trên Jetson.'],
      ['I/O + GPIO', 'đầu 5577 cấp 12 V 3 A; 6 chân GPIO nối thẳng module Orin NX: UART1, I2C2, 2 GPIO.'],
    ],
    extra: `
      <h5>Bảng cổng (tài liệu G1)</h5>
      <table class="joints"><thead><tr><th>#</th><th>Cổng</th><th>Thông số</th></tr></thead><tbody>
        ${PORTS.map((p) => `<tr data-port="${p.id}"><td class="faint">${p.id}</td><td><span class="motor-dot" style="background:#${p.color.toString(16).padStart(6, '0')}"></span>${p.name}</td><td class="muted">${p.spec}</td></tr>`).join('')}
      </tbody></table>
      <h5>GPIO (chân của module Orin NX)</h5>
      <table class="joints"><thead><tr><th>Chân</th><th>Pin NX</th><th>Chức năng</th></tr></thead><tbody>
        ${GPIO.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td class="muted">${c}</td></tr>`).join('')}
      </tbody></table>`,
    note: 'Nguồn: mục "Electrical Interface" của tài liệu developer G1 (bản QRE docs.quadruped.de). Vị trí: mặt sau cổ. Thứ tự và khoảng cách các đầu cắm trên tấm là minh hoạ.',
  }, build);
}

function build(ctx) {
  const { scene, add, mat, basic, label } = ctx;
  const root = new THREE.Group();
  scene.add(root);
  add(root, new THREE.BoxGeometry(0.22, 0.07, 0.006), mat(0x2b3038, { roughness: 0.6 }), 0, 0, -0.004);
  const meshes = {};
  const make = (p, x, y) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    root.add(g);
    let body;
    if (p.kind === 'xt30') {
      body = add(g, new THREE.BoxGeometry(0.012, 0.0065, 0.008), mat(0xe3b341, { roughness: 0.5 }));
      for (const dx of [-0.0025, 0.0025]) add(g, new THREE.CylinderGeometry(0.0013, 0.0013, 0.004, 10), mat(0x0d1117), dx, 0, 0.003).rotation.x = Math.PI / 2;
    } else if (p.kind === 'rj45') {
      body = add(g, new THREE.BoxGeometry(0.016, 0.0135, 0.01), mat(0xc9d1d9, { metalness: 0.8 }));
      add(g, new THREE.BoxGeometry(0.012, 0.009, 0.002), mat(0x0d1117), 0, -0.001, 0.005);
    } else if (p.kind === 'usbc') {
      body = add(g, new THREE.CapsuleGeometry(0.0016, 0.0058, 4, 12), mat(0xc9d1d9, { metalness: 0.9 }));
      body.rotation.z = Math.PI / 2;
    } else {
      body = add(g, new THREE.BoxGeometry(0.011, 0.009, 0.007), mat(0xf0f3f6, { roughness: 0.6 }));
    }
    const glow = add(g, new THREE.BoxGeometry(0.02, 0.02, 0.001), basic(p.color, { transparent: true, opacity: 0 }), 0, 0, -0.001);
    meshes[p.id] = { g, glow };
    label(body, `${p.id}`, [0, 0.012, 0], true);
  };
  const xs = [-0.095, -0.077, -0.059, -0.035, -0.012, 0.01, 0.024, 0.038, 0.052, 0.075];
  PORTS.forEach((p, i) => make(p, xs[i], 0.012));
  // GPIO header
  const hdr = new THREE.Group();
  hdr.position.set(-0.01, -0.02, 0);
  root.add(hdr);
  for (let i = 0; i < 6; i += 1) add(hdr, new THREE.CylinderGeometry(0.0006, 0.0006, 0.008, 6), mat(0xe3b341, { metalness: 1 }), -0.00625 + i * 0.0025, 0, 0.004).rotation.x = Math.PI / 2;
  add(hdr, new THREE.BoxGeometry(0.017, 0.003, 0.003), mat(0x0d1117));
  label(hdr, 'GPIO 1–6 → Orin NX', [0, -0.006, 0], true);
  label(meshes[1].g, 'Nguồn', [0.018, 0.02, 0], true);
  label(meshes[4].g, 'Mạng', [0.011, 0.02, 0], true);
  label(meshes[7].g, 'USB-C', [0.007, 0.02, 0], true);

  // hover table rows <-> connectors
  let active = null;
  for (const tr of ctx.dom.panel.querySelectorAll('tr[data-port]')) {
    tr.addEventListener('mouseenter', () => { active = Number(tr.dataset.port); }, { signal: ctx.signal });
    tr.addEventListener('mouseleave', () => { active = null; }, { signal: ctx.signal });
  }
  return {
    update(now) {
      const auto = Math.floor(now / 1.5) % PORTS.length + 1;
      const on = active ?? auto;
      for (const [id, m] of Object.entries(meshes)) m.glow.material.opacity = Number(id) === on ? 0.5 + 0.3 * Math.sin(now * 6) : 0;
      const idx = on <= 1 ? 0 : on <= 3 ? 1 : on <= 5 ? 2 : on <= 8 ? 3 : on === 9 ? 4 : 5;
      ctx.setActiveStep(idx);
    },
  };
}

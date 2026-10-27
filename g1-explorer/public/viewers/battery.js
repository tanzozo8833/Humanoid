// Close-up of the G1 battery: 13S lithium pack, 9000 mAh, quick-release, charged at 54 V 5 A
// (unitree.com/g1). Cell format and parallel count are not published - drawn as 13S3P of
// 18650-size cells (3 x 3 Ah = 9 Ah), flagged as illustrative. The BMS balances the 13 series
// groups; the animation runs a discharge (walking ~200 W) and a charge with balancing.
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const SERIES = 13;
const PARALLEL = 3;
const CAP_AH = 9;

export function open() {
  openCloseup({
    title: 'Pin G1 - 13S lithium 9000 mAh',
    sub: '46.8 V danh định · 0.42 kWh · ~2.5 kg · tháo nhanh · chạy 1–2 giờ · BMS báo về qua BmsState_',
    heading: 'Bên trong khối pin',
    camera: { pos: [0.3, 0.22, 0.32], target: [0, 0.0, 0], min: 0.1, max: 1.5 },
    steps: [
      ['13 nhóm nối tiếp', 'mỗi nhóm 3.0 – 4.2 V → cả pack 39 – 54.6 V (danh định 13 × 3.6 = 46.8 V).'],
      ['Song song trong nhóm', 'nhiều cell song song để đủ 9 Ah (ở đây vẽ 3 cell × 3 Ah).'],
      ['BMS đo', 'đo áp từng cell (cell_vol[]), 12 nhiệt độ NTC, dòng, SOC/SOH, số chu kỳ - các trường của BmsState_ trong SDK.'],
      ['Cân bằng', 'khi sạc, nhóm nào đầy trước thì BMS xả bớt qua điện trở để các nhóm bằng nhau.'],
      ['Bảo vệ', 'MOSFET + cầu chì cắt khi quá dòng, quá nhiệt, quá xả.'],
      ['Ra robot', 'đầu nối pin cắm vào mainboard: nguồn + dây phản hồi BMS; mainboard chia nguồn qua các chuỗi XT30 tới từng khớp.'],
    ],
    extra: `
      <h5>Mô phỏng</h5>
      <dl class="hud">
        <dt>Trạng thái</dt><dd data-k="mode">-</dd>
        <dt>Mức pin</dt><dd data-k="soc">-</dd>
        <dt>Điện áp pack</dt><dd data-k="v">-</dd>
        <dt>Dòng</dt><dd data-k="i">-</dd>
      </dl>
      <canvas data-k="cells" width="360" height="110" style="width:100%;margin-top:8px;background:#0d1218;border:1px solid var(--line);border-radius:8px"></canvas>
      <h5>Tính từ thông số Unitree</h5>
      <dl class="kv">
        <dt>Năng lượng</dt><dd>9 Ah × 46.8 V = 0.42 kWh (teardown ghi đúng 0.42 kWh)</dd>
        <dt>Công suất TB</dt><dd>0.42 kWh / 1–2 h ≈ 210–420 W</dd>
        <dt>Thời gian sạc</dt><dd>9 Ah / 5.5 A ≈ 1.6 h + pha áp không đổi</dd>
        <dt>Khối lượng</dt><dd>~2.5 kg ≈ 7% khối lượng robot</dd>
      </dl>
      <h5>BmsState_ (unitree_sdk2)</h5>
      <dl class="kv">
        <dt>cell_vol[40]</dt><dd>áp từng cell (mV)</dd><dt>temperature[12]</dt><dd>12 điểm nhiệt</dd>
        <dt>current</dt><dd>dòng (+ sạc / − xả)</dd><dt>soc / soh</dt><dd>% pin còn / % sức khoẻ pin</dd>
        <dt>cycle</dt><dd>số chu kỳ sạc</dd><dt>bmsvoltage[3], bmsstate[5]</dt><dd>áp tổng + cờ trạng thái / lỗi</dd>
      </dl>`,
    note: 'Số liệu: báo cáo tháo rời 中邮证券 (46.8 V, 0.42 kWh, 2.5 kg, ảnh pin + khoang pin), unitree.com/g1, manual (sạc 54.6 V 5.5 A), unitree_sdk2 (BmsState_). Loại cell và số cell song song chưa có ảnh tháo pin - vẽ 13S3P cell 18650 là giả định.',
  }, build);
}

function build(ctx) {
  const { scene, add, mat, label, fade } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  scene.add(root);
  const caseMat = fade(mat(0x2b3038, { metalness: 0.4, roughness: 0.5 }), 0.1);
  add(root, new THREE.BoxGeometry(0.075, 0.16, 0.25), caseMat, 0, 0, 0);
  const cellGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.065, 16);
  const groups = [];
  for (let s = 0; s < SERIES; s += 1) {
    const g = { cells: [], soc: 0.85 + Math.random() * 0.06 };
    for (let p = 0; p < PARALLEL; p += 1) {
      const c = add(root, cellGeo, mat(0x2f6fd0, { metalness: 0.6, roughness: 0.3, emissive: 0x2f6fd0, emissiveIntensity: 0.1 }),
        0, -0.06 + p * 0.02 + (s % 2) * 0.01, -0.11 + s * 0.018);
      c.rotation.z = Math.PI / 2;
      g.cells.push(c);
    }
    groups.push(g);
  }
  // series busbars
  for (let s = 0; s < SERIES - 1; s += 1) add(root, new THREE.BoxGeometry(0.002, 0.07, 0.02), mat(0xb1bac4, { metalness: 0.9 }), (s % 2 ? 1 : -1) * 0.034, -0.035, -0.101 + s * 0.018);
  const bms = add(root, new THREE.BoxGeometry(0.06, 0.003, 0.2), mat(0x1a7f37, { roughness: 0.7 }), 0, 0.045, 0);
  const fets = add(root, new THREE.BoxGeometry(0.02, 0.004, 0.02), mat(0x0d1117), 0.015, 0.049, 0.08);
  const conn = add(root, new THREE.BoxGeometry(0.03, 0.03, 0.02), mat(0xd29922, { metalness: 0.5 }), 0, 0.06, 0.13);
  // outer face (photo): two finger grips, 4 level LEDs, power switch; vents on the side
  const face = add(root, new THREE.BoxGeometry(0.077, 0.162, 0.004), mat(0x8b949e, { roughness: 0.6 }), 0, 0, -0.127);
  const grips = [-0.045, 0.045].map((y) => add(root, new THREE.BoxGeometry(0.03, 0.03, 0.006), mat(0x484f58), 0, y, -0.13));
  for (let i = 0; i < 4; i += 1) add(root, new THREE.BoxGeometry(0.003, 0.003, 0.003), mat(0x3fb950, { emissive: 0x3fb950, emissiveIntensity: 2 }), 0, -0.012 + i * 0.008, -0.13);
  const sw = add(root, new THREE.CylinderGeometry(0.004, 0.004, 0.004, 16), mat(0xd0d7de), 0.025, 0, -0.13);
  sw.rotation.x = Math.PI / 2;
  label(grips[0], 'Lẫy kéo', [0, 0, -0.01]);
  label(face, '4 LED mức pin', [0, 0.0, -0.01]);
  label(sw, 'Công tắc nguồn', [0, 0, -0.008]);
  fade(face.material, 0.2);
  const balancers = groups.map((g, s) => add(root, new THREE.BoxGeometry(0.004, 0.003, 0.006), mat(0x6e7681, { emissive: 0xff7b00, emissiveIntensity: 0 }), -0.02, 0.048, -0.11 + s * 0.018));
  label(groups[0].cells[2], 'Nhóm cell 1 (3 song song)', [0, 0, 0]);
  label(groups[12].cells[2], 'Nhóm 13', [0, 0, 0]);
  label(bms, 'BMS', [0, 0.003, -0.05]);
  label(fets, 'MOSFET bảo vệ + cầu chì', [0, 0.003, 0]);
  label(conn, 'Đầu nối tháo nhanh', [0, 0.018, 0]);
  label(balancers[6], 'Điện trở cân bằng', [0, 0.003, 0]);

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['mode', 'soc', 'v', 'i', 'cells'].map((k) => [k, el(k)]));
  const g2 = ui.cells.getContext('2d');
  const ocv = (soc) => 3.0 + 1.2 * (0.12 + 0.88 * soc) - 0.15 * Math.exp(-soc * 12);   // rough Li-ion OCV curve
  let charging = false;
  return {
    update(now, dt, e) {
      const rate = dt * 0.05;
      const mean = groups.reduce((a, g) => a + g.soc, 0) / SERIES;
      if (!charging && mean < 0.25) charging = true;
      if (charging && Math.min(...groups.map((g) => g.soc)) > 0.97) charging = false;
      const current = charging ? -5 : 210 / (ocv(mean) * SERIES);
      for (const [s, g] of groups.entries()) {
        const imbalance = 1 + (s % 4 === 1 ? 0.06 : 0) - (s % 5 === 2 ? 0.04 : 0);
        if (charging) {
          const balancing = g.soc > 0.95 && g.soc - Math.min(...groups.map((x) => x.soc)) > 0.01;
          g.soc = Math.min(1, g.soc + rate * imbalance * (balancing ? 0 : 1) - (balancing ? rate * 0.3 : 0));
          balancers[s].material.emissiveIntensity = balancing ? 1.5 : 0;
        } else {
          g.soc = Math.max(0, g.soc - rate * imbalance);
          balancers[s].material.emissiveIntensity = 0;
        }
        const col = new THREE.Color().setHSL(0.33 * g.soc, 0.8, 0.45);
        for (const c of g.cells) { c.material.color.copy(col); c.material.emissive.copy(col); c.material.emissiveIntensity = 0.25; }
      }
      const v = groups.reduce((a, g) => a + ocv(g.soc), 0);
      ui.mode.textContent = charging ? 'đang sạc 54 V 5 A' : 'đang chạy (~210 W)';
      ui.soc.textContent = `${Math.round(mean * 100)}%`;
      ui.v.textContent = `${v.toFixed(1)} V (13 × ${(v / SERIES).toFixed(2)} V)`;
      ui.i.textContent = `${current.toFixed(1)} A ${charging ? 'vào' : 'ra'}`;
      g2.clearRect(0, 0, 360, 110);
      g2.font = '10px Segoe UI';
      groups.forEach((g, s) => {
        const vv = ocv(g.soc);
        const hh = (vv - 3.0) / 1.2 * 80;
        g2.fillStyle = `hsl(${120 * g.soc},80%,45%)`;
        g2.fillRect(8 + s * 27, 92 - hh, 20, hh);
        g2.fillStyle = '#8b949e';
        g2.fillText(`${s + 1}`, 13 + s * 27, 106);
      });
      g2.fillText('điện áp từng nhóm (3.0 – 4.2 V)', 8, 10);
      const step = charging ? (balancers.some((b) => b.material.emissiveIntensity > 0) ? 3 : 2) : (Math.floor(now / 2) % 3 === 0 ? 0 : Math.floor(now / 2) % 3 === 1 ? 5 : 4);
      ctx.setActiveStep(e < 0.3 ? -1 : step);
    },
  };
}

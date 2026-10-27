// Close-up of the G1 torso opened from the back, as in the teardown photos (中邮证券 p.26-28, 36, 39;
// arXiv 2509.14096 fig. 2.3-2.6): the back is closed by three layers (outer shell, cushioning foam,
// inner plastic liner) which peel off as it opens; under them sits the mainboard (PC1: RK3588S under
// an aluminium heatsink, 2 BIWIN RAM, FORESEE eMMC, shielded WiFi/BT module, power stage, rows of
// JST connectors) with a blower fan; on the EDU the Jetson Orin NX sits above it with a copper heat
// pipe and its own fan. The battery slides in from the side. Every cable group the teardown labels
// on the mainboard is drawn and named. The shell is the real torso_link mesh; inner positions are
// read off the photos and are estimates.
import * as THREE from 'three';
import { openCloseup, cloneLinkVisual, textTexture } from '/closeup-shell.js';

const CONNECTORS = [
  // [label, connector position on the board (torso frame), cable end, colour]
  ['Pin: nguồn + phản hồi BMS', [-0.0605, 0.045, 0.095], [0.0, 0.07, 0.09], 0xf85149],
  ['Chân: nguồn XT30 + CAN', [-0.0605, 0.0, 0.088], [-0.02, 0.0, -0.01], 0xffa657],
  ['Tay trái: nguồn + CAN', [-0.0605, 0.06, 0.16], [0.0, 0.1, 0.245], 0xffa657],
  ['Tay phải: nguồn + CAN', [-0.0605, -0.06, 0.16], [0.0, -0.1, 0.245], 0xffa657],
  ['Nguồn đầu', [-0.0605, -0.03, 0.19], [-0.02, -0.01, 0.31], 0xd29922],
  ['LiDAR', [-0.0605, -0.012, 0.19], [-0.02, 0.0, 0.31], 0x3fb950],
  ['Camera chiều sâu', [-0.0605, 0.006, 0.19], [-0.02, 0.01, 0.31], 0x58a6ff],
  ['Micro', [-0.0605, 0.024, 0.19], [0.06, 0.0, 0.33], 0xa5d6ff],
  ['LED đầu', [-0.0605, 0.04, 0.19], [-0.02, 0.02, 0.31], 0xff7b72],
];

export function open(o) {
  openCloseup({
    title: 'Thân G1 - mở lưng ra',
    sub: 'Vỏ thân thật (URDF) · 3 lớp che lưng · mainboard RK3588S · Jetson Orin NX (EDU) · pin cắm bên sườn · trung tâm dây',
    heading: 'Bên trong thân có gì',
    camera: { pos: [-0.56, 0.16, 0.2], target: [-0.04, 0.0, 0], min: 0.1, max: 2 },
    steps: [
      ['3 lớp che lưng', 'vỏ nhựa ngoài + mút xốp đệm (hình tổ ong) + tấm nhựa lót: bảo vệ mainboard khi robot ngã ngửa.'],
      ['Mainboard (PC1)', 'RK3588S dưới tản nhôm, 8 GB RAM, eMMC 64 GB, module WiFi/BT, tầng công suất - chạy điều khiển của Unitree.'],
      ['Jetson (PC2, EDU)', 'Orin NX đặt phía trên mainboard, nhiệt đi qua ống đồng ra quạt riêng.'],
      ['Pin', 'khối 13S 2.5 kg trượt vào khoang từ bên sườn, khoá bằng lẫy; công tắc hướng ra sau.'],
      ['Trung tâm dây', 'mọi nhánh cắm về mainboard: pin, chân, 2 tay (nguồn XT30 + CAN), đầu, LiDAR, camera, micro, LED, quạt.'],
      ['Tản nhiệt', 'quạt ly tâm thổi qua tản nhôm; bản EDU thêm ống đồng + tấm VC. NTC đo nhiệt SoC.'],
    ],
    extra: `
      <h5>Đầu cắm trên mainboard (nhãn trong ảnh tháo rời)</h5>
      <ul class="inside">${CONNECTORS.map(([n]) => `<li><b>${n}</b></li>`).join('')}<li><b>Quạt</b></li></ul>
      <h5>Chip đọc được trên mainboard</h5>
      <dl class="kv">
        <dt>SoC</dt><dd>Rockchip RK3588S (8 nm, 4×A76 + 4×A55, Mali-G610, NPU 6 TOPS)</dd>
        <dt>RAM</dt><dd>2 × BIWIN BMW2CX32H2A-32G-X (8 GB)</dd>
        <dt>Lưu trữ</dt><dd>FORESEE FEMDNN064G-58AAA (eMMC 64 GB)</dd>
        <dt>Còn lại</dt><dd>bị xoá nhãn (chống sao chép)</dd>
      </dl>
      <div class="closeup-buttons"><button type="button" class="btn small" data-k="edu">Bản EDU (có Jetson): bật</button></div>`,
    note: 'Vỏ: mesh torso_link của URDF. Bố trí bên trong đọc từ ảnh tháo rời 中邮证券 (tr.26–28, 36, 39) và arXiv 2509.14096 - vị trí và kích thước là ước lượng; phía sườn cắm pin chưa xác định (vẽ bên trái).',
  }, (ctx) => build(ctx, o));
}

function build(ctx, o) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const ros = new THREE.Group();
  ros.rotation.x = -Math.PI / 2;
  scene.add(ros);
  const T = new THREE.Group();                      // torso_link frame
  T.position.set(0, 0, -0.15);
  ros.add(T);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const shellMat = fade(mat(0xc4cad3, { metalness: 0.2, roughness: 0.45, side: THREE.FrontSide }), 0.035);
  T.add(cloneLinkVisual(o.links?.torso_link, shellMat));

  // ---- three back layers that peel off backwards (-x)
  const layers = [
    ['Vỏ lưng (nhựa)', 0x8b949e, -0.075, 0.003],
    ['Mút xốp đệm', 0x161b22, -0.071, 0.004],
    ['Tấm nhựa lót', 0x484f58, -0.067, 0.002],
  ].map(([name, color, x, th], i) => {
    const m = add(T, new THREE.BoxGeometry(th, 0.17, 0.2), mat(color, { roughness: 0.8, transparent: true }), x, 0, 0.14);
    if (i === 1) {
      const tex = textTexture([' ⬡ ⬡ ⬡ ⬡ ⬡ ⬡', '⬡ ⬡ ⬡ ⬡ ⬡ ⬡', ' ⬡ ⬡ ⬡ ⬡ ⬡ ⬡', '⬡ ⬡ ⬡ ⬡ ⬡ ⬡'], { bg: '#161b22', fg: '#30363d', font: 26 });
      m.material.map = tex;
    }
    label(m, name, [-0.01, 0, 0.11 - i * 0.02], true);
    return { m, x, dy: 0.42 + i * 0.08 };
  });

  // ---- mainboard (PC1)
  const board = add(T, new THREE.BoxGeometry(0.003, 0.15, 0.11), mat(0x16352a, { roughness: 0.7 }), -0.056, 0, 0.14);   // parts face the back
  label(board, 'Mainboard PC1', [0, 0.07, 0.06]);
  const heatsink = new THREE.Group();
  heatsink.position.set(-0.064, -0.015, 0.13);
  T.add(heatsink);
  add(heatsink, new THREE.BoxGeometry(0.004, 0.06, 0.05), mat(0xc9d1d9, { metalness: 0.85, roughness: 0.3 }));
  for (let i = 0; i < 9; i += 1) add(heatsink, new THREE.BoxGeometry(0.008, 0.002, 0.05), mat(0xc9d1d9, { metalness: 0.85, roughness: 0.3 }), -0.005, -0.027 + i * 0.0068, 0);
  label(heatsink, 'Tản nhôm trên RK3588S', [-0.01, 0, 0.03]);
  const soc = add(T, new THREE.BoxGeometry(0.002, 0.018, 0.018), mat(0x30363d, { metalness: 0.6 }), -0.0585, -0.015, 0.13);
  label(soc, 'RK3588S (dưới tản)', [-0.012, 0, -0.012]);
  const rams = [0.02, 0.035].map((y) => add(T, new THREE.BoxGeometry(0.002, 0.012, 0.01), mat(0x0d1117), -0.0585, y, 0.15));
  label(rams[0], 'RAM BIWIN 2 × 4 GB', [-0.003, 0.005, 0.008]);
  const emmc = add(T, new THREE.BoxGeometry(0.002, 0.012, 0.012), mat(0x0d1117), -0.0585, 0.03, 0.118);
  label(emmc, 'eMMC FORESEE 64 GB', [-0.003, 0.008, -0.006]);
  const wifi = add(T, new THREE.BoxGeometry(0.003, 0.016, 0.02), mat(0xb1bac4, { metalness: 0.9 }), -0.059, -0.055, 0.12);
  label(wifi, 'Module WiFi 6 / BT 5.2 (chắn nhiễu)', [-0.003, 0, -0.012]);
  for (let i = 0; i < 4; i += 1) add(T, new THREE.CylinderGeometry(0.004, 0.004, 0.01, 12), mat(0x30363d), -0.063, -0.06 + i * 0.01, 0.175).rotation.z = Math.PI / 2;
  const caps = add(T, new THREE.BoxGeometry(0.001, 0.001, 0.001), mat(0x000000), -0.063, -0.045, 0.175);
  label(caps, 'Tầng công suất + tụ lọc', [-0.006, 0, 0.012]);

  // blower fan for the board
  const fan = new THREE.Group();
  fan.position.set(-0.064, 0.045, 0.165);
  fan.rotation.z = Math.PI / 2;
  T.add(fan);
  add(fan, new THREE.CylinderGeometry(0.022, 0.022, 0.01, 24), mat(0x30363d, { transparent: true, opacity: 0.85 }));
  const blades = new THREE.Group();
  fan.add(blades);
  for (let i = 0; i < 11; i += 1) {
    const b = add(blades, new THREE.BoxGeometry(0.012, 0.008, 0.001), mat(0x79c0ff, { emissive: 0x79c0ff, emissiveIntensity: 0.5 }), Math.cos(i * 0.571) * 0.013, 0, Math.sin(i * 0.571) * 0.013);
    b.rotation.y = -i * 0.571 + 0.5;
  }
  label(fan, 'Quạt ly tâm', [0, 0.012, 0]);

  // ---- Jetson Orin NX (EDU) above the board, copper heat pipe + own fan
  const edu = new THREE.Group();
  T.add(edu);
  const jet = add(edu, new THREE.BoxGeometry(0.008, 0.07, 0.045), mat(0x2b3038, { metalness: 0.5 }), -0.061, -0.015, 0.235);
  const jetTop = add(edu, new THREE.PlaneGeometry(0.06, 0.035), new THREE.MeshBasicMaterial({ map: textTexture(['NVIDIA', 'JETSON ORIN NX'], { font: 26, bg: '#2b3038', fg: '#76b900' }) }), -0.0655, -0.015, 0.235);
  // face the back (-x), text up = +z, reading left-to-right = -y when seen from behind
  jetTop.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, -1, 0), V(0, 0, 1), V(-1, 0, 0)));
  const pipe = new THREE.CatmullRomCurve3([V(-0.067, -0.04, 0.24), V(-0.068, 0.0, 0.245), V(-0.067, 0.04, 0.235), V(-0.066, 0.055, 0.225)]);
  add(edu, new THREE.TubeGeometry(pipe, 30, 0.0035, 10), mat(0xc87533, { metalness: 0.9, roughness: 0.25 }));
  const fan2 = new THREE.Group();
  fan2.position.set(-0.066, 0.055, 0.225);
  fan2.rotation.z = Math.PI / 2;
  edu.add(fan2);
  add(fan2, new THREE.CylinderGeometry(0.017, 0.017, 0.009, 24), mat(0x30363d, { transparent: true, opacity: 0.85 }));
  const blades2 = new THREE.Group();
  fan2.add(blades2);
  for (let i = 0; i < 9; i += 1) {
    const b = add(blades2, new THREE.BoxGeometry(0.009, 0.007, 0.001), mat(0x79c0ff, { emissive: 0x79c0ff, emissiveIntensity: 0.5 }), Math.cos(i * 0.7) * 0.01, 0, Math.sin(i * 0.7) * 0.01);
    b.rotation.y = -i * 0.7 + 0.5;
  }
  label(jet, 'Jetson Orin NX 16 GB (EDU)', [-0.005, -0.02, 0.03]);
  label(fan2, 'Ống đồng + quạt', [0, 0.012, 0]);

  // ---- battery: slides in from the left side
  const pack = new THREE.Group();
  T.add(pack);
  add(pack, new THREE.BoxGeometry(0.065, 0.15, 0.09), mat(0x8b949e, { roughness: 0.6 }));
  for (const z of [-0.025, 0.025]) add(pack, new THREE.BoxGeometry(0.03, 0.004, 0.018), mat(0x484f58), 0, 0.076, z);
  for (let i = 0; i < 4; i += 1) add(pack, new THREE.BoxGeometry(0.003, 0.003, 0.003), basic(0x3fb950), -0.012 + i * 0.008, 0.077, 0);
  label(pack, 'Pin 13S 9 Ah · 2.5 kg', [0, 0.08, 0.05], true);
  const PACK_IN = V(0.012, 0.03, 0.1);

  // ---- speaker, torso IMU, neck ports
  const spk = add(T, new THREE.CylinderGeometry(0.02, 0.02, 0.012, 24), mat(0xa5d6ff, { metalness: 0.6 }), 0.06, 0, 0.04);
  spk.rotation.z = Math.PI / 2;
  label(spk, 'Loa 5 W', [0.01, 0, 0]);
  const imu = add(T, new THREE.BoxGeometry(0.022, 0.022, 0.006), mat(0xbc8cff, { emissive: 0xbc8cff, emissiveIntensity: 0.6 }), -0.03959, -0.00224, 0.14792);
  label(imu, 'IMU thân (URDF)', [0, 0, 0.01]);
  const ports = add(T, new THREE.BoxGeometry(0.004, 0.07, 0.04), mat(0xffa657, { emissive: 0xffa657, emissiveIntensity: 0.3 }), -0.062, 0, 0.3);
  label(ports, 'Cổng mở rộng sau gáy', [-0.005, 0, 0.025], true);

  // ---- cables from the board connectors, with current pulses
  const cables = CONNECTORS.map(([name, from, to, color], i) => {
    const a = V(...from);
    const b = V(...to);
    const mid = a.clone().lerp(b, 0.5).add(V(0.025, 0, 0));
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    add(T, new THREE.TubeGeometry(curve, 24, 0.0018, 6), mat(color, { emissive: color, emissiveIntensity: 0.3 }));
    const plug = add(T, new THREE.BoxGeometry(0.006, 0.007, 0.005), mat(0xf0f3f6), ...from);
    if (i < 4) label(plug, name, [0.004, 0, 0]);
    return { curve, dot: add(T, new THREE.SphereGeometry(0.0025, 8, 8), basic(color)), phase: i * 0.13 };
  });

  const eduBtn = qs('[data-k="edu"]');
  eduBtn.addEventListener('click', () => { edu.visible = !edu.visible; eduBtn.textContent = `Bản EDU (có Jetson): ${edu.visible ? 'bật' : 'tắt'}`; }, { signal: ctx.signal });

  return {
    update(now, dt, e) {
      // peel the back layers off, then slide the battery in
      layers.forEach((l, i) => {
        const k = Math.min(1, Math.max(0, e * 1.6 - i * 0.2));
        l.m.position.y = l.dy * k;                          // slide out to the side, out of the line of sight
        l.m.position.x = l.x - 0.03 * k;
        l.m.material.opacity = 1 - 0.9 * k;
      });
      const kb = Math.min(1, Math.max(0, (e - 0.5) * 2));
      pack.position.copy(PACK_IN).add(V(0, 0.22 * (1 - kb), 0));
      blades.rotation.y += dt * 25;
      blades2.rotation.y += dt * 30;
      for (const c of cables) c.curve.getPointAt((now * 0.4 + c.phase) % 1, c.dot.position);
      const t = now % 12;
      ctx.setActiveStep(e < 0.3 ? 0 : Math.min(5, 1 + Math.floor(t / 2.4)));
    },
  };
}

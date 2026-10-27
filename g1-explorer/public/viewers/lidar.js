// Close-up of the head's Livox MID-360 (frame mid360_link in the URDF: on top of the head, mounted
// upside down - roll = pi). The sensor is drawn 4x enlarged at head height (1.2 m) in a small room;
// every laser shot is a real ray cast into that room, so the point cloud builds up the way the
// real one does with a non-repetitive pattern: the longer you integrate, the more of the 360 x 59
// degree field gets covered. Scan law here is a stand-in (azimuth spin + incommensurate elevation
// sweep) - Livox does not publish the exact pattern; the FOV, range and rates are Livox's specs.
import * as THREE from 'three';
import { openCloseup, tubeGeometry } from '/closeup-shell.js';

const HEAD_H = 1.2;
const S = 4;
const MAX_PTS = 24000;
const C = 299792458;
const EL_MIN = -7 * Math.PI / 180;
const EL_MAX = 52 * Math.PI / 180;

export function open() {
  openCloseup({
    title: 'Livox MID-360 - LiDAR 3D trên đỉnh đầu G1',
    sub: 'ToF 905 nm · 360° × 59° · 200 000 điểm/s · 40 m @10% · quét không lặp · lắp lật ngược trên G1',
    heading: 'LiDAR đo khoảng cách thế nào',
    camera: { pos: [3.2, 2.6, 3.4], target: [0, 0.6, 0], min: 0.3, max: 12, far: 60 },
    steps: [
      ['Phát xung', 'diode laser 905 nm bắn một xung ánh sáng vài nano-giây (class 1, an toàn mắt).'],
      ['Lái tia', 'bộ phát và bộ thu đứng yên; chỉ khối quang học quay lái tia theo quỹ đạo không lặp lại trong vùng 360° × 59°.'],
      ['Phản xạ', 'tia chạm vật, một phần rất nhỏ quay về; photodiode thác (APD) bắt được.'],
      ['Thời gian bay', 'khoảng cách = c · t / 2 → 1 m ứng với ~6.67 ns đi về.'],
      ['Phủ dần', 'mỗi 0.1 s quỹ đạo khác đi một chút; tích luỹ lâu → vùng nhìn được phủ kín.'],
      ['Gửi đi', 'point cloud + IMU tích hợp qua Ethernet tới máy tính: SLAM, tránh vật cản, bậc thang.'],
    ],
    extra: `
      <dl class="hud">
        <dt>Tia hiện tại</dt><dd data-k="ray">-</dd>
        <dt>Thời gian bay</dt><dd data-k="tof">-</dd>
        <dt>Số điểm đang hiện</dt><dd data-k="n">-</dd>
      </dl>
      <label class="row">Thời gian tích luỹ <input type="range" data-k="integ" min="0.1" max="3" step="0.1" value="1"><output data-k="integOut"></output></label>
      <div class="closeup-buttons">
        <button type="button" class="btn small" data-k="flip">Lắp như trên G1 (lật ngược): bật</button>
      </div>
      <p class="muted" data-k="flipNote"></p>
      <h5>Thông số (Livox)</h5>
      <dl class="kv">
        <dt>FOV</dt><dd>360° ngang × 59° dọc (−7° … +52°)</dd>
        <dt>Tầm</dt><dd>40 m @ 10% · 70 m @ 80% · mù gần 0.1 m</dd>
        <dt>Tốc độ</dt><dd>200 000 điểm/s, khung 10 Hz</dd>
        <dt>Khác</dt><dd>IMU ICM40609 · Ethernet 100 Mbps · 9–27 V, 6.5 W · 265 g · 65×65×60 mm</dd>
      </dl>`,
    note: `Mô phỏng chậm lại rất nhiều (vài nghìn điểm/s thay vì 200 000) để mắt theo kịp. Quỹ đạo quét là minh hoạ
      cho kiểu "không lặp" - Livox không công bố mẫu thật; manual chỉ cho biết 0.1 s ≈ phủ như LiDAR 32 tia, 0.5 s ≈ 70%, và có
      thêm chế độ quét lặp (1 vòng / 0.1 s). Bên trong: Livox không công bố quang học; bộ phát / thu cố định là lời Livox, "gương quay"
      là mô tả của bài ISPRS 2025. Vị trí lắp (trong đầu, roll 180°, pitch 2.9°) theo URDF + ảnh tháo rời.`,
  }, build);
}

function build(ctx) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  scene.add(root);

  // ---- room (real metres): floor at 0, sensor at head height
  const room = new THREE.Group();
  root.add(room);
  const targets = [];
  const surf = (geo, color, x, y, z, rx = 0, ry = 0) => {
    const m = add(room, geo, mat(color, { roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.18 }), x, y, z);
    m.rotation.set(rx, ry, 0);
    targets.push(m);
    return m;
  };
  surf(new THREE.PlaneGeometry(9, 9), 0x30363d, 0, 0, 0, -Math.PI / 2);
  surf(new THREE.PlaneGeometry(9, 3), 0x30363d, 0, 1.5, -4.5);
  surf(new THREE.PlaneGeometry(9, 3), 0x30363d, 0, 1.5, 4.5, 0, Math.PI);
  surf(new THREE.PlaneGeometry(9, 3), 0x30363d, -4.5, 1.5, 0, 0, Math.PI / 2);
  surf(new THREE.PlaneGeometry(9, 3), 0x30363d, 4.5, 1.5, 0, 0, -Math.PI / 2);
  surf(new THREE.BoxGeometry(0.8, 0.9, 0.6), 0x6e7681, 1.6, 0.45, 0.8);
  surf(new THREE.BoxGeometry(0.5, 1.6, 0.5), 0x6e7681, -1.4, 0.8, -1.2);
  const stairs = [];
  for (let i = 0; i < 4; i += 1) stairs.push(surf(new THREE.BoxGeometry(0.35, 0.15 * (i + 1), 1.2), 0x6e7681, 2.0 + i * 0.35, 0.075 * (i + 1), -1.8));
  label(stairs[1], 'Bậc thang', [0, 0.3, 0], true);
  // a person-sized cylinder
  const person = surf(new THREE.CylinderGeometry(0.22, 0.22, 1.7, 20), 0x8b949e, -1.8, 0.85, 1.6);
  label(person, 'Người', [0, 1.0, 0], true);
  // robot body hint below the sensor
  const body = add(root, new THREE.CylinderGeometry(0.16, 0.12, 1.1, 20), mat(0xc4cad3, { transparent: true, opacity: 0.12 }), 0, 0.55, 0);
  label(body, 'Thân G1 (che một phần vùng nhìn phía dưới)', [0.2, 0.2, 0], true);

  // ---- the sensor (enlarged), in a group that can be flipped
  const mount = new THREE.Group();
  mount.position.y = HEAD_H;
  root.add(mount);
  const sensor = new THREE.Group();
  sensor.scale.setScalar(S);
  mount.add(sensor);
  // real shape (Livox manual / product photo): square finned aluminium base 65 x 65 mm, domed optical window
  const shell = fade(mat(0xb1bac4, { metalness: 0.7, roughness: 0.35 }), 0.15);
  add(sensor, new THREE.BoxGeometry(0.065, 0.032, 0.065), shell, 0, -0.014, 0);
  for (let i = 0; i < 7; i += 1) {
    add(sensor, new THREE.BoxGeometry(0.067, 0.002, 0.002), shell, 0, -0.026 + i * 0.004, 0.0335);
    add(sensor, new THREE.BoxGeometry(0.067, 0.002, 0.002), shell, 0, -0.026 + i * 0.004, -0.0335);
  }
  const windowMat = fade(mat(0x1f6feb, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, emissive: 0x0b2a5c }), 0.15);
  add(sensor, new THREE.SphereGeometry(0.029, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), windowMat, 0, 0.002, 0);
  add(sensor, new THREE.CylinderGeometry(0.03, 0.03, 0.006, 32), shell, 0, 0.002, 0);
  const pcb = add(sensor, new THREE.BoxGeometry(0.055, 0.0015, 0.055), mat(0x1a7f37), 0, -0.022, 0);
  const imu = add(sensor, new THREE.BoxGeometry(0.004, 0.0015, 0.004), mat(0xbc8cff, { emissive: 0xbc8cff, emissiveIntensity: 0.6 }), 0.016, -0.0205, 0.012);
  // transmitter and receiver are FIXED (Livox: "without rotating internal electronic devices")
  const laser = add(sensor, new THREE.BoxGeometry(0.006, 0.008, 0.006), mat(0xf85149, { emissive: 0xf85149, emissiveIntensity: 0.8 }), -0.006, -0.012, 0);
  const apd = add(sensor, new THREE.BoxGeometry(0.006, 0.008, 0.006), mat(0x58a6ff, { emissive: 0x58a6ff, emissiveIntensity: 0.6 }), 0.006, -0.012, 0);
  // only the scanning optics spin (a rotating mirror per the ISPRS 2025 paper), driven by a small motor
  const rotorG = new THREE.Group();
  rotorG.position.y = 0.01;
  sensor.add(rotorG);
  const optic = add(rotorG, new THREE.CylinderGeometry(0.012, 0.012, 0.004, 24), mat(0xe6edf3, { metalness: 1, roughness: 0.05 }));
  optic.rotation.z = 0.5;                                   // tilted reflective face - sends the beam sideways
  const spinMotor = add(sensor, new THREE.CylinderGeometry(0.006, 0.006, 0.008, 16), mat(0x30363d, { metalness: 0.6 }), 0, 0.02, 0);
  const eth = add(sensor, new THREE.CylinderGeometry(0.006, 0.006, 0.014, 16), mat(0x8b949e, { metalness: 0.9 }), 0, -0.016, -0.04);
  eth.rotation.x = Math.PI / 2;
  label(laser, 'Laser 905 nm (cố định)', [0, 0, 0]);
  label(apd, 'Bộ thu (cố định)', [0, 0, 0]);
  label(optic, 'Khối quang quét quay', [0, 0.006, 0]);
  label(spinMotor, 'Motor quay quang học', [0, 0.004, 0]);
  label(imu, 'IMU ICM40609', [0, 0, 0]);
  label(pcb, 'Bo xử lý ToF', [0.03, 0, 0]);
  label(eth, 'M12 12 chân (nguồn + Ethernet + PTP)', [0, 0, -0.008]);

  // ---- beam + point cloud
  const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xff5050 }));
  root.add(beam);
  const pos = new Float32Array(MAX_PTS * 3);
  const col = new Float32Array(MAX_PTS * 3);
  const born = new Float32Array(MAX_PTS).fill(-1e9);
  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  cloudGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const cloud = new THREE.Points(cloudGeo, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, sizeAttenuation: true }));
  root.add(cloud);
  let head = 0;

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['ray', 'tof', 'n', 'integ', 'integOut', 'flip', 'flipNote'].map((k) => [k, el(k)]));
  let flipped = true;
  const applyFlip = () => {
    mount.rotation.x = flipped ? Math.PI : 0;
    ui.flip.textContent = `Lắp như trên G1 (lật ngược): ${flipped ? 'bật' : 'tắt'}`;
    ui.flipNote.textContent = flipped
      ? 'Lật ngược: vùng 59° quay xuống (−52° … +7°) - thấy sàn, bậc thang, vật cản quanh chân. Đó là lý do Unitree lắp úp.'
      : 'Lắp thẳng: vùng 59° hướng lên (−7° … +52°) - thấy trần và tường cao, gần như bỏ sót sàn ngay quanh robot.';
    head = 0;
    born.fill(-1e9);
  };
  ui.flip.addEventListener('click', () => { flipped = !flipped; applyFlip(); }, { signal: ctx.signal });
  applyFlip();

  const ray = new THREE.Raycaster();
  ray.far = 40;
  const origin = new THREE.Vector3(0, HEAD_H, 0);
  const dir = new THREE.Vector3();
  const color = new THREE.Color();
  let phase = 0;
  let lastHit = null;

  return {
    update(now, dt, e) {
      const integ = Number(ui.integ.value);
      ui.integOut.textContent = `${integ.toFixed(1)} s`;
      rotorG.rotation.y += dt * 40;
      if (e > 0.3) {
        const shots = 420;                                     // per frame (slowed down)
        for (let i = 0; i < shots; i += 1) {
          phase += 1;
          // rosette-like stand-in: fast azimuth spin, elevation swept at an incommensurate rate,
          // slowly drifting phase -> the trace never repeats and fills the field over time
          const az = phase * 0.0391 + Math.sin(phase * 0.0023) * 0.8;
          const el = EL_MIN + (EL_MAX - EL_MIN) * (0.5 + 0.5 * Math.sin(phase * 0.2718281 + now * 0.37));
          dir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
          if (flipped) dir.y = -dir.y;
          ray.set(origin, dir);
          const h = ray.intersectObjects(targets, false)[0];
          if (!h || h.distance < 0.1 || h.distance > 40) continue;
          if (Math.hypot(h.point.x, h.point.z) < 0.17 && h.point.y < HEAD_H - 0.05) continue;   // own body
          pos.set([h.point.x, h.point.y, h.point.z], head * 3);
          color.setHSL(Math.min(0.75, h.distance / 6), 0.9, 0.55);
          col.set([color.r, color.g, color.b], head * 3);
          born[head] = now;
          head = (head + 1) % MAX_PTS;
          lastHit = h;
        }
      }
      // fade out points older than the integration time by moving them away
      let shown = 0;
      for (let i = 0; i < MAX_PTS; i += 1) {
        if (now - born[i] > integ) { if (born[i] > -1e8) { pos[i * 3 + 1] = -1000; born[i] = -1e9; } } else shown += 1;
      }
      cloudGeo.attributes.position.needsUpdate = true;
      cloudGeo.attributes.color.needsUpdate = true;
      if (lastHit) {
        const p = beamGeo.attributes.position;
        p.setXYZ(0, 0, HEAD_H, 0);
        p.setXYZ(1, lastHit.point.x, lastHit.point.y, lastHit.point.z);
        p.needsUpdate = true;
        ui.ray.textContent = `${lastHit.distance.toFixed(2)} m`;
        ui.tof.textContent = `${((2 * lastHit.distance) / C * 1e9).toFixed(1)} ns đi về`;
      }
      beam.visible = e > 0.3;
      ui.n.textContent = `${shown}`;
      const t = now % 10;
      ctx.setActiveStep(e < 0.3 ? -1 : t < 1.5 ? 0 : t < 3 ? 1 : t < 4.5 ? 2 : t < 6 ? 3 : t < 8 ? 4 : 5);
    },
  };
}

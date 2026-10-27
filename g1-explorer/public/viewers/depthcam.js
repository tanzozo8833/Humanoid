// Close-up of the head's Intel RealSense D435i (frame d435_link in the URDF). The camera is drawn
// 3x enlarged in front of a small scene; the IR projector's dots are real ray hits on that scene,
// the two IR imagers see them from 50 mm apart, and the depth image in the panel is computed the
// way the D4 processor does it: Z = f * B / disparity. Layout of the front (IR-L, projector, IR-R,
// RGB) and the numbers are Intel's datasheet; internals are a simplified drawing.
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const S = 3;                       // drawing scale of the camera body only
const B = 0.05;                    // stereo baseline (m)
const HFOV = 87 * Math.PI / 180;
const VFOV = 58 * Math.PI / 180;
const F_PX = 640 / Math.tan(HFOV / 2);   // focal length in pixels at 1280 px width
const SUBPIX = 0.08;               // typical subpixel matching accuracy (Intel tuning guide RMS)
const DOTS = 700;

export function open() {
  openCloseup({
    title: 'Intel RealSense D435i - camera chiều sâu trên đầu G1',
    sub: 'Stereo hồng ngoại chủ động · baseline 50 mm · độ sâu 1280×720 @ 90 fps · RGB 1920×1080 · IMU BMI055',
    heading: 'Camera "nhìn" ra độ sâu thế nào',
    camera: { pos: [-0.45, 0.32, 0.62], target: [0.18, -0.05, 0], min: 0.1, max: 4 },
    autoRotate: false,
    steps: [
      ['Chiếu chấm', 'máy chiếu IR 850 nm (laser class 1) phủ hàng nghìn chấm ngẫu nhiên lên mọi bề mặt - mắt người không thấy.'],
      ['Chụp đôi', 'hai imager IR global-shutter (OV9282) cách nhau 50 mm chụp cùng một lúc - không nhoè khi robot đang đi.'],
      ['Khớp điểm', 'chip D4 tìm cùng một vùng chấm trong ảnh trái và phải → độ lệch (disparity) d pixel.'],
      ['Tính độ sâu', 'Z = f · B / d. Vật càng gần, d càng lớn. Ra bản đồ độ sâu ngay trong camera.'],
      ['Màu', 'camera RGB OV2740 2 MP chụp màu; driver căn (align) độ sâu sang khung ảnh màu.'],
      ['Gửi đi', 'IMU BMI055 + ảnh qua USB-C 3.1 tới board đầu, rồi theo cáp vi sai về thân (Jetson / mainboard).'],
    ],
    extra: `
      <h5>Ảnh IR trái (chấm của máy chiếu)</h5>
      <canvas data-k="ir" width="320" height="200" style="width:100%;background:#000;border:1px solid var(--line);border-radius:8px"></canvas>
      <h5>Bản đồ độ sâu (tính từ disparity)</h5>
      <canvas data-k="depth" width="320" height="200" style="width:100%;background:#000;border:1px solid var(--line);border-radius:8px"></canvas>
      <dl class="hud" style="margin-top:8px">
        <dt>Chấm đang theo dõi</dt><dd data-k="z">-</dd>
        <dt>Disparity</dt><dd data-k="d">-</dd>
        <dt>Sai số ước tính</dt><dd data-k="err">-</dd>
      </dl>
      <h5>Thông số (Intel)</h5>
      <dl class="kv">
        <dt>FOV độ sâu</dt><dd>87° × 58°</dd><dt>FOV RGB</dt><dd>69° × 42°</dd>
        <dt>Tầm</dt><dd>~0.3 – 3 m lý tưởng, tới ~10 m</dd>
        <dt>Tiêu cự (tính)</dt><dd>f ≈ ${F_PX.toFixed(0)} px ở 1280 px</dd>
        <dt>Gần nhất / sai số</dt><dd>Min-Z ~10 cm · &lt; 2% ở 2 m</dd><dt>Trên G1</dt><dd>trán, torso_link (0.058, 0.018, 0.430) m, chúc xuống 47.6° (URDF)</dd>
      </dl>`,
    note: `Sai số tính theo ΔZ ≈ Z² · ${SUBPIX} px / (f · B) - lý do độ sâu stereo tốt ở gần, kém dần ở xa.
      Thân camera vẽ phóng to 3×; vị trí linh kiện bên trong là sơ đồ. Tên cảm biến ảnh OV9282 / OV2740 theo trả lời của Intel trên diễn đàn; 850 nm, Min-Z, sai số theo datasheet D400.`,
  }, build);
}

function build(ctx) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  scene.add(root);

  // ---- camera body, looking along +x; lateral = z
  const cam = new THREE.Group();
  cam.scale.setScalar(S);
  root.add(cam);
  const caseMat = fade(mat(0x3a3f46, { metalness: 0.8, roughness: 0.35 }), 0.12);
  add(cam, new THREE.BoxGeometry(0.025, 0.025, 0.09), caseMat);
  const glass = fade(mat(0x0d1117, { metalness: 0.2, roughness: 0.1 }), 0.25);
  add(cam, new THREE.BoxGeometry(0.001, 0.02, 0.085), glass, 0.0128, 0, 0);
  const pcb = add(cam, new THREE.BoxGeometry(0.002, 0.02, 0.08), mat(0x1a7f37, { roughness: 0.7 }), -0.007, 0, 0);
  const d4 = add(cam, new THREE.BoxGeometry(0.002, 0.009, 0.009), mat(0x161b22), -0.005, 0, -0.005);
  const imu = add(cam, new THREE.BoxGeometry(0.002, 0.004, 0.004), mat(0xbc8cff, { emissive: 0xbc8cff, emissiveIntensity: 0.5 }), -0.005, 0.005, 0.015);
  const usb = add(cam, new THREE.BoxGeometry(0.004, 0.003, 0.008), mat(0xb1bac4, { metalness: 0.9 }), 0, 0, -0.045);
  const lens = (z, color, r = 0.004) => {
    const l = add(cam, new THREE.CylinderGeometry(r, r, 0.012, 24), mat(0x0d1117, { metalness: 0.5 }), 0.005, 0, z);
    l.rotation.z = Math.PI / 2;
    const g = add(cam, new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.001, 24), basic(color), 0.0115, 0, z);
    g.rotation.z = Math.PI / 2;
    return l;
  };
  const zL = -0.03;
  const zR = zL + B;
  const zP = -0.01;
  const zRGB = 0.035;
  const irL = lens(zL, 0x3d1d6b);
  const irR = lens(zR, 0x3d1d6b);
  const proj = lens(zP, 0x8b0000, 0.0035);
  const rgb = lens(zRGB, 0x0b3d91);
  label(irL, 'Imager IR trái (OV9282)', [0, 0.006, 0]);
  label(irR, 'Imager IR phải (OV9282)', [0, 0.006, 0]);
  label(proj, 'Máy chiếu IR 850 nm', [0, -0.006, 0]);
  label(rgb, 'RGB OV2740', [0, 0.006, 0]);
  label(d4, 'Vision Processor D4 (28 nm)', [0, -0.006, 0]);
  label(imu, 'IMU BMI055', [0, 0.004, 0]);
  label(usb, 'USB-C 3.1', [0, 0, -0.004]);
  label(pcb, 'Bo mạch', [0, -0.01, 0.03]);

  // ---- scene in front (metres, real size)
  const world = new THREE.Group();
  root.add(world);
  const wall = add(world, new THREE.PlaneGeometry(1.4, 1.0), mat(0x30363d, { roughness: 0.9, side: THREE.DoubleSide }), 1.3, 0, 0);
  wall.rotation.y = -Math.PI / 2;
  const floor = add(world, new THREE.PlaneGeometry(1.5, 1.4), mat(0x21262d, { roughness: 1, side: THREE.DoubleSide }), 0.7, -0.35, 0);
  floor.rotation.x = -Math.PI / 2;
  const boxObj = add(world, new THREE.BoxGeometry(0.22, 0.3, 0.22), mat(0x6e7681, { roughness: 0.7 }), 0.85, -0.2, 0.22);
  const ball = add(world, new THREE.SphereGeometry(0.09, 32, 24), mat(0x8b949e, { roughness: 0.6 }), 0.6, -0.05, -0.2);
  const targets = [wall, floor, boxObj, ball];
  label(ball, 'Vật gần → disparity lớn', [0, 0.11, 0], true);
  label(wall, 'Tường xa', [0, 0.45, 0], true);

  // projector dots (instanced spheres placed at ray hits)
  const dotGeo = new THREE.SphereGeometry(0.004, 6, 6);
  const dotMat = basic(0xff4d4d);
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, DOTS);
  world.add(dots);
  const dirs = [];
  for (let i = 0; i < DOTS; i += 1) {
    const u = (Math.random() * 2 - 1) * Math.tan(HFOV / 2) * 0.9;
    const v = (Math.random() * 2 - 1) * Math.tan(VFOV / 2) * 0.9;
    dirs.push(new THREE.Vector3(1, v, u).normalize());
  }
  const hits = new Array(DOTS).fill(null);
  const ray = new THREE.Raycaster();
  const projPos = new THREE.Vector3(0.0125 * S, 0, zP * S);
  const leftPos = new THREE.Vector3(0.0125 * S, 0, zL * S);
  const rightPos = new THREE.Vector3(0.0125 * S, 0, zR * S);

  // triangulation lines for one tracked dot
  const lineMat = new THREE.LineBasicMaterial({ color: 0x79c0ff, transparent: true, opacity: 0.9 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([leftPos, new THREE.Vector3(), rightPos]);
  const tri = new THREE.Line(lineGeo, lineMat);
  world.add(tri);
  const projLineGeo = new THREE.BufferGeometry().setFromPoints([projPos, new THREE.Vector3()]);
  const projLine = new THREE.Line(projLineGeo, new THREE.LineBasicMaterial({ color: 0xff7b72, transparent: true, opacity: 0.7 }));
  world.add(projLine);
  // projector frustum
  const fr = new THREE.Group();
  world.add(fr);
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => new THREE.Vector3(1, b * Math.tan(VFOV / 2), a * Math.tan(HFOV / 2)).multiplyScalar(0.5).add(projPos));
  for (const c of corners) fr.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([projPos, c]), new THREE.LineBasicMaterial({ color: 0xff7b72, transparent: true, opacity: 0.25 })));

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = Object.fromEntries(['ir', 'depth', 'z', 'd', 'err'].map((k) => [k, el(k)]));
  const irg = ui.ir.getContext('2d');
  const dg = ui.depth.getContext('2d');
  const m4 = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  let tracked = 0;
  let lastScan = -1;
  let lastTrack = -1;

  function scan() {
    root.updateMatrixWorld(true);
    for (let i = 0; i < DOTS; i += 1) {
      ray.set(projPos, dirs[i]);
      const h = ray.intersectObjects(targets, false)[0];
      hits[i] = h ? h.point.clone() : null;
      m4.makeTranslation(h ? h.point.x : 0, h ? h.point.y : -99, h ? h.point.z : 0);
      dots.setMatrixAt(i, m4);
    }
    dots.instanceMatrix.needsUpdate = true;
    // IR image (left imager): project hits
    irg.fillStyle = '#000';
    irg.fillRect(0, 0, 320, 200);
    for (const p of hits) {
      if (!p) continue;
      tmp.copy(p).sub(leftPos);
      if (tmp.x <= 0) continue;
      const x = 160 + (tmp.z / tmp.x) * (160 / Math.tan(HFOV / 2));
      const y = 100 - (tmp.y / tmp.x) * (100 / Math.tan(VFOV / 2));
      const b = Math.min(255, 120 + 300 / (tmp.length() * 3));
      irg.fillStyle = `rgb(${b},${b},${b})`;
      irg.fillRect(x, y, 2, 2);
    }
    // depth map on a coarse grid: ray from the left imager, Z -> disparity -> back to Z
    const W = 64;
    const H = 40;
    for (let j = 0; j < H; j += 1) {
      for (let i = 0; i < W; i += 1) {
        const u = ((i + 0.5) / W * 2 - 1) * Math.tan(HFOV / 2);
        const v = (1 - (j + 0.5) / H * 2) * Math.tan(VFOV / 2);
        ray.set(leftPos, tmp.set(1, v, u).normalize());
        const h = ray.intersectObjects(targets, false)[0];
        let col = '#000';
        if (h) {
          const Z = h.point.x - leftPos.x;                       // depth along the optical axis
          const disp = (F_PX * B) / Z;
          const Zm = (F_PX * B) / disp;                          // what the camera reports
          const k = Math.min(1, Math.max(0, (Zm - 0.3) / 1.2));
          col = `hsl(${(1 - k) * 0 + k * 240}, 85%, ${55 - k * 15}%)`;
        }
        dg.fillStyle = col;
        dg.fillRect(i * 5, j * 5, 5, 5);
      }
    }
    dg.fillStyle = '#fff';
    dg.font = '10px Segoe UI';
    dg.fillText('đỏ = gần (0.3 m)   xanh = xa (1.5 m)', 6, 194);
  }

  return {
    update(now, dt, e) {
      ball.position.x = 0.62 + 0.25 * Math.sin(now * 0.6);
      ball.position.z = -0.2 + 0.1 * Math.cos(now * 0.4);
      if (now - lastScan > 0.12) { scan(); lastScan = now; }
      if (now - lastTrack > 2.5 || !hits[tracked]) {
        // prefer a dot on the ball so the change in disparity is visible
        const onBall = hits.map((h, i) => (h && h.distanceTo(ball.position) < 0.1 ? i : -1)).filter((i) => i >= 0);
        const pool = onBall.length && Math.random() < 0.6 ? onBall : hits.map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
        tracked = pool[Math.floor(Math.random() * pool.length)] ?? 0;
        lastTrack = now;
      }
      const p = hits[tracked];
      tri.visible = projLine.visible = !!p && e > 0.5;
      if (p) {
        const pos = lineGeo.attributes.position;
        pos.setXYZ(1, p.x, p.y, p.z);
        pos.needsUpdate = true;
        projLineGeo.attributes.position.setXYZ(1, p.x, p.y, p.z);
        projLineGeo.attributes.position.needsUpdate = true;
        const Z = p.x - leftPos.x;
        const disp = (F_PX * B) / Z;
        ui.z.textContent = `Z = ${Z.toFixed(3)} m`;
        ui.d.textContent = `d = f·B/Z = ${F_PX.toFixed(0)} × 0.05 / ${Z.toFixed(2)} = ${disp.toFixed(1)} px`;
        ui.err.textContent = `± ${((Z * Z * SUBPIX) / (F_PX * B) * 1000).toFixed(1)} mm (ở 4 m: ± ${((16 * SUBPIX) / (F_PX * B) * 1000).toFixed(0)} mm)`;
      }
      dots.visible = e > 0.2;
      fr.visible = e > 0.2;
      const t = now % 9;
      ctx.setActiveStep(e < 0.3 ? -1 : t < 1.5 ? 0 : t < 3 ? 1 : t < 4.5 ? 2 : t < 6 ? 3 : t < 7.5 ? 4 : 5);
    },
  };
}

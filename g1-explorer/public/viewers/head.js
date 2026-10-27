// Close-up of the G1 head: the real head shell (URDF head_link mesh, fades as it opens) with what the
// teardown found inside (中邮证券 p.30, 37): RealSense D435i at the forehead, Livox MID-360 below it
// mounted upside down looking through the face opening, an RGB LED strip around the face with its
// own control board, and a separate head MCU board linked to the torso by high-speed differential
// cables. Camera and LiDAR poses are the URDF's (d435_joint, mid360_joint, in torso_link) moved
// into the head_link frame; board sizes are estimates. The two sensor fields of view are drawn:
// the camera looks down 47.6 deg at the hands and table, the inverted LiDAR covers -52..+7 deg.
import * as THREE from 'three';
import { openCloseup, cloneLinkVisual } from '/closeup-shell.js';

const HEAD_OFFSET = [0.0039635, 0, -0.044];          // head_joint origin in torso_link (URDF)
const D435 = { xyz: [0.0576235, 0.01753, 0.42987], pitch: 0.8307767239493009 };
const MID360 = { xyz: [0.0002835, 0.00003, 0.428434], roll: Math.PI, pitch: 0.05112069379091391 };
const inHead = (p) => [p[0] - HEAD_OFFSET[0], p[1] - HEAD_OFFSET[1], p[2] - HEAD_OFFSET[2]];

export function open(o) {
  openCloseup({
    title: 'Đầu G1 - bên trong hộp cảm biến',
    sub: 'Vỏ đầu thật (URDF) · D435i ở trán · MID-360 lắp úp · dải LED RGB + board LED · board MCU của đầu',
    heading: 'Đầu chứa những gì và vì sao đặt như vậy',
    camera: { pos: [0.42, 0.14, 0.4], target: [0.0, 0.0, 0], min: 0.08, max: 2 },
    steps: [
      ['Camera ở trán', 'D435i đặt cao nhất, chúc xuống 47.6° - nhìn rõ hai bàn tay và mặt bàn trước người (thao tác).'],
      ['LiDAR lắp úp', 'MID-360 lật ngược (roll 180°) ngay dưới camera, nhìn qua khoang mặt: vùng −52°…+7° phủ sàn và vật cản quanh robot (đi lại).'],
      ['Dải LED RGB', 'viền quanh mặt, có board điều khiển riêng - báo trạng thái (đang đứng, đang đi, lỗi…).'],
      ['Board MCU của đầu', 'gom tín hiệu cảm biến trong đầu.'],
      ['Cáp xuống thân', 'cáp vi sai tốc độ cao + nguồn đi qua cổ xuống mainboard (đầu cắm "LiDAR", "camera", "LED đầu", "nguồn đầu").'],
      ['Không có cổ', 'bản 23/29 DoF: đầu bắt cứng vào thân, nên muốn "nhìn" hướng khác robot phải xoay eo hoặc cả người.'],
    ],
    extra: `
      <div class="closeup-buttons">
        <button type="button" class="btn small" data-k="fovCam">Vùng nhìn camera: bật</button>
        <button type="button" class="btn small" data-k="fovLidar">Vùng nhìn LiDAR: bật</button>
      </div>
      <h5>Toạ độ thật (URDF, trong torso_link)</h5>
      <dl class="kv">
        <dt>d435_link</dt><dd>(0.058, 0.018, 0.430) m · pitch 0.831 rad = 47.6° chúc xuống</dd>
        <dt>mid360_link</dt><dd>(0.000, 0.000, 0.428) m · roll π (úp) · pitch 0.051 rad = 2.9°</dd>
        <dt>head_link</dt><dd>1.036 kg · khớp fixed với thân</dd>
      </dl>
      <h5>Từ ảnh tháo rời</h5>
      <dl class="kv">
        <dt>Thứ tự từ trên xuống</dt><dd>camera D435i (trán) → LiDAR MID-360 (giữa mặt)</dd>
        <dt>Viền mặt</dt><dd>dải LED RGB + board điều khiển LED phía sau</dd>
        <dt>Board đầu</dt><dd>MCU riêng, cáp vi sai tốc độ cao về thân</dd>
      </dl>`,
    note: 'Vỏ đầu là mesh head_link của URDF Unitree. Camera / LiDAR đặt đúng toạ độ URDF. Dải LED, board LED, board MCU và đường cáp đặt theo ảnh tháo rời 中邮证券 - kích thước ước lượng.',
  }, (ctx) => build(ctx, o));
}

function build(ctx, o) {
  const { scene, add, mat, basic, label, fade } = ctx;
  const qs = ctx.q;
  const ros = new THREE.Group();
  ros.rotation.x = -Math.PI / 2;                    // ROS z-up -> three y-up
  scene.add(ros);
  const frame = new THREE.Group();                  // head_link frame, centred on the head
  frame.position.set(-0.004, 0, -0.43);
  ros.add(frame);

  const shellMat = fade(mat(0x2b3038, { metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide }), 0.12);
  frame.add(cloneLinkVisual(o.links?.head_link, shellMat));

  // ---- D435i at its URDF pose (x = optical axis)
  const cam = new THREE.Group();
  cam.position.set(...inHead(D435.xyz));
  cam.rotation.set(0, D435.pitch, 0);
  frame.add(cam);
  const body = add(cam, new THREE.BoxGeometry(0.025, 0.09, 0.025), mat(0x8b949e, { metalness: 0.8, roughness: 0.3 }));
  for (const [y, c] of [[0.025, 0x3d1d6b], [-0.025, 0x3d1d6b], [0.005, 0x8b0000], [-0.037, 0x0b3d91]]) {
    const l = add(cam, new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, 20), basic(c), 0.0135, y, 0);
    l.rotation.z = Math.PI / 2;
  }
  label(body, 'RealSense D435i', [0, 0, 0.02]);

  // ---- MID-360 at its URDF pose (upside down)
  const lid = new THREE.Group();
  lid.position.set(...inHead(MID360.xyz));
  lid.rotation.set(MID360.roll, MID360.pitch, 0, 'ZYX');   // URDF rpy = Rz·Ry·Rx
  frame.add(lid);
  const base = add(lid, new THREE.BoxGeometry(0.065, 0.065, 0.032), mat(0xb1bac4, { metalness: 0.7, roughness: 0.35 }), 0, 0, -0.014);
  add(lid, new THREE.SphereGeometry(0.029, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1f6feb, { transparent: true, opacity: 0.6, roughness: 0.05 }), 0, 0, 0.004).rotation.x = Math.PI / 2;
  label(base, 'Livox MID-360 (lắp úp)', [0, 0.04, 0]);

  // ---- RGB LED strip around the face + its board, head MCU board, cables to the neck
  const ledCount = 36;
  const leds = [];
  for (let i = 0; i < ledCount; i += 1) {
    const a = -Math.PI * 0.8 + (i / (ledCount - 1)) * Math.PI * 1.6;
    const led = add(frame, new THREE.BoxGeometry(0.003, 0.005, 0.004), basic(0xff7b72), 0.072, Math.sin(a) * 0.05, 0.43 + Math.cos(a) * 0.058);
    leds.push(led);
  }
  label(leds[Math.floor(ledCount / 2)], 'Dải LED RGB quanh mặt', [0.01, 0, 0.012]);
  const ledBoard = add(frame, new THREE.BoxGeometry(0.003, 0.04, 0.025), mat(0x1a7f37), 0.02, 0.045, 0.39);
  label(ledBoard, 'Board điều khiển LED', [0, 0.02, 0]);
  const mcu = add(frame, new THREE.BoxGeometry(0.004, 0.05, 0.04), mat(0x1a7f37), -0.04, 0, 0.42);
  add(frame, new THREE.BoxGeometry(0.002, 0.012, 0.012), mat(0x0d1117), -0.037, 0.005, 0.425);
  label(mcu, 'Board MCU của đầu', [0, 0, 0.03]);
  const cables = [];
  for (const [y, c] of [[-0.01, 0xffa657], [0.0, 0x3fb950], [0.01, 0x58a6ff]]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, y, 0.405), new THREE.Vector3(-0.03, y, 0.39), new THREE.Vector3(-0.045, y, 0.35), new THREE.Vector3(-0.03, y, 0.29),
    ]);
    add(frame, new THREE.TubeGeometry(curve, 30, 0.0022, 8), mat(c, { emissive: c, emissiveIntensity: 0.3 }));
    cables.push(curve);
  }
  const neckLabel = new THREE.Object3D();
  neckLabel.position.set(-0.03, 0, 0.29);
  frame.add(neckLabel);
  label(neckLabel, 'Cáp vi sai + nguồn xuống thân', [0, 0, -0.01], true);
  const pulses = cables.map(() => add(frame, new THREE.SphereGeometry(0.003, 8, 8), basic(0xffffff)));

  // ---- fields of view
  const fovCam = new THREE.Group();
  cam.add(fovCam);
  {
    const L = 0.22;
    const hx = Math.tan((87 * Math.PI) / 360) * L;
    const hz = Math.tan((58 * Math.PI) / 360) * L;
    const geo = new THREE.ConeGeometry(1, 1, 4, 1, true);
    const cone = new THREE.Mesh(geo, basic(0x58a6ff, { transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    cone.scale.set(Math.hypot(hx, hz), L, Math.hypot(hx, hz));
    cone.rotation.z = Math.PI / 2;
    cone.rotation.y = Math.PI / 4;
    cone.position.x = L / 2 + 0.013;
    fovCam.add(cone);
  }
  const fovLidar = new THREE.Group();
  lid.add(fovLidar);
  {
    // band between -7 and +52 deg in the sensor frame (z up) -> flipped by the mount
    const r = 0.22;
    const pts = [];
    for (const el of [-7, 52]) pts.push(new THREE.Vector2(Math.cos((el * Math.PI) / 180) * r, Math.sin((el * Math.PI) / 180) * r));
    const geo = new THREE.LatheGeometry([new THREE.Vector2(0.03, 0), ...pts], 48);
    const band = new THREE.Mesh(geo, basic(0x3fb950, { transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    band.rotation.x = Math.PI / 2;                    // lathe axis y -> sensor z
    fovLidar.add(band);
  }
  const toggles = [['fovCam', fovCam, 'Vùng nhìn camera'], ['fovLidar', fovLidar, 'Vùng nhìn LiDAR']];
  for (const [k, g, t] of toggles) {
    const b = qs(`[data-k="${k}"]`);
    b.addEventListener('click', () => { g.visible = !g.visible; b.textContent = `${t}: ${g.visible ? 'bật' : 'tắt'}`; }, { signal: ctx.signal });
  }

  const col = new THREE.Color();
  return {
    update(now, dt, e) {
      leds.forEach((l, i) => l.material.color.copy(col.setHSL((now * 0.15 + i / ledCount) % 1, 0.9, 0.55)));
      cables.forEach((c, i) => c.getPointAt((now * 0.5 + i * 0.3) % 1, pulses[i].position));
      const t = now % 12;
      ctx.setActiveStep(e < 0.3 ? -1 : Math.floor(t / 2));
    },
  };
}

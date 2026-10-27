// Close-up of the G1's computers and data paths, drawn as a 3D wiring diagram: the motion control
// board (8-core CPU, Unitree firmware), the user's development computer (Jetson Orin NX on the
// EDU), the Ethernet switch, the sensors and the motor buses. Packets show the DDS topics from
// unitree_sdk2 (rt/lowstate up, rt/lowcmd down every 2 ms - slowed down here). Board placement
// and the switch are a diagram, not the real layout; topic names and rates are the SDK's.
import * as THREE from 'three';
import { openCloseup, textTexture } from '/closeup-shell.js';

export function open() {
  openCloseup({
    title: 'Máy tính & mạng dữ liệu của G1',
    sub: 'PC1 mainboard RK3588S (192.168.123.161) + PC2 Jetson Orin NX 16 GB (192.168.123.164, EDU) · DDS trên Ethernet · CAN xuống khớp',
    heading: 'Dữ liệu chạy trong robot thế nào',
    camera: { pos: [0.0, 0.75, 0.75], target: [0, 0, 0.02], min: 0.2, max: 3 },
    autoRotate: false,
    toggle: false,
    steps: [
      ['Đo', 'driver mỗi khớp đọc encoder; IMU pelvis đo tư thế.'],
      ['rt/lowstate', 'bo chuyển động gom 29 motor + IMU → publish rt/lowstate (DDS).'],
      ['Cảm nhận', 'D435i (USB) và MID-360 (Ethernet) gửi ảnh / point cloud tới Jetson.'],
      ['Quyết định', 'locomotion của Unitree, hoặc code của bạn trên Jetson (RL policy, teleop, VLA...).'],
      ['rt/lowcmd', 'gửi q, dq, τ, Kp, Kd (+CRC32) cho từng motor mỗi 2 ms; tay Dex3 qua rt/dex3/*/cmd.'],
      ['Thực thi', 'bo chuyển động chuyển lệnh xuống các bus motor; driver từng khớp chạy vòng PD + FOC.'],
    ],
    extra: `
      <h5>PC1 - mainboard (teardown)</h5>
      <dl class="kv">
        <dt>SoC</dt><dd>Rockchip RK3588S, 8 nm: 4× Cortex-A76 + 4× Cortex-A55 · GPU Mali-G610 MC4 · NPU 6 TOPS</dd>
        <dt>RAM / lưu trữ</dt><dd>2 × BIWIN BMW2CX32H2A-32G-X = 8 GB · FORESEE FEMDNN064G-58AAA eMMC 64 GB</dd>
        <dt>Khác</dt><dd>module WiFi 6 / BT 5.2 có vỏ chắn · PMIC · MOSFET công suất · tụ lọc · nhiều đầu JST · các chip còn lại bị xoá nhãn</dd>
        <dt>Tản nhiệt</dt><dd>tản nhôm + quạt ly tâm; nằm sát lưng sau vỏ + mút xốp + tấm nhựa lót</dd>
        <dt>Phần mềm</dt><dd>Ubuntu 20.04.5 · Linux 5.10.176-rt86 (PREEMPT_RT) · CycloneDDS 0.10.2 · master_service khởi chạy ai_sport, state_estimator, robot_state_service, motion_switcher, vui_service, chat_go, webrtc, ota… (arXiv 2509.14096)</dd>
      </dl>
      <h5>PC2 - máy phát triển (EDU)</h5>
      <dl class="kv">
        <dt>Module</dt><dd>Jetson Orin NX 16 GB: 8× Cortex-A78AE 2 GHz · GPU 1024 CUDA + 32 Tensor (918 MHz) · 100 TOPS · SSD 2 TB</dd>
        <dt>Vị trí</dt><dd>phía trên mainboard, ống dẫn nhiệt đồng + quạt + tấm VC</dd>
        <dt>Ra ngoài</dt><dd>cổng sau gáy: 2 × Gigabit, 4 × USB-C, GPIO (UART1, I2C2, 2 GPIO)</dd>
      </dl>
      <h5>Topic DDS chính (unitree_sdk2)</h5>
      <dl class="kv">
        <dt>rt/lowstate</dt><dd>LowState_: 35 ô MotorState_ (q, dq, ddq, tau_est, temperature[2], vol, sensor[2]) + imu_state + wireless_remote[40] + crc</dd>
        <dt>rt/lowcmd</dt><dd>LowCmd_: mode_pr, mode_machine, 35 × MotorCmd_ (mode, q, dq, tau, kp, kd), crc</dd>
        <dt>rt/secondary_imu</dt><dd>IMU thân</dd>
        <dt>rt/arm_sdk</dt><dd>ghi đè khớp tay khi bộ đi bộ của Unitree vẫn chạy</dd>
        <dt>rt/dex3/left|right/cmd</dt><dd>HandCmd_ 7 motor; state ở …/state</dd>
      </dl>`,
    note: 'Chip PC1: báo cáo tháo rời 中邮证券 + arXiv 2509.14096. PC2: tài liệu G1 (bản QRE). Topic, message: unitree_sdk2. Bus CAN xuống khớp: teardown. IP MID-360 .120 theo sơ đồ arXiv. Bố trí khối trong sơ đồ 3D là minh hoạ.',
  }, build);
}

function build(ctx) {
  const { scene, add, mat, basic, label } = ctx;
  const root = new THREE.Group();
  scene.add(root);
  const node = (name, size, pos, color, lines) => {
    const m = add(root, new THREE.BoxGeometry(...size), mat(color, { metalness: 0.3, roughness: 0.6 }), ...pos);
    if (lines) {
      const top = add(root, new THREE.PlaneGeometry(size[0] * 0.9, size[2] * 0.9), new THREE.MeshBasicMaterial({ map: textTexture(lines, { w: 256, h: 128, font: 20, bg: '#0d1117' }) }), pos[0], pos[1] + size[1] / 2 + 0.0005, pos[2]);
      top.rotation.x = -Math.PI / 2;
    }
    label(m, name, [0, size[1] / 2 + 0.01, 0], true);
    return m;
  };
  const motion = node('PC1 mainboard RK3588S · .161', [0.16, 0.012, 0.1], [0, 0, 0], 0x1a7f37, ['RK3588S  8GB  eMMC64', 'Ubuntu 20.04 RT', 'ai_sport / estimator']);
  const jetson = node('PC2 Jetson Orin NX · .164', [0.1, 0.03, 0.07], [0, 0, -0.25], 0x2b3038, ['JETSON ORIN NX', '100 TOPS  2TB']);
  const sw = node('Switch Ethernet', [0.07, 0.015, 0.04], [-0.22, 0, -0.12], 0x30363d, ['ETH SWITCH']);
  const lidar = add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 24), mat(0x3fb950, { emissive: 0x0f3d1a }), -0.36, 0.02, -0.25);
  label(lidar, 'MID-360 · .120 (Ethernet)', [0, 0.04, 0], true);
  const cam = add(root, new THREE.BoxGeometry(0.09, 0.025, 0.025), mat(0x58a6ff, { emissive: 0x0b2a5c }), 0.22, 0.01, -0.32);
  label(cam, 'D435i (USB 3)', [0, 0.03, 0], true);
  const wifi = add(root, new THREE.BoxGeometry(0.03, 0.01, 0.03), mat(0xa5d6ff), 0.12, 0.0, -0.18);
  label(wifi, 'WiFi 6 / BT 5.2', [0, 0.02, 0], true);
  const imu = add(root, new THREE.BoxGeometry(0.02, 0.006, 0.02), mat(0xbc8cff, { emissive: 0xbc8cff, emissiveIntensity: 0.4 }), -0.14, 0.0, 0.1);
  label(imu, 'IMU pelvis', [0, 0.015, 0], true);
  const buses = [['CAN chân trái (6)', -0.24, 0.3], ['CAN chân phải (6)', -0.08, 0.3], ['CAN eo (3)', 0.06, 0.3], ['CAN tay trái (7)', 0.2, 0.3], ['CAN tay phải (7)', 0.34, 0.3]];
  const busEnds = buses.map(([name, x, z]) => {
    const g = new THREE.Group();
    root.add(g);
    for (let i = 0; i < 3; i += 1) add(g, new THREE.CylinderGeometry(0.014, 0.014, 0.018, 20), mat(0x4fa3ff, { metalness: 0.5 }), x, 0.0, z + i * 0.04);
    label(g.children[2], name, [0, 0.02, 0], true);
    return new THREE.Vector3(x, 0, z);
  });
  const hands = [[-0.1, -0.4, 'Dex3-1 trái'], [0.1, -0.45, 'Dex3-1 phải']].map(([x, z, n]) => {
    const m = add(root, new THREE.BoxGeometry(0.05, 0.02, 0.06), mat(0x3fb950), x, 0, z);
    label(m, n, [0, 0.02, 0], true);
    return m.position.clone();
  });

  const links = [];
  const wire = (a, b, color, r = 0.003) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += 0.03;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    add(root, new THREE.TubeGeometry(curve, 30, r, 6), mat(color, { roughness: 0.6 }));
    links.push(curve);
    return curve;
  };
  const P = (o) => o.position.clone();
  const ethMotion = wire(P(sw), P(motion), 0xd29922);
  const ethJetson = wire(P(sw), P(jetson), 0xd29922);
  const ethLidar = wire(P(lidar), P(sw), 0xd29922);
  const usbCam = wire(P(cam), P(jetson), 0x8b949e);
  const imuLink = wire(P(imu), P(motion), 0xbc8cff, 0.002);
  const busCurves = busEnds.map((b) => wire(P(motion), b, 0x4fa3ff, 0.0025));
  const handCurves = hands.map((h) => wire(P(jetson), h, 0x3fb950, 0.002));

  const packets = [];
  const packet = (curve, color, period, reverse, offset = 0) => {
    const m = add(root, new THREE.SphereGeometry(0.008, 10, 10), basic(color));
    packets.push({ m, curve, period, reverse, offset });
  };
  // up: state (green) motors -> motion board -> switch -> Jetson; down: commands (blue)
  busCurves.forEach((c, i) => { packet(c, 0x7ee787, 2, true, i * 0.13); packet(c, 0x79c0ff, 2, false, 1 + i * 0.13); });
  packet(imuLink, 0xd2a8ff, 1.5, false);
  packet(ethMotion, 0x7ee787, 2, true, 0.4);
  packet(ethJetson, 0x7ee787, 2, false, 0.9);
  packet(ethJetson, 0x79c0ff, 2, true, 1.6);
  packet(ethMotion, 0x79c0ff, 2, false, 0.1);
  packet(ethLidar, 0x3fb950, 1.2, false);
  packet(usbCam, 0x58a6ff, 0.9, false);
  handCurves.forEach((c, i) => packet(c, 0x79c0ff, 1.4, false, i * 0.5));
  const legend = new THREE.Object3D();
  legend.position.set(0.3, 0, 0.12);
  root.add(legend);
  label(legend, '● xanh lá = trạng thái (lowstate) · ● xanh dương = lệnh (lowcmd)', [0, 0, 0], true);

  return {
    update(now, dt) {
      for (const p of packets) {
        let k = ((now + p.offset) % p.period) / p.period;
        if (p.reverse) k = 1 - k;
        p.curve.getPoint(k, p.m.position);
      }
      const t = now % 12;
      ctx.setActiveStep(Math.floor(t / 2));
    },
  };
}

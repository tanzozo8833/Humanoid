// Close-up of the G1's hearing and voice. Teardown (中邮证券 p.33): a quasi-linear array of 4 silicon
// microphones 20 mm apart on an orange flex PCB, and a 5 W (peak) speaker in the torso cavity.
// The talker's sound wave is drawn expanding (slowed ~400x); each microphone lights when the
// wavefront reaches it, and the direction is estimated from the arrival-time differences (TDOA).
// With the mics in a line, only the angle to the array axis can be measured: a source in front
// and its mirror image behind give the same delays - both candidates are drawn.
import * as THREE from 'three';
import { openCloseup } from '/closeup-shell.js';

const SOUND = 343;                 // m/s
const PITCH = 0.02;                // mic spacing (teardown)
const MICS = [-1.5, -0.5, 0.5, 1.5].map((k) => k * PITCH);   // positions along the array axis (x)

export function open() {
  openCloseup({
    title: 'Micro + loa - robot nghe và nói',
    sub: '4 micro silicon gần thẳng hàng, cách nhau 20 mm (mạch dẻo) · loa 5 W · SDK AudioClient, rt/audio_msg',
    heading: 'Robot biết người nói ở hướng nào',
    camera: { pos: [0.0, 0.75, 0.62], target: [0, 0, 0.05], min: 0.1, max: 4 },
    autoRotate: false,
    toggle: false,
    steps: [
      ['Sóng âm', 'tiếng nói lan ra với tốc độ ~343 m/s.'],
      ['Tới lệch nhau', 'micro gần người nói nhận trước; mic ở hai đầu mảng (cách nhau 60 mm) lệch tối đa ~175 µs.'],
      ['Đo độ trễ', 'chip xử lý so tương quan giữa các cặp micro → độ trễ từng cặp (TDOA).'],
      ['Tính góc', 'cos θ = c·Δt / d: ra góc giữa hướng âm và trục mảng micro.'],
      ['Nhầm trước / sau', 'mảng thẳng hàng không phân biệt được nguồn phía trước với ảnh gương của nó phía sau.'],
      ['Beamforming + trả lời', 'cộng các micro với độ trễ bù để nghe rõ một hướng; nhận dạng giọng → TTS ra loa 5 W.'],
    ],
    extra: `
      <dl class="hud">
        <dt>Hướng thật</dt><dd data-k="true">-</dd>
        <dt>Độ trễ so với mic 1 (µs)</dt><dd data-k="tdoa">-</dd>
        <dt>Góc so với trục mảng</dt><dd data-k="theta">-</dd>
        <dt>Hai hướng khả dĩ</dt><dd data-k="est">-</dd>
      </dl>
      <h5>Từ teardown</h5>
      <dl class="kv">
        <dt>Micro</dt><dd>4 × silicon MEMS, gần thẳng hàng, 20 mm</dd>
        <dt>Mạch</dt><dd>mạch in dẻo màu cam + IC xử lý, cáp về mainboard (đầu "micro")</dd>
        <dt>Loa</dt><dd>5 W đỉnh, trong khoang thân</dd>
      </dl>`,
    note: 'Số micro, khoảng cách 20 mm, loa 5 W: báo cáo tháo rời 中邮证券 + unitree.com/g1. Chỗ lắp chính xác của mảng micro trên thân/đầu chưa rõ. Sóng vẽ chậm lại ~400 lần.',
  }, build);
}

function build(ctx) {
  const { scene, add, mat, basic, label } = ctx;
  const qs = ctx.q;
  const root = new THREE.Group();
  scene.add(root);
  const flex = add(root, new THREE.BoxGeometry(0.09, 0.002, 0.014), mat(0xe3b341, { roughness: 0.6 }));
  label(flex, 'Mạch dẻo 4 micro', [0, 0.004, 0.02], true);
  const chip = add(root, new THREE.BoxGeometry(0.008, 0.002, 0.008), mat(0x0d1117), 0, 0.002, 0.0);
  label(chip, 'IC âm thanh', [0, 0.003, -0.012]);
  const tail = add(root, new THREE.BoxGeometry(0.01, 0.001, 0.08), mat(0xe3b341, { roughness: 0.6 }), 0.0, 0, 0.047);
  label(tail, 'Cáp dẻo → mainboard', [0, 0, 0.04]);
  const mics = MICS.map((x, i) => {
    const m = add(root, new THREE.CylinderGeometry(0.003, 0.003, 0.002, 16), mat(0xa5d6ff, { emissive: 0xa5d6ff, emissiveIntensity: 0.2 }), x, 0.002, 0);
    if (i === 0) label(m, 'Micro MEMS (cách 20 mm)', [0, 0.004, -0.004]);
    return m;
  });
  // speaker
  const spk = new THREE.Group();
  spk.position.set(0, -0.06, 0.2);
  root.add(spk);
  add(spk, new THREE.CylinderGeometry(0.025, 0.025, 0.015, 32), mat(0x30363d, { metalness: 0.6 }));
  const cone = add(spk, new THREE.ConeGeometry(0.023, 0.01, 32, 1, true), mat(0x8b949e, { side: THREE.DoubleSide }), 0, 0.012, 0);
  label(spk, 'Loa 5 W (trong thân)', [0, 0.03, 0.03], true);
  // talker + wavefronts
  const talker = add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.25, 20), mat(0xd29922), 0.4, 0.125, 0);
  label(talker, 'Người nói', [0, 0.16, 0], true);
  const rings = [];
  for (let i = 0; i < 6; i += 1) {
    const r = add(root, new THREE.RingGeometry(0.995, 1, 96), basic(0xd29922, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2;
    rings.push(r);
  }
  const mkArrow = (color) => {
    const g = add(root, new THREE.BoxGeometry(0.35, 0.002, 0.005), basic(color, { transparent: true, opacity: 0.9 }));
    g.geometry.translate(0.175, 0, 0);
    return g;
  };
  const est1 = mkArrow(0x3fb950);
  const est2 = mkArrow(0xf85149);
  label(est1, 'Hướng ước lượng', [0.3, 0.01, 0], true);
  label(est2, 'Ảnh gương (không phân biệt được)', [0.3, 0.01, 0], true);
  const axis = add(root, new THREE.BoxGeometry(0.5, 0.001, 0.001), basic(0x6b7683), 0, 0.001, 0);
  label(axis, 'Trục mảng', [0.25, 0, 0], true);

  const el = (k) => qs(`[data-k="${k}"]`);
  const ui = { true: el('true'), tdoa: el('tdoa'), theta: el('theta'), est: el('est') };
  const src = new THREE.Vector2();
  const deg = (r) => `${((((r * 57.2958) % 360) + 360) % 360).toFixed(0)}°`;
  return {
    update(now) {
      const ang = now * 0.25;                               // talker walks around the robot
      talker.position.set(Math.cos(ang) * 0.42, 0.125, Math.sin(ang) * 0.42);
      src.set(talker.position.x, talker.position.z);
      const period = 1.6;
      rings.forEach((r, i) => {
        const age = (now + i * (period / rings.length)) % period;
        r.scale.setScalar(Math.max(0.001, age * 0.5));
        r.position.set(src.x, 0.005, src.y);
        r.material.opacity = 0.6 * (1 - age / period);
      });
      const t = MICS.map((x) => src.distanceTo(new THREE.Vector2(x, 0)) / SOUND);
      const wave = (now % period) * 0.5;
      mics.forEach((m, i) => { m.material.emissiveIntensity = Math.abs(wave - src.distanceTo(new THREE.Vector2(MICS[i], 0))) < 0.012 ? 2.5 : 0.2; });
      // far-field: path difference between the end mics = d * cos(theta)
      const dd = (t[0] - t[3]) * SOUND;
      const cosT = Math.max(-1, Math.min(1, dd / (MICS[3] - MICS[0])));
      const theta = Math.acos(cosT);                         // 0..pi from +x axis
      est1.rotation.y = -(Math.sin(ang) >= 0 ? theta : -theta);
      est2.rotation.y = -(Math.sin(ang) >= 0 ? -theta : theta);
      cone.position.y = 0.012 + Math.sin(now * 60) * 0.0012;
      ui.true.textContent = deg(ang);
      ui.tdoa.textContent = t.map((ti) => ((ti - t[0]) * 1e6).toFixed(0)).join(' · ');
      ui.theta.textContent = `${(theta * 57.2958).toFixed(0)}°`;
      ui.est.textContent = `${deg(theta)} hoặc ${deg(-theta)}`;
      ctx.setActiveStep(Math.floor((now % 12) / 2));
    },
  };
}

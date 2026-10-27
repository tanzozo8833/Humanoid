// What the page says about each part of the G1. Data only - app.js renders it, the close-up
// viewers (viewers/*.js) animate it.
//
// Every fact carries a source key (SRC below). The main ones:
//   urdf       Unitree URDF g1_29dof_with_hand_rev_1_0 - geometry, link masses, joint axes and
//              limits, sensor frames (d435, mid360, 2 IMUs)
//   zhongyou   China Post Securities teardown of a G1 (2026-03-30, 59 pages, photos) - joint
//              module internals + mass table, gear teeth, bearing part number, mainboard chips,
//              battery 2.5 kg / 46.8 V, wiring (CAN + XT30), cooling, materials, ankle linkage
//   munro      Munro Live teardown via humanoid.guide - hip fans, knee heat spreader, ankle
//   qre        docs.quadruped.de G1 overview (mirror of Unitree's developer docs) - neck
//              electrical interface, PC2 specs, joint index table, Inspire RH56 hand table
//   rllab      unitree_rl_lab - motor family per joint, gear ratio per stage, torque-speed curve
//   idl / sdk  unitree_sdk2 - message fields (MotorState, BmsState, HandState...), topics, PR/AB
//   arxivSec   arXiv 2509.14096 (Alias Robotics) - PC1 software stack, IPs, services
//   arxivPow   arXiv 2606.15915 - identified copper-loss / friction coefficients of the arm
// What no source gives (exact battery side, mic array spot, cell format, IMU chip...) is said
// so in `caveat` and drawn as an estimate in the X-ray view.

export const SRC = {
  urdf: ['Unitree URDF g1_29dof_with_hand_rev_1_0', 'https://github.com/unitreerobotics/unitree_ros/tree/master/robots/g1_description'],
  usd: ['Unitree USD (HuggingFace unitree_model)', 'https://huggingface.co/datasets/unitreerobotics/unitree_model'],
  g1: ['unitree.com/g1 - bảng thông số', 'https://www.unitree.com/g1/'],
  dex3: ['unitree.com/Dex3-1', 'https://www.unitree.com/Dex3-1'],
  zhongyou: ['中邮证券 - báo cáo tháo rời G1 (2026-03)', 'https://pdf.dfcfw.com/pdf/H3_AP202603311820899944_1.pdf'],
  munro: ['Munro Live teardown (humanoid.guide)', 'https://humanoid.guide/unitree-g1-teardown-reveals-actuator-and-cooling-tradeoffs/'],
  jonver: ['JONVER - teardown dây/tản nhiệt', 'https://www.jonver.cn/newsdetail_195'],
  qre: ['QRE G1 docs (bản sao tài liệu Unitree)', 'https://docs.quadruped.de/projects/g1/html/g1_overview.html'],
  rllab: ['unitree_rl_lab - unitree_actuators.py', 'https://github.com/unitreerobotics/unitree_rl_lab/blob/main/source/unitree_rl_lab/unitree_rl_lab/assets/robots/unitree_actuators.py'],
  motorinfo: ['g1_description/motor_info.md', 'https://github.com/unitreerobotics/unitree_ros/blob/master/robots/g1_description/motor_info.md'],
  sdk: ['unitree_sdk2 - example/g1', 'https://github.com/unitreerobotics/unitree_sdk2/tree/main/example/g1'],
  idl: ['unitree_sdk2 - IDL unitree_hg', 'https://github.com/unitreerobotics/unitree_sdk2/tree/main/include/unitree/idl/hg'],
  arxivSec: ['arXiv 2509.14096 - Cybersecurity of a Humanoid Robot', 'https://arxiv.org/abs/2509.14096'],
  arxivPow: ['arXiv 2606.15915 - power model tay G1', 'https://arxiv.org/abs/2606.15915'],
  d435: ['Intel RealSense D400 datasheet', 'https://www.intelrealsense.com/depth-camera-d435i/'],
  mid360: ['Livox Mid-360 User Manual', 'https://terra-1-g.djicdn.com/65c028cd298f4669a7f0e40e50ba1131/Mid360/Livox_Mid-360_User_Manual_EN.pdf'],
  orin: ['NVIDIA Jetson Orin NX', 'https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/'],
  inspire: ['Inspire RH56 (bảng thông số trong docs G1)', 'https://docs.quadruped.de/projects/g1/html/g1_overview.html#five-fingered-dex-hand'],
  dex1: ['unitree.com/Dex1-1', 'https://www.unitree.com/Dex1-1'],
  g1plus: ['G1+ (humanoidsdaily, 2026-09)', 'https://www.humanoidsdaily.com/news/unitree-launches-g1-plus-humanoid-with-stronger-motors-and-moving-neck'],
  g1plusUrdf: ['URDF g1_pl.urdf + motor_info.md (G1+)', 'https://github.com/unitreerobotics/unitree_ros/tree/master/robots/g1_description'],
  manual: ['G1 manual - điều khiển (bản QRE)', 'https://docs.quadruped.de/projects/g1/html/operation_1.4.html'],
  gamepad: ['unitree_sdk2 - gamepad.hpp', 'https://github.com/unitreerobotics/unitree_sdk2/tree/main/example/g1/low_level'],
};

// ---------------------------------------------------------------------------------- model variants
// Each is an official Unitree URDF built to a GLB (model_src/build_g1_model.py).
export const VARIANTS = {
  dex3: { glb: '/robot/g1.glb', label: 'G1 EDU 29 DoF + Dex3-1', urdf: 'g1_29dof_with_hand_rev_1_0', mode: 5, dof: '29 + 2 × 7 = 43' },
  inspire: { glb: '/robot/g1_inspire.glb', label: 'G1 EDU 29 DoF + Inspire RH56', urdf: 'g1_29dof_rev_1_0_with_inspire_hand_FTP', mode: 5, dof: '29 + 2 × 6 (12 khớp)' },
  dex1: { glb: '/robot/g1_dex1.glb', label: 'G1 EDU 29 DoF + tay kẹp Dex1-1', urdf: 'g1_29dof_mode_15_with_dex1_1', mode: 15, dof: '29 + 2 × 1' },
  g1_23: { glb: '/robot/g1_23dof.glb', label: 'G1 bản thường 23 DoF', urdf: 'g1_23dof_rev_1_0', mode: 4, dof: '23' },
  g1plus: { glb: '/robot/g1_plus.glb', label: 'G1+ (2026-09) - có cổ', urdf: 'g1_pl', mode: 18, dof: '31 (12 chân + 3 eo + 14 tay + 2 cổ)' },
};

// ---------------------------------------------------------------------------------- motors
// Joint actuator families. effort/velocity = URDF limits; peak/knee/noLoad = Unitree's measured
// torque-speed curve (rllab: Y1 same-direction peak, Y2 opposite-direction peak, X1 speed at full
// torque, X2 no-load speed); stages = rllab gear ratios. A planetary stage has ratio 1 + ring/sun.
// Teeth are real where a source gives them: N5020 18/14/46 + 16/20/56 (rllab ratios, teardown
// sun/planet counts), N7520-14.3 stage 2 48/22 (rllab); the rest are chosen to give the published
// ratio and flagged `teethIllustrative`. mass/size: zhongyou teardown (small joint, large joint).
export const MOTORS = {
  'N7520-22.5': {
    color: 0xf85149, css: '#f85149', radius: 0.047, length: 0.052, size: 'large',
    role: 'Khớp lớn nhất - hông roll, gối',
    effort: 139, velocity: 20, peakSame: 111, peakOpp: 131, kneeSpeed: 14.5, noLoad: 22.7,
    rotorInertia: '0.489e-4 kg·m²', armature: 0.0251,
    stages: [{ ratio: 4.5, sun: 16, ring: 56, teethIllustrative: true }, { ratio: 5.0, sun: 16, ring: 64, teethIllustrative: true }],
    ratio: 22.5, mass: '~1100 g (khớp lớn, teardown)',
  },
  'N7520-14.3': {
    color: 0xf0883e, css: '#f0883e', radius: 0.047, length: 0.052, size: 'large',
    role: 'Cùng thân motor 7520, hộp số tỉ số thấp hơn → nhanh hơn, ít mô-men hơn',
    effort: 88, velocity: 32, peakSame: 71, peakOpp: 83.3, kneeSpeed: 22.63, noLoad: 35.52,
    rotorInertia: '0.489e-4 kg·m²', armature: 0.0102,
    stages: [{ ratio: 4.5, sun: 16, ring: 56, teethIllustrative: true }, { ratio: 48 / 22 + 1, sun: 22, ring: 48 }],
    ratio: 14.3, mass: '~1100 g (khớp lớn, teardown)',
  },
  'N5020-16': {
    color: 0x4fa3ff, css: '#4fa3ff', radius: 0.034, length: 0.042, size: 'small',
    role: 'Khớp nhỏ - vai, khuỷu, cổ tay roll, cổ chân, eo roll/pitch',
    effort: 25, velocity: 37, peakSame: 24.8, peakOpp: 31.9, kneeSpeed: 30.86, noLoad: 40.13,
    rotorInertia: '0.139e-4 kg·m²', armature: 0.0036,
    stages: [{ ratio: 46 / 18 + 1, sun: 18, ring: 46 }, { ratio: 56 / 16 + 1, sun: 16, ring: 56 }],
    ratio: 16, mass: '525 g, ø~60 × 70 mm (teardown khớp cẳng chân)',
  },
  'W4010-25': {
    color: 0xbc8cff, css: '#bc8cff', radius: 0.025, length: 0.034, size: 'wrist',
    role: 'Motor dẹt - cổ tay pitch/yaw (bản 29 DoF)',
    effort: 5, velocity: 22, peakSame: 4.8, peakOpp: 8.6, kneeSpeed: 15.3, noLoad: 24.76,
    rotorInertia: '0.068e-4 kg·m²', armature: 0.00425,
    stages: [{ ratio: 5, sun: 12, ring: 48, teethIllustrative: true }, { ratio: 5, sun: 12, ring: 48, teethIllustrative: true }],
    ratio: 25,
  },
  'N5010-16': {
    color: 0xd2a8ff, css: '#d2a8ff', radius: 0.026, length: 0.034, size: 'wrist',
    role: 'Motor cổ tay pitch/yaw "5010 mới" (G1 mode 13-18, Dex1), cổ yaw của G1+',
    effort: 13.4, velocity: 27, peakSame: 9.5, peakOpp: 17, kneeSpeed: 27, noLoad: 41.5,
    rotorInertia: '0.084e-4 kg·m²', armature: 0.0021812,
    stages: [{ ratio: 4, sun: 12, ring: 36, teethIllustrative: true }, { ratio: 4, sun: 12, ring: 36, teethIllustrative: true }],
    ratio: 16,
  },
  // G1+ (2026-09) families from motor_info.md - only effort/velocity are published; the T-N corner
  // points below are derived from them (flagged `curveEstimated`), gear stages are illustrative.
  '5019-16': {
    color: 0x58a6ff, css: '#58a6ff', radius: 0.036, length: 0.044, size: 'small', curveEstimated: true,
    role: 'G1+: vai roll/yaw, khuỷu, cổ tay roll, cổ chân, cổ pitch',
    effort: 41, velocity: 34.1, peakSame: 41, peakOpp: 41, kneeSpeed: 22, noLoad: 34.1, armature: 0.004,
    stages: [{ ratio: 4, sun: 12, ring: 36, teethIllustrative: true }, { ratio: 4, sun: 12, ring: 36, teethIllustrative: true }], ratio: 16,
  },
  '6010-32': {
    color: 0x1f6feb, css: '#1f6feb', radius: 0.04, length: 0.036, size: 'small', curveEstimated: true,
    role: 'G1+: vai pitch, eo roll/pitch (mô-men cao, tỉ số 32)',
    effort: 60, velocity: 30.6, peakSame: 60, peakOpp: 60, kneeSpeed: 20, noLoad: 30.6, armature: 0.01,
    stages: [{ ratio: 4, sun: 12, ring: 36, teethIllustrative: true }, { ratio: 8, sun: 10, ring: 70, teethIllustrative: true }], ratio: 32,
  },
  '7519-14.3': {
    color: 0xf0883e, css: '#f0883e', radius: 0.047, length: 0.05, size: 'large', curveEstimated: true,
    role: 'G1+: eo yaw, hông yaw',
    effort: 77, velocity: 34.9, peakSame: 77, peakOpp: 77, kneeSpeed: 22.6, noLoad: 34.9, armature: 0.0102,
    stages: [{ ratio: 4.5, sun: 16, ring: 56, teethIllustrative: true }, { ratio: 48 / 22 + 1, sun: 22, ring: 48 }], ratio: 14.3,
  },
  '7519-22.5': {
    color: 0xf85149, css: '#f85149', radius: 0.047, length: 0.05, size: 'large', curveEstimated: true,
    role: 'G1+: hông pitch/roll, gối',
    effort: 121, velocity: 22.1, peakSame: 121, peakOpp: 121, kneeSpeed: 14.5, noLoad: 22.1, armature: 0.0251,
    stages: [{ ratio: 4.5, sun: 16, ring: 56, teethIllustrative: true }, { ratio: 5.0, sun: 16, ring: 64, teethIllustrative: true }], ratio: 22.5,
  },
  'M4010 (Dex1)': {
    color: 0x79c0ff, css: '#79c0ff', radius: 0.02, length: 0.03, hand: true,
    role: 'Motor của tay kẹp Dex1-1: 1 motor kéo 2 ngón trượt song song',
    effort: 5, velocity: 27, ratio: 25,
  },
  'F-1515-214': {
    color: 0x3fb950, css: '#3fb950', radius: 0.008, length: 0.03, hand: true,
    role: 'Motor ngón tay Dex3-1 (45 g, 34.8 × 23.1 × 23.3 mm)',
    effort: 1.4, velocity: 12, peakSame: 0.86, peakOpp: 3.1, idealTorque: 1.498, noLoad: 11,
    ratio: 214,
  },
  'F-1515 + bánh răng': {
    color: 0x7ee787, css: '#7ee787', radius: 0.009, length: 0.03, hand: true,
    role: 'Khớp xoay ngón cái - motor duy nhất truyền qua bánh răng ngoài',
    effort: 2.45, velocity: 3.14,
  },
};

// Real teardown of one small joint (N5020-16 on the calf, drives the ankle rods) - zhongyou p.20-24, 43.
export const SMALL_JOINT_TEARDOWN = {
  order: ['Nắp sau', 'Bo driver (PCB tròn)', 'Rotor nam châm', 'Vỏ (chứa stator)', 'Hành tinh tầng 1', 'Hành tinh tầng 2 + ổ bi', 'Nắp trước', 'Mặt bích ra / tay quay'],
  masses: [
    ['Stator (dây đồng + keo bọc)', 94.3], ['Rotor - nam châm vĩnh cửu', 42.9], ['Moay-ơ nam châm (nhôm + bạc nhựa)', 16.9],
    ['Bánh mặt trời tầng 1 (thép)', 8], ['Tầng 1: hành tinh + giá + mặt trời tầng 2 (thép)', 25.3], ['Vành răng tầng 1 (thép)', 24.1],
    ['Tầng 2: hành tinh + giá (nhôm) + ổ bi đũa chéo', 74], ['Vành răng tầng 2 (thép)', 23.8], ['Bo driver (PCB)', 12.8],
    ['2 ổ bi nhỏ (thép)', 11], ['Vỏ (nhôm)', 79.3], ['2 nắp (nhôm)', 23.7], ['Mặt bích ra (thép)', 50.8], ['Khác', 38.1],
  ],
  bearing: 'Luoyang Bearna (LYBN) CRBT355A 10E4J3 - ổ bi đũa chéo thành mỏng, lỗ 35 mm, tiết diện 5 mm, cấp chính xác 10, khe hở nhóm 4',
  speed: 'rotor 3000 – 5000 rpm',
  bus: 'CAN (2 dây H/L) + nguồn XT30, nối chuỗi khớp này sang khớp kia, dây chui qua tâm trục rỗng',
};

// Identified copper-loss coefficient b (W per (N·m)²) of the arm joints - arxivPow Table I:
// extra power ≈ b · Δτ², i.e. heat grows with the square of the torque.
export const ARM_COPPER_B = {
  shoulder_pitch: 0.4184, shoulder_roll: 0.3563, shoulder_yaw: 0.2799, elbow: 0.3942,
  wrist_roll: 0, wrist_pitch: 0.3768, wrist_yaw: 0,
};

// Motor family per joint and model variant. G1 rev 1.0 (dex3 / inspire / g1_23): rllab
// UNITREE_G1_29DOF_CFG. Mode 15 (dex1): hip pitch + roll on the 22.5 gearbox and the new 5010 wrist
// (README table + URDF limits). G1+ (g1plus): motor_info.md. Hands: DEX3 + URDF limits.
export function motorOf(joint, variant = 'dex3') {
  if (/dex1_finger/.test(joint)) return 'M4010 (Dex1)';
  if (variant === 'g1plus') {
    if (/neck_yaw|wrist_pitch|wrist_yaw/.test(joint)) return 'N5010-16';
    if (/shoulder_pitch|waist_roll|waist_pitch/.test(joint)) return '6010-32';
    if (/waist_yaw|hip_yaw/.test(joint)) return '7519-14.3';
    if (/hip_pitch|hip_roll|knee/.test(joint)) return '7519-22.5';
    if (/shoulder|elbow|wrist_roll|ankle|neck_pitch/.test(joint)) return '5019-16';
  }
  if (variant === 'dex1') {
    if (/hip_pitch/.test(joint)) return 'N7520-22.5';
    if (/wrist_pitch|wrist_yaw/.test(joint)) return 'N5010-16';
  }
  if (/hip_roll|knee/.test(joint)) return 'N7520-22.5';
  if (/hip_pitch|hip_yaw|waist_yaw/.test(joint)) return 'N7520-14.3';
  if (/wrist_pitch|wrist_yaw/.test(joint)) return 'W4010-25';
  if (/hand_thumb_0/.test(joint)) return 'F-1515 + bánh răng';
  if (/hand_/.test(joint)) return 'F-1515-214';
  if (/shoulder|elbow|wrist_roll|ankle|waist_roll|waist_pitch/.test(joint)) return 'N5020-16';
  return null;
}

// Joints driven through a two-motor parallel linkage (SDK Mode::PR / Mode::AB): the URDF models
// them as a serial pitch + roll pair, the firmware maps that to motors A and B.
export const isParallel = (joint) => /ankle|waist_roll|waist_pitch/.test(joint);

// LowCmd/LowState motor index (SDK G1JointIndex, rllab joint_sdk_names, qre joint table).
export const SDK_ORDER = [
  'left_hip_pitch_joint', 'left_hip_roll_joint', 'left_hip_yaw_joint', 'left_knee_joint',
  'left_ankle_pitch_joint', 'left_ankle_roll_joint',
  'right_hip_pitch_joint', 'right_hip_roll_joint', 'right_hip_yaw_joint', 'right_knee_joint',
  'right_ankle_pitch_joint', 'right_ankle_roll_joint',
  'waist_yaw_joint', 'waist_roll_joint', 'waist_pitch_joint',
  'left_shoulder_pitch_joint', 'left_shoulder_roll_joint', 'left_shoulder_yaw_joint', 'left_elbow_joint',
  'left_wrist_roll_joint', 'left_wrist_pitch_joint', 'left_wrist_yaw_joint',
  'right_shoulder_pitch_joint', 'right_shoulder_roll_joint', 'right_shoulder_yaw_joint', 'right_elbow_joint',
  'right_wrist_roll_joint', 'right_wrist_pitch_joint', 'right_wrist_yaw_joint',
];

// Dex3-1 HandCmd/HandState motor index per hand (DEX3 joint list order).
export const HAND_ORDER = ['thumb_0', 'thumb_1', 'thumb_2', 'middle_0', 'middle_1', 'index_0', 'index_1'];

const JOINT_WORDS = {
  hip_pitch: ['Hông pitch', 'đưa đùi ra trước / ra sau (gập hông)'],
  hip_roll: ['Hông roll', 'dạng / khép chân sang ngang'],
  hip_yaw: ['Hông yaw', 'xoay đùi quanh trục dọc của chân'],
  knee: ['Gối', 'gập / duỗi cẳng chân'],
  ankle_pitch: ['Cổ chân pitch', 'mũi chân lên / xuống'],
  ankle_roll: ['Cổ chân roll', 'nghiêng bàn chân trong / ngoài'],
  waist_yaw: ['Eo yaw', 'xoay thân trên trái / phải'],
  waist_roll: ['Eo roll', 'nghiêng thân sang ngang'],
  waist_pitch: ['Eo pitch', 'cúi / ngửa thân'],
  shoulder_pitch: ['Vai pitch', 'đưa tay ra trước / ra sau'],
  shoulder_roll: ['Vai roll', 'dang tay sang ngang'],
  shoulder_yaw: ['Vai yaw', 'xoay cánh tay quanh trục của nó'],
  elbow: ['Khuỷu', 'gập / duỗi cẳng tay'],
  wrist_roll: ['Cổ tay roll', 'xoay cẳng tay (sấp / ngửa)'],
  wrist_pitch: ['Cổ tay pitch', 'gập cổ tay lên / xuống'],
  wrist_yaw: ['Cổ tay yaw', 'lắc cổ tay sang hai bên'],
  hand_thumb_0: ['Ngón cái 0', 'xoay cả ngón cái quanh gốc (đối ngón)'],
  hand_thumb_1: ['Ngón cái 1', 'gập đốt gốc ngón cái'],
  hand_thumb_2: ['Ngón cái 2', 'gập đốt ngọn ngón cái'],
  hand_index_0: ['Ngón trỏ 0', 'gập đốt gốc ngón trỏ'],
  hand_index_1: ['Ngón trỏ 1', 'gập đốt ngọn ngón trỏ'],
  hand_middle_0: ['Ngón giữa 0', 'gập đốt gốc ngón giữa'],
  hand_middle_1: ['Ngón giữa 1', 'gập đốt ngọn ngón giữa'],
  // Inspire RH56 (5 fingers, 6 actuated, distal joints follow by linkage = URDF <mimic>)
  thumb_1: ['Ngón cái xoay (Inspire)', 'xoay ngón cái sang ngang'],
  thumb_2: ['Ngón cái gập (Inspire)', 'gập ngón cái'],
  thumb_3: ['Ngón cái đốt giữa (Inspire)', 'đi theo ngón cái gập qua thanh nối'],
  thumb_4: ['Ngón cái đốt ngọn (Inspire)', 'đi theo qua thanh nối'],
  index_1: ['Ngón trỏ (Inspire)', 'gập ngón trỏ'], index_2: ['Ngón trỏ đốt ngọn (Inspire)', 'đi theo qua thanh nối'],
  middle_1: ['Ngón giữa (Inspire)', 'gập ngón giữa'], middle_2: ['Ngón giữa đốt ngọn (Inspire)', 'đi theo qua thanh nối'],
  ring_1: ['Ngón áp út (Inspire)', 'gập ngón áp út'], ring_2: ['Ngón áp út đốt ngọn (Inspire)', 'đi theo qua thanh nối'],
  little_1: ['Ngón út (Inspire)', 'gập ngón út'], little_2: ['Ngón út đốt ngọn (Inspire)', 'đi theo qua thanh nối'],
};

/** {side, short, what} for a URDF joint name, e.g. left_knee_joint -> {Trái, Gối, gập...}. */
export function describeJoint(joint) {
  const side = joint.startsWith('left_') ? 'trái' : joint.startsWith('right_') ? 'phải' : '';
  const key = joint.replace(/^(left|right)_/, '').replace(/_joint$/, '');
  const [short, what] = JOINT_WORDS[key] || [key, ''];
  return { side, short: side ? `${short} ${side}` : short, what, key };
}

// ---------------------------------------------------------------------------------- hotspots
// Clickable markers for parts with no mesh of their own. `frame` = GLB node (URDF link) the
// marker is parented to; `pos` = offset in that frame (ROS axes: x forward, y left, z up, m).
// The four sensor frames are the URDF's; the rest are placed from the teardown photos (main board
// in the back, neck ports on the back of the neck, fans in hip/waist) and are estimates.
export const HOTSPOTS = {
  d435: { frame: 'd435_link', pos: [0, 0, 0], color: 0x58a6ff, part: 'depth_camera' },
  mid360: { frame: 'mid360_link', pos: [0, 0, 0], color: 0x3fb950, part: 'lidar' },
  imu_torso: { frame: 'imu_in_torso', pos: [0, 0, 0], color: 0xbc8cff, part: 'imu' },
  imu_pelvis: { frame: 'imu_in_pelvis', pos: [0, 0, 0], color: 0xbc8cff, part: 'imu' },
  battery: { frame: 'torso_link', pos: [0.012, 0.03, 0.1], color: 0xf85149, part: 'battery' },
  mainboard: { frame: 'torso_link', pos: [-0.052, 0.0, 0.15], color: 0xd29922, part: 'compute' },
  jetson: { frame: 'torso_link', pos: [-0.048, 0.0, 0.235], color: 0x76b900, part: 'compute' },
  mic: { frame: 'torso_link', pos: [0.068, 0, 0.36], color: 0xa5d6ff, part: 'audio' },
  speaker: { frame: 'torso_link', pos: [0.06, 0, 0.04], color: 0xa5d6ff, part: 'audio' },
  ports: { frame: 'torso_link', pos: [-0.058, 0, 0.3], color: 0xffa657, part: 'ports' },
  ledstrip: { frame: 'torso_link', pos: [0.085, 0.045, 0.43], color: 0xff7b72, part: 'head' },
  hipfan: { frame: 'pelvis', pos: [-0.035, 0.0, -0.05], color: 0x79c0ff, part: 'cooling' },
  waistfan: { frame: 'waist_yaw_link', pos: [-0.04, 0.0, 0.03], color: 0x79c0ff, part: 'cooling' },
  kneevc: { frame: 'left_hip_yaw_link', pos: [-0.078, 0.045, -0.177], color: 0xe3b341, part: 'cooling' },
  capbank: { frame: 'left_knee_link', pos: [-0.035, 0.0, -0.2], color: 0xffa657, part: 'wiring' },
  plusCam: { frame: 'camera_left_reference_link', pos: [0, 0, 0], color: 0x58a6ff, part: 'neck' },
  plusLidar: { frame: 'lidar_reference_link', pos: [0, 0, 0], color: 0x3fb950, part: 'neck' },
};

// ---------------------------------------------------------------------------------- parts
const SIDES = (names) => ['left', 'right'].flatMap((s) => names.map((n) => `${s}_${n}`));

export const PARTS = {
  // ------------------------------------------------------------------ head + sensors
  head: {
    title: 'Đầu', tag: 'Hộp cảm biến cố định · camera + LiDAR + LED + board đầu', icon: '◐', color: '#9aa6b2',
    links: ['head_link'], hotspots: ['ledstrip'],
    body: 'Trên bản 23/29 DoF đầu bắt cứng vào thân (head_joint là fixed) - không có cổ. Ảnh tháo rời cho thấy bên trong: '
      + 'camera RealSense D435i ở trán, LiDAR Livox MID-360 ngay bên dưới, lắp úp ngược nhìn qua khoang mặt, một dải LED RGB '
      + 'viền quanh mặt kèm board điều khiển LED, và một board MCU riêng của đầu nối về mainboard trong thân bằng cáp vi sai tốc độ cao.',
    inside: [
      ['Camera D435i', 'ở trán, chúc xuống 47.6° (URDF d435_joint pitch 0.8308 rad)'],
      ['LiDAR MID-360', 'dưới camera, roll 180° (lắp úp), pitch 2.9° → vùng nhìn hướng xuống đất'],
      ['Dải LED RGB + board LED', 'viền quanh mặt - báo trạng thái robot'],
      ['Board MCU của đầu', 'gom cảm biến, nối về thân bằng cáp vi sai tốc độ cao'],
      ['Vỏ nhựa đen', 'khung trong + kính mặt cho tia laser / IR đi qua'],
    ],
    specs: [['Khối lượng (URDF)', '1.036 kg'], ['Bậc tự do', '0 (fixed); G1+ (g1_pl.urdf, 2026-09) có cổ pitch/yaw'], ['Gắn vào', 'torso_link']],
    related: ['depth_camera', 'lidar', 'ports', 'audio'],
    closeup: { type: 'head' },
    caveat: 'Vị trí từng linh kiện trong đầu đặt theo ảnh tháo rời + toạ độ URDF của camera/LiDAR; kích thước board là ước lượng.',
    sources: ['urdf', 'zhongyou', 'jonver'],
  },
  depth_camera: {
    title: 'Intel RealSense D435i', tag: 'Camera chiều sâu stereo hồng ngoại + RGB + IMU', icon: '◉', color: '#58a6ff',
    hotspots: ['d435'],
    body: 'Đo khoảng cách bằng stereo: hai imager hồng ngoại cách nhau 50 mm chụp cùng một cảnh, chip Vision Processor D4 '
      + 'tìm điểm tương ứng và tính độ sâu từ độ lệch (disparity) ngay trong camera. Máy chiếu IR 850 nm phủ một mẫu chấm lên bề '
      + 'mặt trơn để vẫn tìm được điểm khớp. Thêm camera màu và IMU. Trên G1 nó nằm ở trán, chúc xuống để nhìn tay và mặt bàn.',
    inside: [
      ['2 imager IR global-shutter', 'OmniVision OV9282 (loại "wide"), 1280 × 800, baseline 50 mm'],
      ['Máy chiếu IR', 'laser class 1, 850 nm - tạo texture cho bề mặt trơn'],
      ['Camera RGB', 'OV2740 2 MP, rolling shutter, 69° × 42°'],
      ['Vision Processor D4', 'ASIC 28 nm tính bản đồ độ sâu trong camera'],
      ['IMU BMI055', 'gia tốc + con quay, đồng bộ thời gian với ảnh'],
      ['USB-C 3.1 Gen 1', 'ra board đầu / máy tính'],
    ],
    specs: [
      ['FOV độ sâu', '87° × 58°'], ['Độ phân giải', '1280 × 720 @ 30 fps · 848 × 480 @ 90 fps'],
      ['Gần nhất (Min-Z)', '~10 cm'], ['Sai số', '< 2% ở 2 m'], ['Kích thước', '90 × 25 × 25 mm'],
      ['Vị trí (URDF)', 'torso_link (0.058, 0.018, 0.430) m, chúc 47.6°'],
    ],
    caveat: 'OV9282 / OV2740 lấy theo trả lời của Intel trên diễn đàn, không phải datasheet chính thức.',
    closeup: { type: 'depthcam' },
    sources: ['urdf', 'zhongyou', 'd435'],
  },
  lidar: {
    title: 'Livox MID-360', tag: 'LiDAR 3D 360° × 59° · quét không lặp · lắp úp', icon: '◎', color: '#3fb950',
    hotspots: ['mid360'],
    body: 'Đo khoảng cách bằng thời gian bay (ToF) của xung laser 905 nm. Bộ phát và bộ thu đứng yên - Livox nhấn mạnh "không có '
      + 'linh kiện điện tử quay"; chỉ khối quang học quét quay để lái tia. Ở chế độ không lặp, mỗi 0.1 s tia đi một quỹ đạo khác: '
      + '0.1 s phủ tương đương LiDAR 32 tia, 0.5 s phủ ~70% vùng nhìn. Trên G1 nó lắp úp trong đầu nên vùng −7°…+52° '
      + 'thành nhìn xuống: thấy sàn, bậc thang, vật cản quanh chân.',
    inside: [
      ['Laser 905 nm', 'class 1 (IEC 60825-1:2014), an toàn mắt'],
      ['Khối quang quét quay', 'lái tia; bộ phát / thu cố định (bài ISPRS 2025 mô tả là gương quay)'],
      ['Bộ thu + mạch đo ToF', 'đo thời gian đi về của xung, ra khoảng cách'],
      ['IMU ICM40609', '6 trục, đẩy dữ liệu 200 Hz'],
      ['Đầu nối M12 A-code 12 chân', 'nguồn 9–27 V + Ethernet 100BASE-TX + đồng bộ PTP/GPS'],
    ],
    specs: [
      ['FOV', '360° × 59° (−7°…+52°; trên G1 lật thành −52°…+7°)'],
      ['Tầm', '40 m @ 10% · 70 m @ 80% · mù gần 0.1 m'], ['Sai số', '≤ 2 cm @ 10 m · góc ≤ 0.15°'],
      ['Tốc độ', '200 000 điểm/s · 10 Hz'], ['Nguồn', '9–27 V, 6.5 W · 265 g · 65 × 65 × 60 mm · IP67'],
      ['IP trên G1', '192.168.123.120 (sơ đồ arXiv; một hướng dẫn cộng đồng ghi .20)'],
      ['Vị trí (URDF)', 'torso_link (0, 0, 0.428) m, roll 180°, pitch 2.9°'],
    ],
    caveat: 'Livox không công bố cấu trúc quang học bên trong; hình vẽ là sơ đồ nguyên lý.',
    closeup: { type: 'lidar' },
    sources: ['urdf', 'zhongyou', 'mid360', 'arxivSec'],
  },
  audio: {
    title: 'Micro + loa', tag: '4 micro silicon gần thẳng hàng (cách 20 mm) · loa 5 W', icon: '♪', color: '#a5d6ff',
    hotspots: ['mic', 'speaker'],
    variants: { mic: 'Mảng 4 micro silicon trên mạch dẻo, cách nhau 20 mm', speaker: 'Loa 5 W (đỉnh) - trong thân' },
    body: 'Bốn micro silicon (MEMS) xếp gần thẳng hàng, cách nhau 20 mm, trên mạch in dẻo. Tiếng nói tới mỗi micro lệch nhau vài '
      + 'chục micro-giây; từ độ trễ đó DSP tính hướng người nói và lọc ồn (beamforming). Vì mảng thẳng hàng nên nó phân biệt tốt '
      + 'trái/phải nhưng khó phân biệt trước/sau. Loa 5 W phát TTS; SDK có AudioClient và topic rt/audio_msg.',
    inside: [
      ['4 micro MEMS silicon', 'gần thẳng hàng, khoảng cách 20 mm, trên mạch dẻo màu cam'],
      ['IC xử lý âm thanh trên mạch micro', 'số hoá + gửi về mainboard (dây "micro" cắm trên mainboard)'],
      ['Loa 5 W', 'nằm trong khoang thân'],
    ],
    specs: [['Micro', '4, cách 20 mm'], ['Loa', '5 W đỉnh'], ['SDK', 'g1::AudioClient · rt/audio_msg']],
    caveat: 'Ảnh tháo rời có mạch micro và loa nhưng không chỉ rõ chỗ lắp mảng micro; vị trí trong mô hình là ước lượng.',
    closeup: { type: 'audio' },
    sources: ['zhongyou', 'g1', 'sdk'],
  },
  ports: {
    title: 'Cổng mở rộng sau gáy', tag: '3 nguồn XT30 · 2 Gigabit · 4 USB-C · GPIO', icon: '⌁', color: '#ffa657',
    hotspots: ['ports'],
    body: 'Bảng cổng ở sau gáy để gắn thêm thiết bị (camera, tay, máy tính ngoài). Nguồn lấy từ pin; các cổng dữ liệu và GPIO đi '
      + 'thẳng vào máy tính phát triển Jetson Orin NX (PC2).',
    inside: [
      ['XT30 #1 - VBAT', 'nối thẳng pin (~39–54.6 V)'], ['XT30 #2 - 24 V', '5 A'], ['XT30 #3 - 12 V', '5 A'],
      ['2 × RJ45', 'Gigabit Ethernet 1000BASE-T vào mạng 192.168.123.x'],
      ['3 × USB-C', 'USB 3.0 host, cấp 5 V 1.5 A'], ['1 × USB-C Alt Mode', 'USB 3.2 + DisplayPort 1.4 (cắm màn hình)'],
      ['Đầu 5577 - I/O OUT', '12 V 3 A'],
      ['GPIO 1–6', 'UART1 TX/RX (pin 203/205), I2C2 SCL/SDA (232/234), GPIO (128/130) của module Orin NX'],
    ],
    specs: [['Vị trí', 'mặt sau cổ'], ['Nguồn dữ liệu', 'Jetson Orin NX (PC2, 192.168.123.164)']],
    closeup: { type: 'ports' },
    caveat: 'Thứ tự xếp cổng trên tấm vẽ theo bảng, không phải bản vẽ cơ khí.',
    sources: ['qre'],
  },

  // ------------------------------------------------------------------ torso
  torso: {
    title: 'Thân trên (torso)', tag: 'Vỏ nhựa ABS/PA · mainboard sau lưng · pin', icon: '▣', color: '#9aa6b2',
    links: ['torso_link', 'logo_link'],
    body: 'Khâu nặng nhất (6.78 kg trong URDF). Vỏ là nhựa kỹ thuật ABS/PA + silicone (nhẹ, đỡ va đập khi ngã). Mở lưng ra: mainboard '
      + 'nằm sát lưng, được che 3 lớp (vỏ lưng + mút xốp + tấm nhựa lót), có tản nhiệt nhôm + quạt ly tâm; bản EDU thêm Jetson Orin NX '
      + 'phía trên với ống đồng + quạt riêng. Pin tháo nhanh cắm vào khoang trong thân. Mainboard là "trung tâm dây": mọi nhánh '
      + 'nguồn + CAN của tay, chân, đầu đều cắm về đây.',
    inside: [
      ['Mainboard RK3588S (PC1)', 'sát lưng, tản nhôm + quạt ly tâm'],
      ['Jetson Orin NX (EDU, PC2)', 'phía trên mainboard, ống dẫn nhiệt đồng + quạt + tấm VC'],
      ['Pin 13S 9 Ah (2.5 kg)', 'khoang trong thân, tháo nhanh, có dây kéo'],
      ['Loa 5 W', 'trong khoang thân'],
      ['IMU thân', 'imu_in_torso → rt/secondary_imu'],
      ['Đầu cắm trên mainboard', 'pin + phản hồi pin · quạt · chân (nguồn + CAN) · tay trái/phải (nguồn + CAN) · đầu (nguồn) · LiDAR · camera · micro · LED đầu'],
      ['Cổng mở rộng sau gáy', 'XT30, RJ45, USB-C, GPIO'],
    ],
    specs: [
      ['Khối lượng (URDF)', '6.78 kg (torso) + 1.04 kg (đầu)'], ['Vật liệu vỏ', 'ABS/PA + silicone'],
      ['Khớp vai', 'cách tâm ±0.100 m, cao 0.248 m (URDF)'],
    ],
    related: ['compute', 'battery', 'ports', 'imu', 'cooling', 'wiring', 'waist'],
    closeup: { type: 'torso' },
    caveat: 'Pin cắm từ bên sườn (manual: "khoang ở bên robot, công tắc hướng ra sau"); sườn nào thì tài liệu không nói - mô hình đặt bên trái.',
    sources: ['urdf', 'zhongyou', 'arxivSec', 'jonver'],
  },
  battery: {
    title: 'Pin 13S 9000 mAh', tag: '46.8 V · 0.42 kWh · ~2.5 kg · tháo nhanh', icon: '⚡', color: '#f85149',
    hotspots: ['battery'],
    body: '13 nhóm cell lithium nối tiếp (13S): 13 × 3.6 V = 46.8 V danh định, sạc đầy 54.6 V. 9 Ah → 0.42 kWh, nặng ~2.5 kg, chạy 1–2 giờ '
      + '(≈ 200–400 W trung bình). BMS trong pack đo áp từng cell, 12 điểm nhiệt (NTC), dòng, SOC/SOH, số chu kỳ - đúng các trường của '
      + 'message BmsState_ trong SDK. Mặt pin có 2 lẫy kéo, 4 LED báo mức, công tắc nguồn.',
    inside: [
      ['13 nhóm cell nối tiếp', 'mỗi nhóm 3.0 – 4.2 V'],
      ['BMS', 'đo cell_vol[], temperature[12], current, soc, soh, cycle (BmsState_)'],
      ['NTC trong pack', 'chống quá nhiệt (teardown)'],
      ['MOSFET ngắt + cầu chì', 'bảo vệ quá dòng / ngắn mạch'],
      ['Mặt pin: 2 lẫy + 4 LED + công tắc', 'LED nháy 1 lần/giây khi đang sạc, tắt khi đầy'],
      ['Đầu nối pin', 'nguồn + dây phản hồi BMS cắm vào mainboard'],
    ],
    specs: [
      ['Cấu hình', '13S lithium, 9000 mAh'], ['Điện áp', '46.8 V danh định · 54.6 V đầy'],
      ['Năng lượng / khối lượng', '0.42 kWh · ~2.5 kg'], ['Sạc', 'bộ sạc 54.6 V 5.5 A (300 W) - quảng cáo "54 V 5 A"'], ['Chạy', '1 – 2 giờ'],
    ],
    caveat: 'Loại cell và cách xếp bên trong chưa có ảnh tháo rời - vẽ 13S3P cell 18650 (3 Ah) là giả định cho đủ 9 Ah.',
    closeup: { type: 'battery' },
    sources: ['zhongyou', 'g1', 'idl', 'qre'],
  },
  compute: {
    title: 'Máy tính & mạng', tag: 'PC1 RK3588S (Unitree) + PC2 Jetson Orin NX (EDU)', icon: '▦', color: '#d29922',
    hotspots: ['mainboard', 'jetson'],
    variants: {
      mainboard: 'PC1 - mainboard RK3588S, 192.168.123.161, chạy điều khiển chuyển động của Unitree',
      jetson: 'PC2 - Jetson Orin NX 16 GB, 192.168.123.164, máy để bạn chạy code (bản EDU)',
    },
    body: 'Hai máy tính. PC1 là mainboard sau lưng với Rockchip RK3588S (8 nhân: 4× A76 + 4× A55, GPU Mali-G610, NPU 6 TOPS), 8 GB RAM, '
      + 'eMMC 64 GB, chạy Ubuntu 20.04 với kernel thời gian thực 5.10-rt và các service của Unitree (đi bộ, ước lượng trạng thái, OTA, '
      + 'app, giọng nói...) - người dùng không nạp code vào đây. PC2 (bản EDU) là Jetson Orin NX 16 GB cho perception / AI. Hai máy và '
      + 'LiDAR nói chuyện qua switch Ethernet bằng DDS: rt/lowstate (trạng thái 29 motor + IMU) và rt/lowcmd (lệnh từng motor + CRC32), '
      + 'chu kỳ 2 ms trong ví dụ SDK. Xuống các khớp, mainboard dùng bus CAN.',
    inside: [
      ['RK3588S (8 nm)', '4× Cortex-A76 + 4× Cortex-A55 · Mali-G610 MC4 · NPU 6 TOPS'],
      ['RAM', '2 × BIWIN BMW2CX32H2A-32G-X = 8 GB'], ['Lưu trữ', 'FORESEE FEMDNN064G-58AAA eMMC 64 GB'],
      ['Module WiFi 6 / BT 5.2', 'có vỏ chắn nhiễu trên mainboard'],
      ['PMIC + MOSFET công suất + tụ lọc', 'cấp nguồn + chia nguồn cho các nhánh khớp'],
      ['Jetson Orin NX 16 GB (EDU)', '8× A78AE 2 GHz · GPU 1024 CUDA + 32 Tensor · 100 TOPS · SSD 2 TB'],
      ['Switch Ethernet', 'mạng 192.168.123.0/24, không DHCP'],
      ['Phần mềm PC1', 'Ubuntu 20.04.5 · Linux 5.10.176-rt86 · CycloneDDS 0.10.2 · master_service quản lý ai_sport, state_estimator, robot_state_service, vui_service, webrtc...'],
    ],
    specs: [
      ['Lệnh khớp', 'rt/lowcmd · LowCmd_: mode_pr, mode_machine, 35 × MotorCmd_ (mode, q, dq, tau, kp, kd), crc'],
      ['Trạng thái', 'rt/lowstate · LowState_: imu_state, 35 × MotorState_, wireless_remote[40], tick, crc'],
      ['MotorState_', 'q, dq, ddq, tau_est, temperature[2], vol, sensor[2] (2 encoder), motorstate'],
      ['Khác', 'rt/secondary_imu · rt/dex3/*/cmd|state · rt/arm_sdk · rt/audio_msg · rt/wirelesscontroller'],
      ['DDS', 'RTPS cổng 7400/7401'],
    ],
    caveat: 'Unitree che nhãn các chip còn lại trên mainboard (chống sao chép) - chỉ đọc được SoC, RAM, eMMC.',
    closeup: { type: 'compute' },
    sources: ['zhongyou', 'arxivSec', 'qre', 'idl', 'sdk', 'orin'],
  },
  imu: {
    title: 'IMU × 2', tag: 'Pelvis (chính) + thân (phụ)', icon: '✥', color: '#bc8cff',
    hotspots: ['imu_pelvis', 'imu_torso'],
    variants: {
      imu_pelvis: 'IMU pelvis - LowState.imu_state, dùng cho cân bằng khi đi',
      imu_torso: 'IMU thân - rt/secondary_imu, cho biết tư thế thân trên khi eo xoay',
    },
    body: 'IMU = gia tốc kế 3 trục + con quay 3 trục (MEMS). Gia tốc kế cảm nhận trọng lực → biết robot nghiêng bao nhiêu; con quay '
      + 'đo tốc độ quay → bắt chuyển động nhanh. Bộ lọc trộn hai nguồn ra quaternion / roll-pitch-yaw. G1 có 2 IMU vì thân có thể '
      + 'xoay so với hông qua 3 khớp eo. Message IMUState_: quaternion[4], gyroscope[3], accelerometer[3], rpy[3], temperature.',
    inside: [
      ['Gia tốc kế MEMS', 'khối thử treo trên lò xo silicon, đo lệch bằng tụ điện'],
      ['Con quay MEMS', 'khối rung - lực Coriolis lệch theo tốc độ quay'],
      ['Bộ lọc tư thế', 'ra quaternion / rpy trong IMUState_'],
    ],
    specs: [
      ['IMU pelvis (URDF)', 'pelvis (0.045, 0, −0.083) m'], ['IMU thân (URDF)', 'torso_link (−0.040, −0.002, 0.148) m'],
      ['Dữ liệu', 'quaternion, gyroscope, accelerometer, rpy, temperature'],
    ],
    caveat: 'Unitree không công bố chip IMU. Vị trí lấy từ frame imu_in_pelvis / imu_in_torso trong URDF.',
    closeup: { type: 'imu' },
    sources: ['urdf', 'idl', 'sdk'],
  },
  cooling: {
    title: 'Tản nhiệt', tag: 'Quạt ở mainboard, hông, eo · tấm VC đồng ở gối', icon: '❄', color: '#79c0ff',
    hotspots: ['hipfan', 'waistfan', 'kneevc'],
    variants: {
      hipfan: 'Hai quạt ly tâm ở vùng hông - thổi gió qua rãnh gia công quanh actuator',
      waistfan: 'Quạt ly tâm nhỏ trong module khớp eo - hút nhiệt motor + mạch driver',
      kneevc: 'Gối: tấm VC / tản đồng ôm stator + băng đồng dẫn nhiệt ra khung nhôm',
    },
    body: 'Phần lớn là tản thụ động: vỏ actuator bằng nhôm có cánh, ôm chặt motor và truyền nhiệt sang khung. Chủ động chỉ ở chỗ nóng '
      + 'nhất: mainboard (tản nhôm + quạt; EDU thêm ống đồng + VC cho Jetson), vùng hông (2 quạt ly tâm, gió đi trong rãnh gia công '
      + 'quanh actuator) và module khớp eo (quạt ly tâm nhỏ). Gối - khớp nặng tải nhất - có tấm VC / tản đồng ép vào stator và băng đồng '
      + 'dẫn nhiệt ra khung. NTC ở SoC, BMS và các khớp tải cao; quá ngưỡng thì giảm dòng (derating) và cho quạt chạy hết cỡ.',
    inside: [
      ['Mainboard', 'tản nhôm + quạt ly tâm; EDU: ống đồng + quạt + VC cho Orin NX'],
      ['Hông', '2 quạt ly tâm + rãnh dẫn gió (Munro)'],
      ['Eo', 'quạt ly tâm nhỏ trong module khớp'],
      ['Gối', 'tấm VC / tản đồng + băng đồng dẫn nhiệt (thụ động)'],
      ['Mọi actuator', 'vỏ nhôm có cánh, anod hoá'],
      ['Bảo vệ', 'NTC + derating dòng khi quá nhiệt; MotorState_ báo temperature[2]'],
    ],
    specs: [['Chạy liên tục', '1–2 giờ (giới hạn bởi pin + nhiệt)'], ['G1 spec', '"local air cooling"']],
    closeup: { type: 'pelvis' },
    caveat: 'Vị trí quạt hông / eo đặt theo ảnh và mô tả teardown, không có toạ độ chính xác.',
    sources: ['zhongyou', 'munro', 'jonver', 'idl'],
  },
  wiring: {
    title: 'Dây, nguồn & bus CAN', tag: 'Đi trong trục rỗng · XT30 + CAN nối chuỗi · tụ đệm', icon: '⚯', color: '#ffa657',
    hotspots: ['capbank'],
    body: 'Mỗi tay / chân là một chuỗi: từ mainboard ra một cặp nguồn XT30 + dây CAN (H/L), đi vào tâm rỗng của khớp đầu tiên, ra khỏi '
      + 'khớp, rồi vào khớp kế tiếp (ảnh teardown ghi rõ "lối vào / lối ra"). Nhờ vậy không có dây chạy ngoài, khớp quay không kéo dây. '
      + 'Ở cuối mỗi chi (cổ chân, cổ tay) có board tụ điện để đệm sụt áp khi motor đột ngột kéo dòng lớn. Tổng chiều dài dây < 10 m.',
    inside: [
      ['Nguồn XT30', 'điện áp pin chạy dọc chuỗi khớp (DC bus chung)'],
      ['CAN H / L', 'lệnh + trạng thái các khớp, nối chuỗi'],
      ['Kẹp dây nhựa', 'giữ dây ở lối vào / ra của từng khớp'],
      ['Board tụ điện', 'ở cẳng chân, cẳng tay - đệm điện áp'],
      ['Cáp vi sai tốc độ cao', 'đầu ↔ thân (LiDAR, camera)'],
    ],
    specs: [['Tổng dây', '< 10 m'], ['Bus khớp', 'CAN (teardown); một bài CSDN đoán 6 kênh RS-485 - chưa thống nhất']],
    closeup: { type: 'wiring' },
    sources: ['zhongyou', 'jonver', 'munro'],
  },
  remote: {
    title: 'Tay cầm điều khiển', tag: 'Không dây · >100 m · 2 cần + 16 nút · gửi 40 byte vào robot', icon: '🎮', color: '#8b949e',
    body: 'Tay cầm gồm 2 cần analog, D-pad, A/B/X/Y, L1/L2/R1/R2, SELECT, START, F1, F3, có giá kẹp điện thoại. Mọi thao tác vận hành '
      + 'robot đi qua tổ hợp phím: L2+B damp (dừng khẩn), L2+UP đứng sẵn sàng, R2+A vào chế độ điều khiển, START đứng / đi... '
      + 'Trạng thái tay cầm được đẩy vào robot và nằm trong LowState.wireless_remote[40]: 2 byte đầu, 16 bit nút, rồi 5 số float '
      + 'lx, rx, ry, L2, ly - code của bạn đọc được để tự gán chức năng.',
    inside: [
      ['2 cần analog', 'trái: tiến/lùi + ngang · phải: quay'],
      ['16 nút', 'R1 L1 START SELECT R2 L2 F1 F2 A B X Y ↑ → ↓ ← (thứ tự bit trong gamepad.hpp)'],
      ['Đèn báo', 'nguồn, sạc, kết nối, truyền dữ liệu (DL), Bluetooth'],
      ['Pin', '780 mAh, sạc USB-C 5 V 700 mA, dùng ~5 giờ (teardown ghi 4.5 giờ)'],
      ['Sóng', '>100 m nơi thoáng; tự tắt robot sau 10 phút nếu không kết nối'],
    ],
    specs: [['Dữ liệu', 'LowState.wireless_remote[40] · rt/wirelesscontroller'], ['Dừng khẩn', 'L2 + B → damp, robot khuỵu từ từ']],
    closeup: { type: 'remote' },
    sources: ['manual', 'gamepad', 'zhongyou', 'idl'],
  },
  waist: {
    title: 'Eo (3 khớp)', tag: 'Yaw N7520-14.3 · roll/pitch 2 × N5020-16 song song · quạt', icon: '⟲', color: '#f0883e',
    links: ['waist_yaw_link', 'waist_roll_link'],
    highlight: 'link',
    body: 'Eo yaw xoay thân ±150° bằng một khớp lớn 7520. Module khớp eo có quạt ly tâm nhỏ riêng. Roll và pitch (±30°, bản EDU) '
      + 'không có motor riêng cho từng trục: hai motor 5020 đẩy hai thanh truyền (cơ cấu song song), firmware đổi lệnh pitch/roll thành '
      + 'góc motor A/B (SDK Mode::PR / Mode::AB). Bản thường chỉ có eo yaw (roll/pitch khoá).',
    inside: [
      ['Khớp eo yaw (N7520-14.3)', 'khớp lớn ~1.1 kg'],
      ['Quạt ly tâm trong module eo', 'hút nhiệt motor + driver'],
      ['2 × N5020-16 (A/B)', 'cùng quay = pitch, ngược chiều = roll'],
      ['Thanh truyền + khớp cầu', 'biến chuyển động quay thành nghiêng thân'],
    ],
    specs: [['Tầm (URDF)', 'yaw ±150° · roll ±29.8° · pitch ±29.8°'], ['SDK index', '12 yaw · 13 roll/A · 14 pitch/B']],
    caveat: 'Vị trí 2 motor eo roll/pitch chưa có ảnh tháo rời - đặt ước lượng.',
    closeup: { type: 'actuator' },
    sources: ['urdf', 'rllab', 'sdk', 'zhongyou'],
  },
  pelvis: {
    title: 'Khung chậu (pelvis)', tag: 'Gốc cây động học · IMU chính · 2 quạt', icon: '⬡', color: '#9aa6b2',
    links: ['pelvis', 'pelvis_contour_link'],
    body: 'Pelvis là "base link": mọi khớp được tính từ đây và LowState.imu_state đo tư thế của nó. Hai khớp hông pitch bắt hai bên, '
      + 'khớp eo yaw ở trên. Vùng hông có 2 quạt ly tâm, gió đi trong các rãnh gia công quanh actuator.',
    inside: [
      ['IMU chính', 'imu_in_pelvis - nguồn tư thế cho bộ điều khiển đi'],
      ['Gá 2 khớp hông pitch', 'trục cách tâm ±0.064 m, thấp hơn 0.103 m'],
      ['2 quạt ly tâm + rãnh gió', 'làm mát actuator hông'],
    ],
    specs: [['Khối lượng (URDF)', '3.81 kg'], ['Vai trò', 'root link (floating base)']],
    related: ['imu', 'waist', 'hip', 'cooling'],
    closeup: { type: 'pelvis' },
    sources: ['urdf', 'sdk', 'munro'],
  },

  // ------------------------------------------------------------------ legs
  hip: {
    title: 'Hông (3 khớp / chân)', tag: 'Pitch + yaw N7520-14.3 · roll N7520-22.5', icon: '◍', color: '#f0883e',
    links: SIDES(['hip_pitch_link', 'hip_roll_link']),
    highlight: 'link',
    body: 'Ba trục hông gần như cắt tại một điểm, giống khớp cầu hông người. Thứ tự: pitch → roll → yaw. Cả ba là khớp lớn (~1.1 kg): '
      + 'motor PMSM rotor trong + hộp số hành tinh 2 tầng + ổ bi đũa chéo + driver + 2 encoder trong một module. Hông roll dùng hộp số '
      + '22.5 vì phải đỡ cả thân khi đứng một chân.',
    inside: [
      ['Khớp hông pitch (N7520-14.3)', 'gá vào pelvis'],
      ['Khớp hông roll (N7520-22.5)', 'trục roll nghiêng 10° (URDF rpy pitch −0.1749)'],
      ['Khớp hông yaw (N7520-14.3)', 'trong đùi'],
      ['Gió từ 2 quạt hông', 'qua rãnh quanh actuator'],
    ],
    specs: [['Tầm (URDF)', 'pitch −145°…+165° · roll −30°…+170° · yaw ±158°'], ['Mô-men (URDF)', 'pitch/yaw 88 · roll 139 N·m']],
    closeup: { type: 'actuator' },
    sources: ['urdf', 'rllab', 'g1', 'zhongyou', 'munro'],
  },
  thigh: {
    title: 'Đùi', tag: 'Khung nhôm khoét hình thoi · mang khớp gối', icon: '▮', color: '#f85149',
    links: SIDES(['hip_yaw_link']),
    highlight: 'link',
    body: 'Link hip_yaw là cả cái đùi: khung nhôm cường độ cao, khoét lỗ hình thoi + tối ưu topo cho nhẹ mà vẫn cứng. Phía dưới mang '
      + 'khớp gối N7520-22.5 - khớp nặng tải nhất (139 N·m URDF; Unitree ghi 90 N·m bản thường / 120 N·m EDU). Gối được tản nhiệt bằng '
      + 'tấm VC / tản đồng ôm stator + băng đồng dẫn nhiệt ra khung nhôm. Đùi + cẳng chân dài 0.6 m.',
    inside: [
      ['Khung đùi nhôm', 'khoét hình thoi, tối ưu topo'],
      ['Khớp gối (N7520-22.5)', 'đặt tại gối'],
      ['Tản nhiệt gối', 'tấm VC đồng + băng đồng → khung nhôm'],
      ['Vỏ ốp silicone mềm', 'đỡ va đập'],
    ],
    specs: [['Khối lượng (URDF)', '1.70 kg'], ['Gối cách hông yaw', '0.177 m xuống, 0.078 m ra sau']],
    closeup: { type: 'actuator' },
    sources: ['urdf', 'rllab', 'g1', 'zhongyou'],
  },
  shin: {
    title: 'Cẳng chân', tag: 'Thanh thép · 2 motor cổ chân xếp chồng (B trên, A dưới)', icon: '▯', color: '#f85149',
    links: SIDES(['knee_link']),
    highlight: 'link',
    body: 'Cẳng chân quay quanh gối (−5°…+165°). Thanh cẳng chân là chi tiết kết cấu duy nhất bằng thép trên robot (chịu va đập khi '
      + 'chạy, nhảy). Hai khớp nhỏ N5020-16 của cổ chân xếp chồng dọc trên cẳng chân - motor B ở trên, A ở dưới - khối lượng dồn lên '
      + 'gần gối để chân nhẹ ở đầu mút. Mỗi motor có tay quay đẩy một thanh truyền xuống gót. Gần cổ chân có board tụ đệm.',
    inside: [
      ['Thanh cẳng chân thép', 'duy nhất bằng thép trong kết cấu'],
      ['Motor B (trên) + Motor A (dưới)', 'khớp nhỏ ø60 × 70 mm, 525 g mỗi cái'],
      ['2 thanh truyền + khớp cầu', 'từ tay quay xuống gót'],
      ['Board tụ đệm', 'ổn định nguồn cho khớp cuối chi'],
    ],
    specs: [['Khối lượng (URDF)', '1.93 kg'], ['Dài (gối → cổ chân)', '0.300 m'], ['Tầm gối (URDF)', '−5°…+165°']],
    closeup: { type: 'actuator' },
    sources: ['urdf', 'rllab', 'sdk', 'zhongyou'],
  },
  foot: {
    title: 'Cổ chân + bàn chân', tag: '2 bậc · cơ cấu song song A/B · không cảm biến lực', icon: '▙', color: '#4fa3ff',
    links: SIDES(['ankle_pitch_link', 'ankle_roll_link']),
    highlight: 'link',
    body: 'URDF mô hình cổ chân là 2 khớp nối tiếp (pitch rồi roll), nhưng không có motor ở cổ chân: motor A/B trên cẳng chân kéo / đẩy '
      + '2 thanh truyền tới khớp các-đăng (cardan) ở cổ chân. Cùng chiều → pitch; ngược chiều → roll. SDK cho chọn Mode::PR (ra lệnh '
      + 'pitch/roll, firmware tự giải) hoặc Mode::AB (lệnh thẳng 2 motor). Hai motor cùng gánh một trục nên URDF cho 35 N·m (> 25 N·m '
      + 'của một 5020). Khớp cardan lộ ra ngoài, có mỡ bôi trơn. Bàn chân KHÔNG có cảm biến lực - LowState không có trường nào cho nó; '
      + 'robot "cảm" tiếp đất qua mô-men ước lượng của khớp.',
    inside: [
      ['Khớp cardan cổ chân', 'giao trục pitch + roll, có mỡ, lộ ra ngoài'],
      ['2 thanh truyền + khớp cầu', 'lệch khỏi mặt phẳng nên cần khớp cầu'],
      ['Đế bàn chân', 'khung + đế bám, dài ~0.21 m'],
    ],
    specs: [['Tầm (URDF)', 'pitch −50°…+30° · roll ±15°'], ['Mô-men (URDF)', '35 N·m mỗi trục'],
      ['Khối lượng (URDF)', '0.61 kg bàn chân + 0.07 kg khớp'], ['SDK index', 'trái 4 (pitch/B) 5 (roll/A) · phải 10, 11']],
    closeup: { type: 'ankle' },
    sources: ['urdf', 'sdk', 'zhongyou', 'munro', 'idl'],
  },

  // ------------------------------------------------------------------ arms
  shoulder: {
    title: 'Vai + cánh tay trên', tag: '3 khớp nhỏ N5020-16 / tay', icon: '◖', color: '#4fa3ff',
    links: SIDES(['shoulder_pitch_link', 'shoulder_roll_link', 'shoulder_yaw_link']),
    highlight: 'link',
    body: 'Vai có 3 trục pitch → roll → yaw như khớp cầu vai người, đều là khớp nhỏ 5020 (525 g). Trục pitch nghiêng 16° (URDF rpy '
      + 'roll 0.279) để tay tự nhiên khép vào thân. Link shoulder_yaw là cánh tay trên. Đo trên robot thật: vai yaw tốn điện chủ yếu ở '
      + 'tổn hao đồng (nhiệt ∝ mô-men²), vai pitch chủ yếu ở ma sát nhớt (∝ tốc độ²).',
    inside: [['Khớp vai pitch', 'gá trong thân'], ['Khớp vai roll', 'dang tay'], ['Khớp vai yaw', 'trong cánh tay trên'],
      ['Khung nhôm + vỏ', 'dây đi trong trục rỗng nối chuỗi các khớp']],
    specs: [['Tầm (URDF, tay trái)', 'pitch −177°…+153° · roll −91°…+129° · yaw ±150°'],
      ['Mô-men (URDF)', '25 N·m'], ['Tải tay', '~2 kg (thường) · ~3 kg (EDU)']],
    closeup: { type: 'actuator' },
    sources: ['urdf', 'rllab', 'g1', 'zhongyou', 'arxivPow'],
  },
  elbow: {
    title: 'Khuỷu + cẳng tay', tag: 'N5020-16', icon: '◗', color: '#4fa3ff',
    links: SIDES(['elbow_link']),
    highlight: 'link',
    body: 'Khuỷu gập −60°…+120°. Cẳng tay (elbow_link) dài 0.10 m tới cổ tay roll. Khuỷu là khớp tốn điện nhất do tổn hao đồng '
      + '(b = 0.39 W/(N·m)² theo đo đạc).',
    inside: [['Khớp khuỷu (N5020-16)', 'đặt tại khuỷu'], ['Dây qua trục rỗng', 'nguồn + CAN cho cổ tay và bàn tay']],
    specs: [['Tầm (URDF)', '−60°…+120°'], ['Khối lượng (URDF)', '0.60 kg']],
    closeup: { type: 'actuator' },
    sources: ['urdf', 'rllab', 'arxivPow'],
  },
  wrist: {
    title: 'Cổ tay (3 khớp)', tag: 'Roll N5020-16 · pitch + yaw W4010-25', icon: '◇', color: '#bc8cff',
    links: SIDES(['wrist_roll_link', 'wrist_pitch_link', 'wrist_yaw_link']),
    highlight: 'link',
    body: 'Bản 29 DoF thêm 2 khớp cổ tay pitch/yaw (±92.5°) dùng motor dẹt W4010-25 - nhỏ, nhẹ vì nằm ở đầu mút tay. Cổ tay roll '
      + '(±113°) vẫn là 5020. Đo trên robot thật: 3 khớp cổ tay tốn điện chủ yếu vì ma sát nhớt (∝ tốc độ²).',
    inside: [['Cổ tay roll (N5020-16)', ''], ['Cổ tay pitch (W4010-25)', 'motor dẹt'], ['Cổ tay yaw (W4010-25)', 'mặt bích ra bắt lòng bàn tay'],
      ['Board tụ đệm cuối tay', 'ổn định nguồn cho khớp cuối chi']],
    specs: [['Tầm (URDF)', 'roll ±113° · pitch ±92.5° · yaw ±92.5°'], ['Mô-men (URDF)', 'roll 25 · pitch/yaw 5 N·m']],
    closeup: { type: 'actuator' },
    sources: ['urdf', 'rllab', 'g1', 'motorinfo', 'arxivPow'],
  },

  // ------------------------------------------------------------------ hands
  hand: {
    title: 'Bàn tay Dex3-1', tag: '3 ngón · 7 bậc · 33 cảm biến xúc giác', icon: '✋', color: '#3fb950',
    links: ['left', 'right'].flatMap((s) => ['palm', 'thumb_0', 'thumb_1', 'thumb_2', 'index_0', 'index_1', 'middle_0', 'middle_1']
      .map((n) => `${s}_hand_${n}_link`)),
    highlight: 'link',
    body: 'Bản thường của G1 dùng bàn tay nhựa không cử động; bản EDU gắn Dex3-1 (hoặc tay 5 ngón Inspire RH56). Dex3-1 có 3 ngón: '
      + 'ngón cái 3 bậc, ngón trỏ và giữa 2 bậc. 6 khớp được motor dẫn động trực tiếp tại khớp, khớp xoay ngón cái qua bánh răng. Điều '
      + 'khiển lai lực-vị trí: mỗi motor nhận q, dq, τ, Kp, Kd ở 1000 Hz. HandState_ trả về 7 MotorState_, các khối PressSensorState_ '
      + '(mỗi khối pressure[12] + temperature[12]), IMU, áp/dòng nguồn.',
    inside: [
      ['7 motor F-1515 (45 g)', 'motor + hộp số 1:108 / 1:214 + encoder tuyệt đối rotor'],
      ['Lòng bàn tay: 3 vùng 2×2', 'cảm biến áp lực'],
      ['Đốt ngón: 3 vùng 2×2 · đầu ngón: 3 vùng 3×1', '10 g – 2.5 kg mỗi điểm'],
      ['Bo điều khiển trong lòng bàn tay', 'bus "High Speed Unibus" tới motor, USB 2.0 ra ngoài'],
      ['IMU trong bàn tay', 'imu_state trong HandState_'],
    ],
    specs: [
      ['Kích thước / khối lượng', '175 × 88 × 77 mm · 710 g'], ['Lặp lại đầu ngón', '±2 mm'],
      ['Nắm', '≤ 500 g (vật tròn cứng ø5 cm)'], ['Chịu tải không hỏng', '20 kg'],
      ['Điện', '12–58 V · tĩnh 0.2 A @58 V · tối đa 10 A'],
      ['Tầm (DEX3)', 'cái 0: ±60° · cái 1: −35…60° · cái 2: 0…100° · trỏ/giữa 0: 0…90° · 1: 0…100°'],
      ['DDS', 'rt/dex3/left/cmd · rt/lf/dex3/left/state (tương tự right)'],
    ],
    caveat: 'Khớp nào dùng F-1515-108 hay -214 Unitree không ghi; giới hạn URDF (1.4 N·m, 12 rad/s cho 6 khớp; 2.45 N·m, 3.14 rad/s '
      + 'cho ngón cái 0) khớp với -214 và khớp có bánh răng - đây là suy luận.',
    closeup: { type: 'hand' },
    sources: ['dex3', 'urdf', 'sdk', 'idl', 'zhongyou'],
  },
  inspire: {
    title: 'Bàn tay Inspire RH56 (5 ngón)', tag: '6 bậc chủ động · 12 khớp · 540 g · RS485', icon: '🖐', color: '#56d364',
    links: ['left', 'right'].flatMap((s) => ['base_link', 'thumb_1', 'thumb_2', 'thumb_3', 'thumb_4', 'index_1', 'index_2',
      'middle_1', 'middle_2', 'ring_1', 'ring_2', 'little_1', 'little_2', 'palm_force_sensor',
      ...[1, 2, 3, 4].map((i) => `thumb_force_sensor_${i}`),
      ...['index', 'middle', 'ring', 'little'].flatMap((f) => [1, 2, 3].map((i) => `${f}_force_sensor_${i}`))].map((n) => `${s}_${n}`)),
    highlight: 'link',
    body: 'Tay 5 ngón tuỳ chọn cho G1 EDU, do Inspire Robots sản xuất. 6 bậc chủ động: ngón cái xoay + gập, mỗi ngón còn lại gập 1 bậc. '
      + 'Mỗi bậc là một xi-lanh điện tuyến tính nhỏ (motor + vít me) kéo ngón qua thanh nối; đốt ngọn đi theo đốt gốc theo tỉ lệ cố '
      + 'định (URDF ghi <mimic>, ví dụ index_2 = 1.0843 × index_1). Bản FTP có cảm biến lực ở lòng bàn tay và các đốt ngón.',
    inside: [
      ['6 xi-lanh điện tuyến tính', 'motor + vít me trong lòng bàn tay'],
      ['Thanh nối 4 khâu mỗi ngón', 'đốt ngọn gập theo đốt gốc (mimic)'],
      ['Cảm biến lực (FTP)', 'lòng bàn tay + 3 đốt mỗi ngón'],
      ['Driver + RS485', 'giao tiếp với robot'],
    ],
    specs: [
      ['Bậc / khớp', '6 / 12'], ['Khối lượng', '540 g'], ['Điện', '24 V ±10% · tĩnh 0.2 A · đỉnh 2 A'],
      ['Lặp lại', '±0.20 mm'], ['Lực nắm (DFX)', 'ngón cái 15 N · ngón khác 10 N'], ['Độ phân giải lực', '0.5 N'],
      ['Tốc độ (DFX)', 'xoay ngón cái 107°/s · gập ngón cái 70°/s · gập ngón khác 260°/s'],
    ],
    caveat: 'Bảng lực/tốc độ là của RH56DFX trong tài liệu G1; mô hình 3D là bản FTP (URDF g1_29dof_rev_1_0_with_inspire_hand_FTP).',
    closeup: { type: 'inspire' },
    sources: ['inspire', 'urdf'],
  },

  dex1: {
    title: 'Tay kẹp Dex1-1', tag: '2 ngón song song · hành trình 90 mm · 5–120 N · 550 g', icon: '🗜', color: '#79c0ff',
    links: ['left', 'right'].flatMap((s) => ['dex1_base_link', 'dex1_finger_link_1', 'dex1_finger_link_2'].map((n) => `${s}_${n}`)),
    highlight: 'link',
    body: 'Tay kẹp 2 ngón song song, 1 bậc tự do: một motor M4010 (hộp số 1:25, encoder tuyệt đối 15 bit) kéo hai ngón trượt '
      + 'ngược chiều nhau. Lực kẹp chỉnh được 5–120 N bằng cách giới hạn mô-men motor; nhận lệnh như một khớp Unitree (góc, vận tốc, '
      + 'mô-men, độ cứng, giảm chấn) qua RS485 6 Mbps ở 1000 Hz. URDF mô hình hai ngón là 2 khớp tịnh tiến (prismatic).',
    inside: [
      ['Motor M4010', '5 N·m đỉnh, 27 rad/s ở 64 V, tỉ số 1:25, encoder tuyệt đối 15 bit'],
      ['Cơ cấu quay → tịnh tiến', 'hai ngón chạy trên ray, đi ngược chiều nhau (URDF: 2 khớp prismatic, mỗi ngón −20…+24.5 mm)'],
      ['Ngón kẹp', 'dài 80 mm'],
      ['Bản Advanced', 'thêm camera 1080p ở tay, FOV 118° × 87°'],
      ['Giao tiếp', 'RS485 tốc độ cao 6 Mbps, 1000 Hz'],
    ],
    specs: [
      ['Hành trình', '90 mm'], ['Lực kẹp', '5–120 N (chỉnh được)'], ['Tốc độ', '50–375 mm/s · đóng hết 0.24 s'],
      ['Độ phân giải', '0.1 mm ở đầu ngón'], ['Tải', '20 kg ôm khít · 5 kg nhờ ma sát'],
      ['Kích thước / khối lượng', '143 × 78 × 67 mm · 550 g'], ['Điện', '24–64 V (khuyên 24/48 V) · tĩnh 0.03 A · đỉnh 3.5 A'],
    ],
    caveat: 'Unitree không mô tả cơ cấu bên trong (thanh răng hay vít me); hình cutaway vẽ thanh răng - bánh răng là sơ đồ.',
    closeup: { type: 'dex1' },
    sources: ['dex1', 'urdf'],
  },
  neck: {
    title: 'Cổ G1+ (2 bậc)', tag: 'Pitch −25°…+36° · yaw ±115° · camera đôi + góc rộng', icon: '⤾', color: '#8b949e',
    links: ['head_base_link', 'neck_pitch_link'],
    hotspots: ['plusCam', 'plusLidar'],
    highlight: 'link',
    variants: { plusCam: 'Khung tham chiếu camera trái (camera_left_reference_link)', plusLidar: 'Khung tham chiếu LiDAR trên đầu (lidar_reference_link)' },
    body: 'G1+ (ra mắt 2026-09) thêm cổ 2 bậc: pitch dùng motor 5019-16 (41 N·m), yaw dùng 5010-16 (13.4 N·m), theo motor_info.md. '
      + 'Đầu mới có camera đôi (binocular) + camera góc rộng ở ngực, cảm biến chạm trên đầu, 6 micro và 2 loa 10 W; thân có tay cầm phía '
      + 'sau. Đầu quay được nên camera / LiDAR gắn trên đầu nhìn theo hướng cổ.',
    inside: [
      ['Khớp cổ pitch (5019-16)', 'gật −25°…+36° (URDF −0.436…+0.628 rad), 41 N·m'],
      ['Khớp cổ yaw (5010-16)', 'quay ±115° (URDF ±2.007 rad), 13.4 N·m'],
      ['Camera đôi + góc rộng', 'binocular trên đầu, góc rộng ở ngực (báo chí)'],
      ['Cảm biến chạm trên đầu', ''],
      ['Âm thanh', '6 micro · 2 loa 10 W'],
    ],
    specs: [['Bậc tự do G1+', '25 (bản thường) · URDF EDU: 31'], ['Cao', '1.34 m · ~35 kg'], ['Tải tay', '~3 kg'],
      ['Mô-men', 'vai + eo +110% đỉnh, tay +43% (so với G1)']],
    caveat: 'Thông số camera / micro / loa của G1+ theo báo chí, chưa có bảng thông số chính thức đầy đủ.',
    closeup: { type: 'neck' },
    sources: ['g1plusUrdf', 'g1plus'],
  },
  rubber_hand: {
    title: 'Bàn tay cao su (bản thường)', tag: 'Không cử động · không motor', icon: '🤚', color: '#8b949e',
    links: ['left', 'right'].flatMap((s) => ['rubber_hand', 'wrist_roll_rubber_hand'].map((n) => `${s}_${n}`)),
    body: 'Bản G1 thường (và G1+ cơ bản) dùng bàn tay cao su liền khối, không có khớp - chỉ để đỡ / đẩy nhẹ và bảo vệ cổ tay khi ngã. '
      + 'Ở bản 23 DoF, bàn tay gắn thẳng vào khâu cổ tay roll (link "wrist_roll_rubber_hand"). Teardown: tay bản thường bằng nhựa, không gập được.',
    inside: [['Vỏ cao su / nhựa', 'không cảm biến, không motor']],
    sources: ['urdf', 'zhongyou'],
  },
  handle: {
    title: 'Tay cầm sau lưng (G1+)', tag: 'Để nhấc / treo robot', icon: '⊓', color: '#8b949e',
    links: ['handle_link'],
    body: 'G1+ có tay cầm ở lưng trên (URDF: handle_link, cách tâm thân 0.10 m về sau, cao 0.27 m) để nhấc robot hoặc móc vào giá treo.',
    sources: ['g1plusUrdf'],
  },
};

export const GROUPS = [
  { title: 'Đầu & cảm biến', parts: ['head', 'depth_camera', 'lidar', 'audio', 'ports'] },
  { title: 'Thân & eo', parts: ['torso', 'compute', 'battery', 'imu', 'waist', 'pelvis'] },
  { title: 'Chân (× 2)', parts: ['hip', 'thigh', 'shin', 'foot'] },
  { title: 'Tay (× 2)', parts: ['shoulder', 'elbow', 'wrist'] },
  { title: 'Bàn tay (× 2)', parts: ['hand', 'inspire', 'dex1', 'rubber_hand'] },
  { title: 'G1+ (2026)', parts: ['neck', 'handle'] },
  { title: 'Hệ thống xuyên suốt', parts: ['cooling', 'wiring', 'remote'] },
];

export const LINK_TO_PART = {};
export const HOTSPOT_TO_PART = {};
for (const [id, part] of Object.entries(PARTS)) {
  for (const l of part.links || []) LINK_TO_PART[l] = id;
  for (const h of part.hotspots || []) HOTSPOT_TO_PART[h] = id;
}

export const OVERVIEW = {
  stats: [
    ['1320 mm', 'cao khi đứng'], ['~35 kg', 'kể cả pin'], ['43 DoF', '29 thân + 2 × 7 tay'],
    ['9 + 14', 'khớp lớn / khớp nhỏ (bản 23 DoF)'], ['0.42 kWh', 'pin 13S · 1–2 giờ'], ['500 Hz', 'vòng lệnh khớp (SDK)'],
  ],
  body: 'Chọn phiên bản ở ô "Phiên bản": 5 URDF chính thức của Unitree (EDU + Dex3-1 / Inspire / Dex1-1, bản thường 23 DoF, G1+ có cổ). Mặc định là g1_29dof_with_hand_rev_1_0 (cùng hình học với file USD trên HuggingFace). '
    + 'Nội dung bên trong lấy từ báo cáo tháo rời thật (中邮证券, Munro Live), tài liệu developer, SDK và datasheet linh kiện - mỗi '
    + 'bộ phận có ghi nguồn. Bật "Nhìn xuyên" để thấy actuator ở từng khớp, mainboard, pin, quạt, dây... ; double-click để mở bên trong.',
};

// Phase 2: what the G1 can DO, catalogued from Unitree's own source code (downloaded to
// ../unitree_src): unitree_sdk2 (C++), unitree_sdk2_python, unitree_rl_gym, unitree_rl_lab,
// xr_teleoperate, unitree_ros2. Data only - functions-ui.js renders it.
//
// Every entry: what it does, the exact API (service, api id, topic), how it works inside, limits /
// safety notes from the source, the source file, and `demo` = what this page can run without a robot:
//   'sim:*'    the MuJoCo simulation (backend/sim_server.py) with Unitree's pre-trained walking policy
//   'motion:*' replay of Unitree's real motion-reference data on the 3D model (kinematic, no physics)
//   'pose:*'   the page's own illustrative pose (marked as such - Unitree's keyframes are not public)

export const FN_SRC = {
  loco: 'unitree_sdk2/include/unitree/robot/g1/loco/g1_loco_client.hpp',
  locoApi: 'unitree_sdk2/include/unitree/robot/g1/loco/g1_loco_api.hpp',
  locoPy: 'unitree_sdk2_python/unitree_sdk2py/g1/loco/g1_loco_client.py',
  arm: 'unitree_sdk2/include/unitree/robot/g1/arm/g1_arm_action_client.hpp',
  armSdk: 'unitree_sdk2/example/g1/high_level/g1_arm7_sdk_dds_example.cpp',
  audio: 'unitree_sdk2/include/unitree/robot/g1/audio/g1_audio_client.hpp',
  agv: 'unitree_sdk2/include/unitree/robot/g1/agv/g1_agv_client.hpp',
  low: 'unitree_sdk2/example/g1/low_level/g1_ankle_swing_example.cpp',
  dex3: 'unitree_sdk2/example/g1/dex3/g1_dex3_example.cpp',
  rlgym: 'unitree_rl_gym/deploy/deploy_mujoco/deploy_mujoco.py',
  rlreal: 'unitree_rl_gym/deploy/deploy_real/deploy_real.py',
  rllab: 'unitree_rl_lab/source/unitree_rl_lab/unitree_rl_lab/tasks',
  xr: 'xr_teleoperate/README.md',
  ros2: 'unitree_ros2',
};

export const FN_GROUPS = [
  {
    id: 'state', title: 'Trạng thái & tư thế (LocoClient · FSM)',
    intro: 'Bộ điều khiển chuyển động của Unitree chạy trên PC1 là một máy trạng thái (FSM). Gọi SetFsmId(id) qua service "sport" '
      + '(api 7101) để chuyển trạng thái. Robot phải được treo / đỡ khi chuyển giữa các trạng thái thấp (0, 1).',
    items: [
      { id: 'zero', real: [{ label: 'Zero torque', msg: { type: 'fsm', id: 0 }, danger: true }],  title: 'Zero torque', api: 'LocoClient.ZeroTorque() → SetFsmId(0)', how: 'Mọi motor ra mô-men 0: robot mềm hoàn toàn, sụp xuống nếu không được đỡ. Dùng khi treo robot để kiểm tra / tắt máy.', demo: 'sim:zero', src: 'loco' },
      { id: 'damp', real: [{ label: 'Damp', msg: { type: 'fsm', id: 1 }, danger: true }],  title: 'Damp (giảm chấn)', api: 'LocoClient.Damp() → SetFsmId(1)', how: 'Kp = 0, chỉ còn Kd: khớp cản lại chuyển động như giảm chấn, robot từ từ khuỵu xuống chứ không rơi tự do. Đây là trạng thái "an toàn" khi có sự cố.', demo: 'sim:damp', src: 'loco' },
      { id: 'squat', real: [{ label: 'Squat ↔ đứng (706)', msg: { type: 'fsm', id: 706 } }],  title: 'Ngồi xổm / đứng dậy từ ngồi xổm', api: 'Squat() → 2 · Squat2StandUp() / StandUp2Squat() → 706', how: 'Chuỗi chuyển động có sẵn đưa robot từ tư thế ngồi xổm lên đứng và ngược lại.', demo: 'pose:squat', src: 'locoPy' },
      { id: 'sit', real: [{ label: 'Ngồi (3)', msg: { type: 'fsm', id: 3 } }],  title: 'Ngồi', api: 'LocoClient.Sit() → SetFsmId(3)', how: 'Hạ người xuống tư thế ngồi.', demo: null, src: 'loco' },
      { id: 'standup', real: [{ label: 'Đứng dậy (4)', msg: { type: 'fsm', id: 4 } }, { label: 'Nằm → đứng (702)', msg: { type: 'fsm', id: 702 }, danger: true }],  title: 'Đứng dậy', api: 'StandUp() → 4 · Lie2StandUp() → 702', how: 'Lie2StandUp đứng dậy từ tư thế nằm ngửa - Unitree dặn: robot phải nằm ngửa, nền cứng, phẳng, nhám.', demo: 'sim:stand', src: 'locoPy' },
      { id: 'start', real: [{ label: 'Start (500)', msg: { type: 'fsm', id: 500 } }],  title: 'Start - bộ điều khiển đi chính', api: 'LocoClient.Start() → SetFsmId(500)', how: 'Bật bộ điều khiển locomotion (policy học tăng cường của Unitree): robot tự giữ thăng bằng và nhận lệnh vận tốc. Các động tác tay chỉ chạy ở FSM 500 / 501 / 801.', demo: 'sim:walk', src: 'loco' },
      { id: 'height', real: [{ label: 'Đứng cao', msg: { type: 'height', high: true } }, { label: 'Đứng thấp', msg: { type: 'height', high: false } }],  title: 'Đứng cao / thấp', api: 'HighStand() / LowStand() → SetStandHeight (api 7104)', how: 'Đổi chiều cao đứng (gập gối nhiều hay ít) trong khi vẫn giữ thăng bằng.', demo: null, src: 'loco' },
      { id: 'balance', real: [{ label: 'Đứng yên (0)', msg: { type: 'balance', mode: 0 } }, { label: 'Bước tại chỗ (1)', msg: { type: 'balance', mode: 1 } }],  title: 'Đứng yên vs bước tại chỗ', api: 'BalanceStand() / ContinuousGait(true) → SetBalanceMode (7102)', how: 'Mode 0: khi lệnh vận tốc = 0 thì đứng yên giữ thăng bằng. Mode 1: chân vẫn bước tại chỗ liên tục.', demo: null, src: 'loco' },
    ],
  },
  {
    id: 'move', title: 'Di chuyển (LocoClient.Move)',
    intro: 'Ở FSM 500, gửi vận tốc mong muốn (vx tiến/lùi, vy sang ngang, vyaw quay) qua SetVelocity (api 7105). Bộ điều khiển tự tính '
      + 'bước chân. Trong mô phỏng ở đây, việc này do đúng policy đi bộ Unitree công bố (unitree_rl_gym motion.pt) đảm nhận.',
    items: [
      { id: 'forward', title: 'Đi tiến / lùi', api: 'LocoClient.Move(vx, 0, 0)', how: 'Policy đọc 47 số mỗi 20 ms (vận tốc góc, hướng trọng lực, lệnh, góc + vận tốc 12 khớp chân, hành động trước, pha bước 0.8 s) và xuất 12 góc đích; PD kp 100–150 biến thành mô-men.', demo: 'sim:walk:0.5,0,0', src: 'rlgym' },
      { id: 'lateral', title: 'Đi ngang', api: 'LocoClient.Move(0, vy, 0)', how: 'Cùng policy, lệnh vy: robot bước sang ngang.', demo: 'sim:walk:0,0.3,0', src: 'rlgym' },
      { id: 'turn', title: 'Quay tại chỗ', api: 'LocoClient.Move(0, 0, vyaw)', how: 'Lệnh tốc độ quay (rad/s); chân bước xoay quanh trục dọc.', demo: 'sim:walk:0,0,0.6', src: 'rlgym' },
      { id: 'speedmode', title: 'Chế độ tốc độ', api: 'LocoClient.SetSpeedMode(mode) (api 7107)', how: 'Chọn giới hạn tốc độ của bộ điều khiển (đi / chạy). Unitree ghi tốc độ G1 tới ~2 m/s.', demo: null, src: 'loco' },
      { id: 'stop', title: 'Dừng', api: 'LocoClient.StopMove() → SetVelocity(0,0,0)', how: 'Lệnh vận tốc về 0; robot dừng bước (hoặc bước tại chỗ nếu ContinuousGait).', demo: 'sim:walk:0,0,0', src: 'loco' },
    ],
  },
  {
    id: 'gesture', title: 'Cử chỉ & động tác tay',
    intro: 'Hai cách: (1) task có sẵn của LocoClient (vẫy tay, bắt tay) - SetTaskId (api 7106); (2) ArmActionClient - service "arm", '
      + '16 động tác cài sẵn, chạy trên nền rt/arm_sdk; trạng thái báo ở topic rt/arm/action/state. Quỹ đạo các động tác này nằm '
      + 'trong firmware Unitree, không công bố - hình động ở đây chỉ minh hoạ.',
    items: [
      { id: 'wave', real: [{ label: 'Vẫy tay', msg: { type: 'task', name: 'wave' } }, { label: 'Vẫy + quay', msg: { type: 'task', name: 'wave_turn' } }],  title: 'Vẫy tay', api: 'LocoClient.WaveHand(turn=false) → task 0 · (turn=true) → task 1: vẫy + quay người', how: 'Bộ điều khiển đi giữ thăng bằng cho chân, phần tay chạy quỹ đạo vẫy.', demo: 'pose:wave', src: 'loco' },
      { id: 'shake', real: [{ label: 'Bắt tay (đưa / thu)', msg: { type: 'task', name: 'shake' } }],  title: 'Bắt tay', api: 'LocoClient.ShakeHand() → task 2 rồi 3 (gọi 2 lần: đưa tay / thu tay)', how: 'Đưa tay ra giữ cho người bắt, gọi lại để thu về.', demo: null, src: 'loco' },
      { id: 'armactions', real: 'arm_select',  title: '16 động tác tay có sẵn', api: 'G1ArmActionClient.ExecuteAction(id) (api 7106)',
        how: 'id: 11 two-hand kiss · 12 left/right kiss · 15 hands up · 17 clap · 18 high five · 19 hug · 20 heart · 21 right heart · 22 reject · '
          + '23 right hand up · 24 x-ray · 25 face wave · 26 high wave · 27 shake hand · 99 thả tay. Một số động tác giữ tư thế cuối tới 20 s; gửi 99 hoặc lại id để thả. '
          + 'Unitree cảnh báo: vài động tác không có trong app có thể làm robot ngã.', demo: null, src: 'arm' },
      { id: 'teach', title: 'Động tác tự dạy', api: 'ExecuteAction("tên") (7108) · StopCustomAction() (7113)', how: 'Phát lại động tác đã ghi bằng chế độ dạy trong app, gọi theo tên.', demo: null, src: 'arm' },
      { id: 'mimic', title: 'Động tác bắt chước (mimic) có sẵn', api: 'LocoClient.GetMimicMotion() → SetFsmId(550 + id) (ví dụ 550507)', how: 'Robot phải đang đứng ổn định. Lấy danh sách động tác (tên + thời lượng) rồi gọi id 550xxx.', demo: null, src: 'loco' },
    ],
  },
  {
    id: 'dance', title: 'Nhảy - dữ liệu chuyển động thật của Unitree',
    intro: 'unitree_rl_lab có dữ liệu chuyển động 60 Hz cho G1 29 DoF (vị trí + hướng thân + 29 góc khớp theo thứ tự SDK), dùng làm '
      + '"bài mẫu" để huấn luyện policy bắt chước (task mimic, Isaac Lab). Ở đây phát lại đúng dữ liệu đó lên mô hình 3D - '
      + 'đây là quỹ đạo tham chiếu, không phải robot đang tự giữ thăng bằng.',
    items: [
      { id: 'dance102', title: 'Dance 102', api: 'tasks/mimic/robots/g1_29dof/dance_102/G1_Take_102.bvh_60hz.csv', how: '1749 khung × 36 cột (xyz thân, quaternion xyzw, 29 khớp) ≈ 29 s. Pipeline: csv_to_npz.py → train policy tracking → deploy.', demo: 'motion:dance_102', src: 'rllab' },
      { id: 'gangnam', title: 'Gangnam Style', api: 'tasks/mimic/robots/g1_29dof/gangnanm_style/G1_gangnam_style_V01.bvh_60hz.csv', how: '1942 khung ≈ 32 s, cùng định dạng.', demo: 'motion:gangnam_style', src: 'rllab' },
    ],
  },
  {
    id: 'voice', title: 'Giọng nói, âm thanh & đèn LED (AudioClient)',
    intro: 'Service "voice": TTS (1001), ASR (1002), phát luồng âm thanh (1003/1004), âm lượng (1005/1006), LED RGB ở đầu (1010).',
    items: [
      { id: 'tts', real: 'tts_input',  title: 'Nói (TTS)', api: 'AudioClient.TtsMaker(text, speaker_id)', how: 'speaker_id 0: giọng tiếng Trung, 1: tiếng Anh (theo ví dụ). Robot tổng hợp giọng và phát ra loa 5 W.', demo: 'say', src: 'audio' },
      { id: 'play', title: 'Phát âm thanh', api: 'PlayStream(app, stream_id, pcm) · PlayStop(app)', how: 'Đẩy dữ liệu PCM (ví dụ đọc từ file .wav) để robot phát.', demo: null, src: 'audio' },
      { id: 'volume', real: 'volume_input',  title: 'Âm lượng', api: 'GetVolume() / SetVolume(0–100)', how: '', demo: null, src: 'audio' },
      { id: 'led', real: 'led_input',  title: 'Đèn LED đầu', api: 'AudioClient.LedControl(R, G, B)', how: 'Đổi màu dải LED RGB quanh mặt (đã thấy trong ảnh tháo rời: dải LED + board LED).', demo: 'led', src: 'audio' },
      { id: 'asr', title: 'Nghe (ASR)', api: 'api 1002 · topic rt/audio_msg', how: 'Mảng 4 micro thu âm, robot nhận dạng giọng nói; kết quả đẩy lên topic.', demo: null, src: 'audio' },
    ],
  },
  {
    id: 'lowlevel', title: 'Điều khiển cấp thấp (tự viết bộ điều khiển)',
    intro: 'Bỏ qua bộ điều khiển của Unitree, tự gửi lệnh cho từng motor. Bắt buộc: chuyển robot sang chế độ người dùng trước '
      + '(SwitchToUserCtrl, api 7110 - hoặc bằng app/tay cầm), robot treo trên giá.',
    items: [
      { id: 'lowcmd', title: 'rt/lowcmd - 29 motor, 500 Hz', api: 'LowCmd_: mode_pr, mode_machine, motor_cmd[35]{mode, q, dq, tau, kp, kd}, crc', how: 'Mỗi 2 ms gửi góc / vận tốc / mô-men đích + Kp, Kd cho từng motor; tính CRC32 cho cả gói. Đọc lại rt/lowstate (q, dq, tau_est, nhiệt độ, IMU).', demo: null, src: 'low' },
      { id: 'prab', title: 'Cổ chân / eo: Mode PR vs AB', api: 'mode_pr = 0 (PR) / 1 (AB)', how: 'PR: ra lệnh pitch/roll như khớp nối tiếp, firmware giải cơ cấu 2 motor. AB: lệnh thẳng 2 motor A/B (xem cutaway cổ chân).', demo: null, src: 'low' },
      { id: 'armsdk', title: 'Điều khiển tay khi robot vẫn đang đi', api: 'topic rt/arm_sdk · motor_cmd[29].q = weight 0..1', how: 'Gửi góc khớp tay vào rt/arm_sdk; ô motor số 29 (không dùng) chứa "trọng số" trộn: 0 = tay do Unitree điều khiển, 1 = tay theo lệnh của bạn. Tăng / giảm dần (0.2/s trong ví dụ) để chuyển mượt. Chân vẫn do bộ đi bộ giữ.', demo: null, src: 'armSdk' },
      { id: 'dex3', title: 'Bàn tay Dex3-1', api: 'rt/dex3/{left,right}/cmd → HandCmd_ · state: rt/lf/dex3/*/state', how: '7 motor, mỗi motor q, dq, tau, kp, kd ở 1000 Hz; state trả áp lực xúc giác (PressSensorState_: pressure[12], temperature[12]), IMU, áp/dòng.', demo: null, src: 'dex3' },
    ],
  },
  {
    id: 'learn', title: 'Học máy & điều khiển từ xa (repo Unitree)',
    intro: 'Các khả năng "thông minh" được xây trên SDK bằng các repo mã nguồn mở của Unitree.',
    items: [
      { id: 'rlgym', title: 'Huấn luyện đi bộ (unitree_rl_gym)', api: 'Isaac Gym train → play → sim2sim MuJoCo → sim2real deploy_real.py', how: 'Huấn luyện policy đi bộ bằng PPO trong Isaac Gym, kiểm tra chéo trong MuJoCo (deploy_mujoco.py - chính là thứ chạy trong mô phỏng của trang này), rồi đưa lên robot thật qua rt/lowcmd.', demo: 'sim:walk', src: 'rlgym' },
      { id: 'rllab', title: 'Isaac Lab: đi bộ + bắt chước (unitree_rl_lab)', api: 'tasks/locomotion/robots/g1/29dof · tasks/mimic/robots/g1_29dof', how: 'Task đi bộ 29 DoF và task bắt chước chuyển động (dance_102, gangnam_style); có actuator model đúng đường T-N từng motor.', demo: 'motion:dance_102', src: 'rllab' },
      { id: 'xr', title: 'Điều khiển từ xa bằng kính XR (xr_teleoperate)', api: 'Apple Vision Pro / PICO 4 Ultra / Meta Quest 3', how: 'Theo dõi tay + đầu người điều khiển, giải IK cho 2 tay 7 DoF, retarget ngón tay sang Dex3-1 / Inspire, truyền ảnh camera đầu robot về kính. Dùng để thu dữ liệu cho học bắt chước.', demo: null, src: 'xr' },
      { id: 'ros2', title: 'ROS 2 (unitree_ros2)', api: 'cùng các topic DDS (rt/lowstate, rt/lowcmd...) dưới dạng message ROS 2', how: 'Robot nói DDS nên ROS 2 (CycloneDDS) đọc / ghi trực tiếp, không cần bridge.', demo: null, src: 'ros2' },
    ],
  },
];

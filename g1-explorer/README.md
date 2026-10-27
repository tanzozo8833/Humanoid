# G1 Explorer - cấu tạo Unitree G1 trên web

Web xem cấu tạo robot hình người **Unitree G1 EDU (29 DoF + 2 bàn tay)**, làm theo kiểu trang Overview + close-up
của `rosmater_m3_pro`: mô hình 3D thật của robot, click bộ phận → panel bên phải hiện cấu tạo, double-click
(hoặc nút **🔍 Mở bên trong**) → cutaway 3D có hoạt ảnh giải thích cơ chế bên trong.

## Chạy

```bash
node server.js          # http://localhost:8080   (không cần npm install)
```
hoặc double-click `start.bat`. Cần Node ≥ 16. Không mở thẳng `index.html` từ ổ đĩa được (ES modules cần http).

## Cập nhật 2026-10-26 (phần 1 hoàn chỉnh)
- **5 phiên bản** (ô "Phiên bản"): EDU + Dex3-1 · EDU + Inspire · EDU + tay kẹp Dex1-1 · bản thường 23 DoF · G1+ có cổ - đều là URDF chính thức, motor gán theo từng bản.
- **Lớp xem** (`public/overlays.js`): trục khớp + tầm quay, trọng tâm + vùng chân đỡ, vật liệu, vùng nhìn cảm biến, kích thước, vùng với tới tay.
- **Cutaway mới**: `wiring.js` (dây / nguồn / CAN trên vị trí khớp thật), `remote.js` (tay cầm + 40 byte wireless_remote), `dex1.js`, `neck.js` (G1+, bảng mô-men G1 ↔ G1+).
- Tab Hệ thống: phân bố khối lượng, cây động học.

## Trang chính (`public/app.js`)

- Mô hình URDF chính thức của Unitree, 2 bản: tay **Dex3-1** (`g1_29dof_with_hand_rev_1_0`, 49 khâu) và tay
  **Inspire RH56 5 ngón** (`g1_29dof_rev_1_0_with_inspire_hand_FTP`, 93 khâu, đốt ngọn đi theo `<mimic>`). Đổi ở ô "Tay".
- Click một khâu → khớp, chức năng, tầm quay, mô-men, loại motor, chỉ số motor trong `rt/lowcmd`, khối lượng (từ URDF); khớp đó cử động.
- **Nhìn xuyên (X-ray, phím `x`)**: actuator ở mọi khớp (màu theo loại motor), 2 motor cổ chân B/A xếp chồng + thanh truyền,
  mainboard RK3588S + quạt, Jetson Orin NX + ống đồng, pin cắm bên sườn, quạt hông/eo, tản đồng ở gối, board tụ, dải LED đầu,
  mảng micro, loa, cổng sau gáy, dây XT30 + CAN trong trục rỗng.
- Tách rời, 6 tư thế, tab **Bảng khớp** (29 khớp + khớp tay), tab **Hệ thống** (luồng điều khiển, họ actuator).

## Cutaway 3D (`public/viewers/`)

| File | Bộ phận | Nội dung (nguồn thật) |
|---|---|---|
| `actuator.js` | hông, đùi, gối, vai, khuỷu, cổ tay, eo yaw | đúng thứ tự tháo rời: nắp → PCB driver tròn (XT30 + CAN) → rotor 20 nam châm trong stator → vỏ đen có gân → hành tinh 18/14/46 → 16/20/56 + ổ bi LYBN CRBT355A → mặt bích thép; bảng khối lượng 14 chi tiết; mô phỏng PD của `rt/lowcmd` + đường T-N Unitree; nhiệt cuộn dây b·τ² (tay); tấm VC ở gối, quạt ở eo |
| `ankle.js` | cổ chân, eo roll/pitch | motor B trên / A dưới, giải động học thanh truyền thật, chuyển Mode::PR ↔ Mode::AB |
| `hand.js` | Dex3-1 | mesh tay thật, 7 motor F-1515, 33 ô xúc giác 9 vùng, nắm bóng ø5 cm có điều khiển lực |
| `inspire.js` | Inspire RH56 | mesh thật + cảm biến lực FTP, 6 xi-lanh điện, đốt ngọn theo tỉ lệ mimic |
| `head.js` | đầu | vỏ đầu URDF, D435i + MID-360 đúng toạ độ URDF, dải LED RGB, board LED, board MCU, vùng nhìn 2 cảm biến |
| `torso.js` | thân | mở lưng: 3 lớp che, mainboard RK3588S (RAM BIWIN, eMMC FORESEE, WiFi), Jetson + ống đồng, pin trượt vào, 9 nhánh cáp |
| `ports.js` | cổng sau gáy | 3 XT30 (VBAT/24 V/12 V), 2 RJ45, 4 USB-C (1 có DP), I/O 12 V, 6 GPIO của Orin NX |
| `pelvis.js` | khung chậu + tản nhiệt | 2 quạt ly tâm + luồng gió, khớp hông, mô phỏng nhiệt / derating |
| `depthcam.js` | D435i | máy chiếu 850 nm, stereo OV9282, disparity → bản đồ độ sâu, sai số ∝ Z² |
| `lidar.js` | MID-360 | bộ phát/thu cố định + quang học quay, point cloud tích luỹ, lắp thẳng vs lật ngược |
| `imu.js`, `battery.js`, `compute.js`, `audio.js` | IMU, pin, máy tính & mạng, micro | MEMS; pin 13S 46.8 V 0.42 kWh 2.5 kg + BmsState_; RK3588S/Orin, phần mềm PC1, IP, DDS; mảng 4 mic thẳng hàng 20 mm |

## Nguồn dữ liệu

- **Hình học, khối lượng, khớp, vị trí cảm biến**: URDF Unitree [unitree_ros/g1_description](https://github.com/unitreerobotics/unitree_ros/tree/master/robots/g1_description) (copy trong `model_src/g1_description/`).
- **Tháo rời thật**: báo cáo 中邮证券 "宇树G1人形机器人拆解报告" (2026-03-30) - khớp, mainboard, pin, dây, tản nhiệt, vật liệu, cổ chân;
  Munro Live qua [humanoid.guide](https://humanoid.guide/unitree-g1-teardown-reveals-actuator-and-cooling-tradeoffs/); [JONVER](https://www.jonver.cn/newsdetail_195);
  [arXiv 2509.14096](https://arxiv.org/abs/2509.14096) (mainboard + phần mềm PC1).
- **Tài liệu developer G1** (bản QRE [docs.quadruped.de](https://docs.quadruped.de/projects/g1/html/g1_overview.html)): cổng sau gáy, PC2, bảng khớp, tay Inspire.
- **Motor**: [unitree_rl_lab](https://github.com/unitreerobotics/unitree_rl_lab) (tỉ số từng tầng, đường T-N); [arXiv 2606.15915](https://arxiv.org/abs/2606.15915) (tổn hao đồng tay).
- **SDK**: [unitree_sdk2](https://github.com/unitreerobotics/unitree_sdk2) (topic, message IDL, Mode::PR/AB).
- **Linh kiện**: unitree.com/g1, unitree.com/Dex3-1, Livox Mid-360 User Manual, Intel D400 datasheet, NVIDIA Jetson Orin NX.

Chỗ nào nguồn không có (sườn cắm pin, vị trí mảng micro, loại cell pin, chip IMU, quỹ đạo quét LiDAR...) được ghi **⚠** ngay trên trang.

## File 3D

- `public/robot/g1.glb`, `g1_inspire.glb`, `g1_dex1.glb`, `g1_23dof.glb`, `g1_plus.glb`: build từ URDF + STL (`python model_src/build_g1_model.py [urdf] [tên]`, cần `numpy trimesh scipy fast-simplification`).
- `model_src/usd/`: USD chính thức của Unitree (HuggingFace `unitreerobotics/unitree_model`) + bản **.usda** đọc được
  (`configuration/*_base.usda` ~104 MB). Xuất lại: `python model_src/usd/export_usda.py --layers` (cần `usd-core`).

---

# Phần 2 - Chức năng (tab **Chức năng**)

Source code chính thức của Unitree đã tải về `../unitree_src/`: `unitree_sdk2`, `unitree_sdk2_python`, `unitree_ros2`,
`unitree_mujoco`, `unitree_rl_gym`, `unitree_rl_lab`, `xr_teleoperate` (clone `--depth 1`).

`public/functions.js` là danh mục 7 nhóm / 33 chức năng rút từ source đó - mỗi cái có API thật (service, api id, topic),
cơ chế, giới hạn an toàn và file nguồn:
trạng thái FSM (zero torque 0, damp 1, squat 2, sit 3, stand up 4, start 500, nằm→đứng 702, squat↔đứng 706, mimic 550xxx) ·
di chuyển (Move vx/vy/vyaw, speed mode) · cử chỉ (WaveHand, ShakeHand, 16 động tác ArmAction) · nhảy (dữ liệu mimic) ·
giọng nói / LED (AudioClient) · cấp thấp (rt/lowcmd 500 Hz, Mode PR/AB, rt/arm_sdk trọng số trộn, Dex3) · học máy / teleop / ROS 2.

## Chạy được ngay trên máy (không cần robot)

| Gì | Cách | Thật đến đâu |
|---|---|---|
| **Mô phỏng MuJoCo** - đi tiến/lùi/ngang/quay, Start, giữ đứng, Damp, Zero torque | `start_sim.bat` rồi bấm "Kết nối mô phỏng" (hoặc nút ▶ Mô phỏng ở từng chức năng). Lái bằng thanh trượt hoặc W/S A/D Q/E, Space dừng | **policy đi bộ chính thức** `unitree_rl_gym/deploy/pre_train/g1/motion.pt` (LSTM, 12 khớp chân, 50 Hz), vật lý MuJoCo 500 Hz, đúng kp/kd/obs như `deploy_mujoco.py` của Unitree. Tay giữ dáng (policy chỉ điều khiển chân). Hiển thị mô-men 12 khớp, tốc độ thật, phát hiện ngã |
| **Nhảy** - Dance 102, Gangnam Style | nút ▶ Phát dữ liệu | dữ liệu chuyển động 60 Hz của `unitree_rl_lab` (29 khớp + thân) phát lại động học - là quỹ đạo mẫu để train policy, không phải mô phỏng lực |
| Vẫy tay, ngồi xổm | ▶ Dáng minh hoạ | dáng do trang tự đặt - quỹ đạo thật nằm trong firmware Unitree, không công bố |
| LED đầu, TTS | chọn màu / nghe thử | màu hiện trên dải LED ở chế độ X-ray; giọng là của trình duyệt |

Môi trường Python cho mô phỏng: `%USERPROFILE%\.venvs\g1sim` (mujoco 3.17, torch CPU, websockets, pyyaml) - đặt ngoài OneDrive.
Cổng: web 8080, mô phỏng **18765** (8765 thường bị VS Code chiếm).

## Robot thật - `backend/robot_bridge.py` (CHƯA thử trên robot)

Chạy trên máy cắm mạng 192.168.123.x của robot (Jetson PC2 hoặc laptop Linux, cần `unitree_sdk2_python` + cyclonedds 0.10.2):
`python backend/robot_bridge.py --iface eth0`, rồi trong tab Chức năng bấm "Kết nối robot" (mặc định `ws://127.0.0.1:18766`).
Trang hiện góc 29 khớp đo được + tư thế IMU + nhiệt độ motor, và có nút 🤖 gửi lệnh thật (FSM, Move, đứng cao/thấp, vẫy/bắt tay,
16 động tác tay, TTS, LED, âm lượng). An toàn: phải bật "cho phép điều khiển", vận tốc bị giới hạn (0.5 / 0.3 m/s, 0.6 rad/s),
tự StopMove nếu mất lệnh 0.5 s hoặc mất kết nối, hỏi xác nhận với zero torque / damp / nằm→đứng. Thử lần đầu khi robot treo trên giá.

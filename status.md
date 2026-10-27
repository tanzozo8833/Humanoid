# STATUS - Dự án học Unitree G1 (cập nhật 2026-10-26)

File này để mở lại / làm tiếp sau này mà không mất context. Đọc từ trên xuống.

## Mục tiêu & cách làm (theo yêu cầu của bạn)

- **Mục tiêu**: học được mọi khía cạnh của robot hình người Unitree G1, từng bước một (step by step).
- **Phase 1 - Cấu tạo (UI)**: web 3D, click bộ phận → cấu tạo vật lý chi tiết, **thật, có nguồn**, kèm giải thích cơ chế. Làm đến bộ phận nào research kỹ bộ phận đó.
- **Phase 2 - Chức năng**: tải source code của Unitree, research và xây các chức năng humanoid làm được.
- **Thứ tự**: xong Phase 1 mới làm Phase 2. Phase 2 hiện **TẠM DỪNG** - giữ nguyên code, chờ bạn quyết định bước tiếp theo.
- Tham khảo cách làm: repo `lucnmfpt/rosmater_m3_pro` (M3Pro Manager: `robot3d.js`, `robot-parts.js`, `closeup-shell.js`, `*-viewer.js`).

## Cấu trúc thư mục `Humanoid/`

| Đường dẫn | Là gì | Dung lượng |
|---|---|---|
| `g1-explorer/` | Web app (Phase 1 + phần đã làm của Phase 2) | ~200 MB |
| `g1-explorer/public/` | Trang web: `index.html`, `app.js` (viewer chính), `parts.js` (dữ liệu bộ phận), `closeup-shell.js`, `viewers/*.js` (14 cutaway), `functions*.js` (Phase 2) | 15 MB |
| `g1-explorer/public/robot/` | `g1.glb` (tay Dex3-1), `g1_inspire.glb` (tay Inspire) + bảng khớp `.json` | |
| `g1-explorer/model_src/` | URDF + STL Unitree, script build GLB, USD gốc + bản `.usda` (~104 MB) | 187 MB |
| `g1-explorer/backend/` | Phase 2: `sim_core.py`, `sim_server.py` (mô phỏng), `robot_bridge.py` (robot thật, chưa thử) | |
| `g1-explorer/README.md` | Hướng dẫn chạy + nguồn dữ liệu | |
| `unitree_src/` | Source code chính thức Unitree (clone `--depth 1`): `unitree_sdk2`, `unitree_sdk2_python`, `unitree_ros2`, `unitree_mujoco`, `unitree_rl_gym`, `unitree_rl_lab`, `xr_teleoperate` | **~1 GB** (đang trong OneDrive) |
| `research/` | Tài liệu nguồn đã dùng: báo cáo tháo rời 中邮证券, 2 paper arXiv, manual Livox Mid-360 | 18 MB |
| `status.md` | File này | |

## Cách chạy

```
g1-explorer\start.bat        -> web http://localhost:8080   (cần Node >= 16)
g1-explorer\start_sim.bat    -> mô phỏng MuJoCo ws://127.0.0.1:18765  (chỉ cần cho Phase 2)
```
- Python cho mô phỏng: venv `C:\Users\Tan\.venvs\g1sim` (mujoco 3.17, torch 2.14 CPU, websockets, pyyaml) - đặt ngoài OneDrive.
- Python cho build model: cần `numpy trimesh scipy fast-simplification` (+ `usd-core` để xuất .usda). Venv cũ nằm trong thư mục tạm của phiên trước, có thể đã mất → tạo lại khi cần.
- Không mở thẳng `index.html` từ ổ đĩa (ES modules cần http).

---

# PHASE 1 - CẤU TẠO: ĐÃ XONG ĐẦY ĐỦ (2026-10-26)

## Mô hình 3D - 5 phiên bản (ô "Phiên bản")
| Key | URDF chính thức | Ghi chú |
|---|---|---|
| `dex3` (mặc định) | `g1_29dof_with_hand_rev_1_0` | EDU 29 DoF + Dex3-1, 43 khớp, mode 5 |
| `inspire` | `g1_29dof_rev_1_0_with_inspire_hand_FTP` | tay 5 ngón, đốt ngọn `<mimic>`, có link cảm biến lực |
| `dex1` | `g1_29dof_mode_15_with_dex1_1` | tay kẹp 2 ngón (khớp prismatic), mode 15: hông pitch hộp số 22.5, cổ tay 5010 |
| `g1_23` | `g1_23dof_rev_1_0` | bản thường 23 DoF, tay cao su |
| `g1plus` | `g1_pl` (2026-09-23) | G1+ có cổ pitch/yaw, tay cầm, họ motor mới 5010/5019/6010/7519 (motor_info.md) |
- Build bằng `model_src/build_g1_model.py <urdf> <tên>`; GLB giữ cây link/joint + extras: trục, giới hạn, mimic, khối lượng, **trọng tâm** từng khâu.
- File `.usda` theo yêu cầu: `model_src/usd/` (USD chính thức từ HuggingFace `unitreerobotics/unitree_model`, cùng hình học với URDF nhưng không có tay).

## Trang chính (tab Bộ phận / Bảng khớp / Hệ thống)
- 22 bộ phận click được (khâu thật + điểm nóng cho cảm biến / linh kiện trong thân), panel: cấu tạo bên trong, thông số, khớp/motor/tầm quay/khối lượng của khâu vừa click, nguồn, cảnh báo ⚠ chỗ nào là ước lượng.
- X-ray: actuator ở mọi khớp (màu theo loại motor), 2 motor cổ chân B/A + thanh truyền, mainboard + quạt, Jetson + ống đồng, pin, quạt hông/eo, tản đồng gối, board tụ, dải LED đầu, mic, loa, cổng sau gáy, dây XT30 + CAN.
- Tách rời, 6 tư thế (nắm tay chạy cả với Dex3 / Inspire / Dex1), bảng khớp theo thứ tự `rt/lowcmd` + cổ + khớp tay (43 / 53 / 33 / 23 / 31 dòng tuỳ phiên bản).
- **Lớp xem** (`public/overlays.js`, tính từ URDF): trục khớp + cung tầm quay · trọng tâm từng khâu + trọng tâm toàn robot + vùng chân đỡ (xanh = vững, đỏ = ngoài) · vật liệu theo teardown · vùng nhìn D435i / MID-360 · kích thước đo trên mô hình · vùng với tới của 2 tay (2500 tư thế ngẫu nhiên/tay).
- Tab Hệ thống: luồng điều khiển, họ actuator, **phân bố khối lượng theo nhóm**, **cây động học** đầy đủ.

## Từng bộ phận - trạng thái

| Bộ phận | Cutaway | Nguồn chính | Phần là ước lượng (⚠ trên trang) |
|---|---|---|---|
| Khớp (hông, đùi/gối, vai, khuỷu, cổ tay, eo yaw) | `actuator.js` | 中邮 (tháo khớp nhỏ: thứ tự lớp, số răng, ổ bi LYBN CRBT355A, bảng khối lượng 525 g), unitree_rl_lab (tỉ số từng tầng, đường T-N), arXiv 2606.15915 (nhiệt cuộn dây tay) | Khớp lớn 7520 chưa có bài tháo → giả định cùng kiểu; số rãnh stator; báo cáo ghi vành 60 răng / tổng 20.58 mâu thuẫn với Unitree (16) → dùng số của Unitree |
| Cổ chân / eo roll-pitch | `ankle.js` | Sơ đồ Unitree trong 中邮 (B trên, A dưới), SDK Mode::PR/AB, Munro (khớp cầu, cardan có mỡ) | Kích thước tay quay/thanh; vị trí 2 motor eo |
| Bàn tay Dex3-1 | `hand.js` | unitree.com/Dex3-1, URDF, IDL HandState_ | Toạ độ ô xúc giác; khớp nào dùng F-1515-108 hay -214 |
| Bàn tay Inspire RH56 | `inspire.js` | URDF FTP (mimic), bảng RH56 trong docs G1 | Vị trí 6 xi-lanh trong lòng bàn tay |
| Đầu | `head.js` | URDF (toạ độ D435i, MID-360), ảnh 中邮 (LED RGB, board LED, board MCU) | Kích thước board |
| Thân (mở lưng) | `torso.js` | 中邮 (mainboard sau lưng, 3 lớp che, chip, nhãn đầu cắm), arXiv 2509.14096 | Pin cắm sườn nào (vẽ bên trái); vị trí chính xác các board |
| Cổng sau gáy | `ports.js` | Docs G1 (bản QRE): 3 XT30, 2 RJ45, 4 USB-C, I/O, 6 GPIO Orin NX | Thứ tự xếp trên tấm |
| Khung chậu + tản nhiệt | `pelvis.js` | Munro (2 quạt hông), 中邮 (quạt eo, VC gối, NTC, derating) | Ngưỡng nhiệt / nhiệt trở trong mô phỏng |
| Camera D435i | `depthcam.js` | Datasheet Intel D400, 中邮 | Tên cảm biến ảnh OV9282/OV2740 theo diễn đàn Intel |
| LiDAR MID-360 | `lidar.js` | Manual Livox (bộ phát/thu cố định, độ phủ theo thời gian), ISPRS 2025 (gương quay) | Quỹ đạo quét (Livox không công bố) |
| IMU × 2 | `imu.js` | URDF (vị trí), SDK (pelvis → lowstate, thân → rt/secondary_imu) | Chip IMU không công bố |
| Pin | `battery.js` | 中邮 (46.8 V, 0.42 kWh, 2.5 kg, ảnh pin), IDL BmsState_ | Loại cell, số cell song song |
| Máy tính & mạng | `compute.js` | 中邮 (RK3588S, RAM, eMMC), arXiv (Ubuntu 20.04 RT, CycloneDDS, service, IP), docs (PC2) | IP MID-360 (.120 theo arXiv, .20 theo 1 hướng dẫn cộng đồng) |
| Micro + loa | `audio.js` | 中邮 (4 mic thẳng hàng 20 mm, loa 5 W) | Chỗ lắp mảng mic |
| Dây / nguồn / bus CAN | `wiring.js` | 中邮 (XT30 + CAN H/L, xuyên tâm khớp, tụ đệm cuối chi, nhánh trên mainboard), JONVER, Munro | Đường dây trong thân; đồ thị sụt áp là minh hoạ |
| Tay cầm điều khiển | `remote.js` | Manual G1 (17 bộ phận, tổ hợp phím, bật/tắt, pin 780 mAh), unitree_sdk2 `gamepad.hpp` (40 byte: header, 16 bit nút, 5 float) | Hình 3D theo ảnh; nội dung 2 byte header không công bố |
| Tay kẹp Dex1-1 | `dex1.js` | unitree.com/Dex1-1 (90 mm, 5–120 N, M4010 1:25, RS485 6 Mbps), URDF (2 khớp prismatic) | Cơ cấu thanh răng (sơ đồ) |
| Cổ G1+ | `neck.js` | URDF `g1_pl` (trục, giới hạn, mô-men), motor_info.md, so sánh mô-men G1 ↔ G1+ từ 2 URDF, báo chí (camera, mic, loa) | Vị trí cảm biến chạm |
| Bàn tay cao su, tay cầm sau lưng | (panel) | URDF 23 DoF / g1_pl | - |

## Đã kiểm tra
- Chrome headless (puppeteer, chụp màn hình): 5 phiên bản, 6 lớp xem, X-ray, bảng khớp, 26 bộ phận, mở đủ 18 loại cutaway (22 lần mở) - không lỗi console.
- **Chưa** kiểm tra: trên trình duyệt thật có GPU của bạn, giao diện điện thoại.

## Phase 1 - những gì nguồn công khai KHÔNG trả lời được (vẫn ⚠, đã research 2026-10-26)
- Bài tháo rời khớp lớn 7520 (gối, hông): không tìm thấy - chỉ biết ~1.1 kg, gối có tấm đồng VC; cấu tạo giả định giống khớp nhỏ.
- Pin cắm sườn nào, kích thước khoang pin; loại cell / số cell song song.
- Chỗ lắp mảng 4 micro; chip IMU; quỹ đạo quét MID-360; số rãnh stator; cơ cấu trong Dex1.
- G1+: chưa có bảng thông số chính thức đầy đủ (camera, micro, loa lấy từ báo chí).
→ Nếu sau này có ảnh / tài liệu mới (ví dụ tự tháo robot thật), cập nhật vào `parts.js` và bỏ ⚠ tương ứng.

---

# PHASE 2 - CHỨC NĂNG: ĐANG TẠM DỪNG (giữ nguyên)

## Đã làm
- Tải 7 repo Unitree vào `unitree_src/`.
- Danh mục chức năng `public/functions.js` + tab **Chức năng** (`public/functions-ui.js`): 7 nhóm / 33 chức năng, mỗi cái có API thật (service, api id, topic), cơ chế, giới hạn, file nguồn. Rút từ: `g1_loco_client.hpp` (FSM 0/1/2/3/4/500/702/706/550xxx, Move, SetSpeedMode, WaveHand, ShakeHand...), `g1_arm_action_client.hpp` (16 động tác), `g1_audio_client.hpp` (TTS, LED, âm lượng), ví dụ low-level (rt/lowcmd, PR/AB, rt/arm_sdk), Dex3, rl_gym, rl_lab, xr_teleoperate, ros2.
- **Mô phỏng MuJoCo** (`backend/sim_core.py` + `sim_server.py`): chạy policy đi bộ chính thức `unitree_rl_gym/deploy/pre_train/g1/motion.pt` (LSTM, 12 khớp chân, 50 Hz, vật lý 500 Hz), port trung thành `deploy_mujoco.py`. Chế độ: walk / stand / damp / zero; lệnh vx, vy, yaw. Đã kiểm chứng: đi 0.5 m/s → thực 0.44 m/s không ngã; damp → ngã; reset sau ngã 60 s vẫn đi được.
- **Phát dữ liệu nhảy thật** của Unitree (`unitree_rl_lab` mimic: Dance 102, Gangnam Style, 60 Hz, 29 khớp) lên mô hình 3D (động học).
- **Cầu nối robot thật** `backend/robot_bridge.py` (unitree_sdk2_python: LocoClient, G1ArmActionClient, AudioClient, đọc rt/lowstate) + nút 🤖 trên trang. Có an toàn: phải bật cho phép, giới hạn vận tốc, watchdog 0.5 s, StopMove khi mất kết nối, xác nhận lệnh nguy hiểm.

## Chưa làm / chưa kiểm chứng
- `robot_bridge.py` **chưa từng chạy với robot thật** (không có robot; cyclonedds khó cài trên Windows - chạy trên Linux/Jetson).
- Mô phỏng chỉ có chân (policy 12 DoF); tay đứng yên. Các động tác tay, vẫy tay, ngồi... trong trang chỉ là dáng minh hoạ, vì quỹ đạo thật nằm trong firmware Unitree.
- Chưa: điều khiển tay kiểu rt/arm_sdk trong mô phỏng, dùng mô phỏng chính thức `unitree_mujoco` (bridge DDS), train policy, teleop XR, ROS 2.

## Ý tưởng bước tiếp theo cho Phase 2 (chưa làm, chờ bạn chọn)
Học theo thứ tự từ dưới lên: (1) một motor - PD và rt/lowcmd; (2) đọc/ghi lowstate-lowcmd trong mô phỏng; (3) policy đi bộ hoạt động thế nào (obs 47 số → action 12); (4) điều khiển tay khi đang đi (arm_sdk); (5) high-level API (LocoClient...); (6) bàn tay Dex3; (7) train policy (rl_gym / rl_lab); (8) teleop + học bắt chước.

---

## Ghi chú kỹ thuật cần nhớ
- Cổng: web 8080; mô phỏng **18765** (8765 bị VS Code chiếm); robot bridge 18766.
- `motion.pt` là LSTM (buffer `hidden_state`, `cell_state`) → phải xoá khi reset (đã làm trong `sim_core.reset`).
- Toạ độ: URDF/MuJoCo là Z-up (ROS); trang xoay -90° quanh X sang Y-up của three.js. Quaternion trong CSV nhảy là xyzw, MuJoCo là wxyz.
- Thứ tự 29 khớp SDK = `SDK_ORDER` trong `parts.js` = `joint_sdk_names` của unitree_rl_lab = thứ tự cột trong CSV nhảy.
- Khi phiên Claude Code kết thúc, các server chạy nền sẽ dừng → chạy lại `start.bat` / `start_sim.bat`.
- Nguồn chính của Phase 1: `research/zhongyou_G1_teardown_2026-03.pdf` (59 trang, có ảnh - trang 17-45 là phần tháo rời).

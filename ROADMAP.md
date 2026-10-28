# Lộ trình học Unitree G1: từ cơ bản đến nâng cao

> Dành cho người mới bắt đầu học robot. Lấy G1 làm "giáo cụ" xuyên suốt: mỗi kiến thức đều gắn vào đúng bộ phận, đúng file code, đúng dữ liệu thật đã có trong thư mục `Humanoid/`.
> Tạo 2026-10-28. Tiến độ đánh dấu bằng `[x]`. Trạng thái kỹ thuật của web vẫn ghi ở `status.md`.

---

## 1. Logic sắp xếp

Mỗi giai đoạn trả lời **một câu hỏi** và cần câu trả lời của các giai đoạn trước:

```
GĐ0 Công cụ + toán nền          "Mình cần dụng cụ gì để học?"
 └─ GĐ1 Cấu tạo                  "Robot gồm những gì?"                 (web phần 1 đã có)
     └─ GĐ2 Động học             "Các khâu nằm ở đâu, chuyển động ra sao?"   (hình học, chưa có lực)
         └─ GĐ3 Động lực học     "Cần bao nhiêu lực, motor tạo lực thế nào?"
             └─ GĐ4 Phần mềm     "Ra lệnh cho motor và đọc cảm biến bằng cách nào?"
                 ├─ GĐ5 Cân bằng cổ điển   "Vì sao robot 2 chân đứng / đi được?"   (lý thuyết ZMP, LIPM)
                 │   └─ GĐ6 Học tăng cường "Unitree thực sự làm G1 đi bằng cách nào?"
                 ├─ GĐ7 Tay + thao tác     "Cầm nắm, điều khiển từ xa thế nào?"   (cần IK của GĐ2)
                 └─ GĐ8 Cảm nhận           "Robot biết mình ở đâu, thấy gì?"
                         └─ GĐ9 Robot thật → GĐ10 Dự án tổng hợp
```

Ba nguyên tắc dùng cho mọi task:
1. **Hiểu → Làm → Kiểm chứng → Ghi lại.** Đọc lý thuyết, tự code, so kết quả với một nguồn độc lập (thư viện chuẩn, mô phỏng, số liệu Unitree), rồi viết ghi chú vào `notes/GĐx_Tyy.md`.
2. **Tự viết trước, dùng thư viện sau.** Ví dụ: tự viết FK bằng numpy, rồi mới so với Pinocchio. Hai bên khớp nhau thì mới coi là hiểu.
3. **Mô phỏng trước, robot thật sau cùng.** Mọi lệnh motor đều chạy thử trong MuJoCo trước.

Ký hiệu: 📖 học/đọc · 🧪 bài thực hành (code) · 🛠 cải thiện web `g1-explorer` · ✅ tiêu chí hoàn thành · ⏱ thời gian ước tính (giả định khoảng 10–12 giờ/tuần).

**Máy hiện tại:** Windows 11, Python 3.11, WSL Ubuntu 22.04 (có sẵn), GPU **MX450 2 GB**. GPU này không train RL kiểu Isaac Gym/Isaac Lab được: GĐ6 sẽ train trên GPU cloud. Phần còn lại chạy được trên máy.

**Cách dùng với Claude:** nói "làm T2.4" (hoặc "giải thích T2.4", "kiểm tra bài T2.4 của t"). Mỗi lần chỉ làm đúng task đó. Xong task nào thì đánh `[x]`, commit git và cập nhật `status.md` nếu web thay đổi.

---

## 2. Tổng quan

| GĐ | Chủ đề | ⏱ | Đầu ra chính |
|---|---|---|---|
| 0 | Công cụ + toán nền | 1–2 tuần | Môi trường chạy được, thư viện phép quay tự viết |
| 1 | Cấu tạo | 2 tuần | Sơ đồ khối hệ thống, parser URDF, câu hỏi tự kiểm tra trên web |
| 2 | Động học | 3 tuần | FK/IK tự viết, kéo tay robot trên web |
| 3 | Động lực học + actuator | 3 tuần | Mô-men trọng lực từng khớp, PD trong MuJoCo |
| 4 | Phần mềm, DDS, SDK, ROS 2 | 3 tuần | Tự điều khiển G1 trong sim qua `rt/lowcmd`, web xem trạng thái live |
| 5 | Cân bằng, đi bộ cổ điển | 2–3 tuần | Demo LIPM / capture point, đứng chịu đẩy trong sim |
| 6 | Học tăng cường | 4 tuần | Policy tự train chạy trong MuJoCo |
| 7 | Tay, thao tác, teleop | 3 tuần | Điều khiển tay trên nền đi bộ, retarget bàn tay |
| 8 | Cảm nhận, định vị | 3 tuần | Ước lượng tư thế, point cloud trên web |
| 9 | Robot thật | khi có robot | Quy trình an toàn, đo sai khác sim ↔ thật |
| 10 | Dự án tổng hợp | 2–4 tuần | Một tính năng hoàn chỉnh + báo cáo |

Tổng cộng khoảng **7 tháng** nếu đều đặn. GĐ5, GĐ7 và GĐ8 có thể đổi thứ tự cho nhau sau khi xong GĐ4.

---

## GĐ0: Công cụ và toán nền (1–2 tuần)

- [ ] **T0.1 Môi trường làm việc**
  - 🧪 Chạy web (`g1-explorer/start.bat`) và mô phỏng (`start_sim.bat`). Mở WSL Ubuntu 22.04, tạo venv Python trong WSL. Cài VS Code + extension WSL.
  - 🧪 Git: repo đã khởi tạo. Học `status / add / commit / log / diff`. Commit hiện trạng làm mốc "trước khi học".
  - ✅ Web mở ở :8080, sim đi được bằng W/S, có commit đầu tiên của bạn.

- [ ] **T0.2 Đại số tuyến tính cho robot**
  - 📖 Vector, ma trận, tích vô hướng / có hướng, hệ phương trình, nghịch đảo giả (pseudo-inverse), SVD ở mức trực giác. Nguồn: 3Blue1Brown *Essence of Linear Algebra*.
  - 🧪 Dùng numpy: giải `Ax=b`, tính `pinv`, SVD một ma trận 3×7 (giống Jacobian tay 7 khớp sau này).
  - ✅ Giải thích được vì sao ma trận 3×7 có vô số nghiệm `x`.

- [ ] **T0.3 Phép quay và biến đổi đồng nhất** *(nền của mọi thứ phía sau)*
  - 📖 Ma trận quay SO(3), Euler / roll-pitch-yaw, quaternion, ma trận 4×4 SE(3). Nguồn: *Modern Robotics* (Lynch & Park, PDF miễn phí) chương 3.
  - 🧪 Tự viết `rot.py`: rpy→R, R→quat, quat→R, ghép và nghịch đảo 4×4. Kiểm tra lại bằng `scipy.spatial.transform.Rotation`.
  - 🧪 Đọc `g1-explorer/model_src/build_g1_model.py`: tìm chỗ đổi URDF rpy và chỗ quay Z-up → Y-up.
  - ✅ Giải thích được vì sao URDF dùng thứ tự `Rz·Ry·Rx` và vì sao web phải quay −90° quanh X.

- [ ] **T0.4 🛠 Đưa test tự động vào repo**
  - 🛠 Chuyển script puppeteer chụp màn hình (đang ở scratchpad) vào `g1-explorer/tests/`. Thêm lệnh `node tests/smoke.js` để mở 5 phiên bản, bật các lớp xem, mở các cutaway và báo lỗi console.
  - ✅ Mỗi lần sửa web chạy 1 lệnh là biết có hỏng gì không. Từ đây, mọi task 🛠 phải qua test này.

---

## GĐ1: Cấu tạo, "robot gồm những gì?" (2 tuần)

*Dùng web phần 1 làm sách giáo khoa. Mỗi task: đọc panel và cutaway của bộ phận, rồi làm bài tính tay.*

- [ ] **T1.1 Bức tranh hệ thống**
  - 📖 Tab Hệ thống, `status.md`, trang unitree.com/g1.
  - 🧪 Tự vẽ trên giấy sơ đồ khối: cảm biến → máy tính (PC1 RK3588S / PC2 Orin NX) → bus CAN → driver motor → khớp. Nguồn từ pin → các nhánh điện áp. Đối chiếu với web.
  - ✅ Vẽ lại được.

- [ ] **T1.2 URDF và cây động học**
  - 📖 Cấu trúc URDF: `link` (visual / collision / inertial), `joint` (type, origin, axis, limit), `mimic`.
  - 🧪 Viết `urdf_table.py` parse `model_src/g1_description/g1_29dof_with_hand_rev_1_0.urdf` (dùng `xml.etree`) và in bảng khớp: tên, cha → con, trục, giới hạn, effort, velocity. So với tab **Bảng khớp**.
  - 🧪 Đếm DoF của 5 phiên bản (dex3 / inspire / dex1 / 23dof / G1+) và giải thích vì sao chúng khác nhau.
  - ✅ Tự vẽ được cây chân trái từ pelvis đến ankle_roll; chỉ ra được thứ tự khớp trong `rt/lowcmd`.

- [ ] **T1.3 Actuator: trái tim của robot**
  - 📖 Cutaway `actuator.js`: motor PMSM, FOC (ở mức ý tưởng), hộp số hành tinh 2 tầng, encoder kép, ổ bi đũa chéo, PCB driver.
  - 🧪 Tính tỉ số truyền từ số răng (tầng 1: mặt trời 18 / hành tinh 14 / vành 46, tầng 2: 16 / 20 / 56; công thức `1 + Z_vành/Z_mặt trời` khi vành đứng yên). Kết quả phải ra ≈16, khớp với tên motor N5020-**16**.
  - 🧪 *Bài tư duy phản biện:* báo cáo tháo rời 中邮 ghi vành 60 răng và tỉ số ~20.58, mâu thuẫn với con số 16 của Unitree. Dùng ràng buộc hình học `Z_vành = Z_mặt trời + 2·Z_hành tinh` để chỉ ra con số nào sai. Ghi chú trong `actuator.js` dòng ~110 là đáp án, hãy làm trước rồi mới xem.
  - 🧪 Mô-men ra = mô-men motor × tỉ số × hiệu suất. Ước lượng mô-men motor của khớp gối từ mô-men giới hạn trong URDF.
  - ✅ Giải thích được: vì sao cần hộp số, vì sao 2 encoder, vì sao dùng ổ bi đũa chéo.

- [ ] **T1.4 Khớp song song: cổ chân và eo**
  - 📖 Cutaway `ankle.js`: 2 motor A/B + thanh truyền → pitch/roll; `Mode::PR` và `Mode::AB` trong SDK.
  - 🧪 Viết hàm xấp xỉ (tuyến tính quanh 0) đổi (pitch, roll) ↔ (A, B). So với hoạt ảnh trên web.
  - ✅ Giải thích được vì sao Unitree đặt motor cổ chân lên bắp chân (quán tính chân).

- [ ] **T1.5 Bàn tay**: Dex3-1, Inspire RH56, Dex1-1
  - 📖 3 cutaway `hand.js`, `inspire.js`, `dex1.js`.
  - 🧪 Bảng so sánh 3 tay: số DoF, cách truyền động, cảm biến, lực, khi nào dùng loại nào.
  - ✅ Giải thích được `mimic` và vì sao tay Inspire có 12 khớp nhưng chỉ 6 motor.

- [ ] **T1.6 Cảm biến**: IMU, D435i, MID-360, micro
  - 📖 Cutaway `imu.js`, `depthcam.js`, `lidar.js`, `audio.js`.
  - 🧪 Tính sai số độ sâu stereo `σZ = Z²·σd/(f·b)` cho D435i (baseline 50 mm) ở 1 m và 3 m. So với kết luận "sai số ∝ Z²" trên web.
  - ✅ Nói được mỗi cảm biến đo gì, tần số bao nhiêu, dùng cho việc gì (cân bằng / tránh vật / SLAM / giọng nói).

- [ ] **T1.7 Điện, tính toán, mạng**
  - 📖 Cutaway `battery.js`, `wiring.js`, `torso.js`, `compute.js`, `ports.js`.
  - 🧪 Ước lượng thời gian chạy: năng lượng pin 0.42 kWh ÷ công suất trung bình khi đi (lấy số liệu từ bài arXiv 2606.15915 trong `research/`).
  - ✅ Biết IP của PC1/PC2, chương trình nào chạy ở đâu, dây nguồn và CAN đi thế nào qua khớp.

- [ ] **T1.8 🛠 Câu hỏi tự kiểm tra trên web**
  - 🛠 Thêm trường `quiz: [{q, a}]` cho từng phần trong `parts.js`. Panel bộ phận có nút "Tự kiểm tra" (ẩn đáp án, bấm để xem). Viết câu hỏi từ chính ghi chú T1.1–T1.7.
  - ✅ Mỗi bộ phận chính có ≥3 câu, test T0.4 vẫn qua.

**🏁 Mốc GĐ1:** giải thích cho người khác trong 10 phút "G1 hoạt động thế nào" từ pin đến bàn chân.

---

## GĐ2: Động học, "các khâu ở đâu, chuyển động ra sao?" (3 tuần)

- [ ] **T2.1 Động học thuận (FK)**
  - 📖 *Modern Robotics* ch.4 (tích các phép biến đổi dọc chuỗi khớp).
  - 🧪 Tự viết `fk.py` (dùng `urdf_table.py` + `rot.py`): cho 29 góc khớp → vị trí và hướng của mọi khâu. Tính vị trí bàn chân, bàn tay ở tư thế 0 và ở một tư thế ngẫu nhiên.
  - 🧪 Kiểm chứng: cài Pinocchio (`pip install pin`, hoặc trong WSL), load cùng URDF, so sai lệch (< 1e-6 m).
  - ✅ 2 kết quả khớp nhau, giải thích được từng phép nhân ma trận.

- [ ] **T2.2 🛠 Web: hiện hệ toạ độ và ma trận của khâu**
  - 🛠 Khi chọn một khâu: vẽ gizmo trục X/Y/Z (đỏ/xanh lá/xanh dương) tại khâu đó, panel hiện ma trận 4×4 `T_pelvis→link` theo quy ước ROS (Z-up).
  - 🧪 Đặt cùng một tư thế ở web và `fk.py` → so số.
  - ✅ Số trên web = số `fk.py`.

- [ ] **T2.3 Jacobian và vận tốc**
  - 📖 Jacobian hình học, điểm kỳ dị (singularity), độ linh hoạt (manipulability) `√det(JJᵀ)`.
  - 🧪 Tính Jacobian tay trái (7 khớp) bằng 2 cách: giải tích và sai phân hữu hạn trên `fk.py`. Tìm tư thế kỳ dị (tay duỗi thẳng).
  - ✅ 2 cách khớp nhau; giải thích được vì sao tay duỗi thẳng thì "mất" một hướng chuyển động.

- [ ] **T2.4 Động học ngược (IK)**
  - 📖 IK lặp: Newton, Damped Least Squares; tận dụng bậc dư (null-space) của tay 7 DoF.
  - 🧪 Viết `ik.py`: đưa bàn tay tới điểm (x, y, z) có giới hạn khớp; đặt bàn chân tới vị trí mong muốn (chân 6 DoF).
  - 🧪 Thí nghiệm: điểm ngoài tầm với → hành vi của DLS khi λ lớn / nhỏ.
  - ✅ IK hội tụ < 1 mm với điểm trong vùng với tới (so với lớp xem "vùng với tới" trên web).

- [ ] **T2.5 🛠 Web: kéo bàn tay bằng chuột**
  - 🛠 Chế độ "IK": kéo một quả cầu đích, tay robot đi theo (DLS viết bằng JS, chạy mỗi khung hình), có tôn trọng giới hạn khớp. Hiện độ linh hoạt bằng màu.
  - ✅ Kéo mượt, không giật ở gần điểm kỳ dị, test T0.4 qua.

- [ ] **T2.6 Trọng tâm và ổn định tĩnh**
  - 📖 Trọng tâm toàn thân = Σ mᵢ·cᵢ / Σ mᵢ; đa giác chân đỡ; điều kiện đứng yên tĩnh.
  - 🧪 Tính CoM bằng `fk.py` + khối lượng URDF ở 6 tư thế của web. So với lớp xem "trọng tâm".
  - 🧪 Tìm góc nghiêng thân tối đa trước khi CoM ra ngoài bàn chân khi đứng 1 chân.
  - ✅ Số khớp với overlay.

**🏁 Mốc GĐ2:** cho một tư thế bất kỳ, tự tính vị trí mọi khâu và CoM; cho điểm đích, tự tính góc khớp.

---

## GĐ3: Động lực học và actuator, "cần bao nhiêu lực?" (3 tuần)

- [ ] **T3.1 Phương trình chuyển động**
  - 📖 `M(q)q̈ + C(q,q̇)q̇ + g(q) = τ + Jᵀf` (Modern Robotics ch.8). Ý nghĩa từng thành phần, ở mức trực giác trước khi vào công thức.
  - 🧪 Dùng Pinocchio: `rnea` (mô-men cần thiết), `crba` (ma trận khối lượng M). Tính mô-men trọng lực các khớp chân khi đứng thẳng, ngồi xổm, đứng 1 chân.
  - 🧪 So với mô-men giới hạn trong URDF: tư thế nào làm khớp gối gần quá tải?
  - ✅ Bảng: tư thế × khớp × % mô-men giới hạn.

- [ ] **T3.2 🛠 Web: lớp xem "mô-men trọng lực"**
  - 🛠 Lớp xem mới trong `overlays.js`: với tư thế hiện tại, tính `τ_g` từng khớp bằng JS (cộng `r × m·g` của cây con chiếu lên trục khớp), giả sử chân đứng cố định. Vẽ thanh màu theo % so với mô-men max.
  - 🧪 So số với Pinocchio ở T3.1.
  - ✅ Sai lệch < 1%.

- [ ] **T3.3 Mô hình motor và điều khiển PD tại khớp**
  - 📖 Hằng số mô-men Kt, đường đặc tính mô-men–tốc độ (T-N), tổn hao đồng I²R → nhiệt. Luật điều khiển khớp của Unitree: `τ = kp(q* − q) + kd(q̇* − q̇) + τ_ff`.
  - 🧪 Mô phỏng 1 khớp (Python, tích phân Euler): đáp ứng bước với các cặp kp/kd khác nhau; quan sát vọt lố, dao động, sai số tĩnh khi có trọng lực, rồi thêm `τ_ff = g(q)` để triệt sai số.
  - 🧪 So với mô phỏng PD trong cutaway `actuator.js` và giá trị kp/kd Unitree dùng trong `unitree_rl_gym/deploy/deploy_mujoco/configs/g1.yaml`.
  - ✅ Giải thích được vì sao policy dùng kp nhỏ (khớp "mềm") thay vì kp rất lớn.

- [ ] **T3.4 MuJoCo căn bản**
  - 📖 Tài liệu MuJoCo: MJCF, `timestep`, tiếp xúc (contact), actuator, `mj_step`. Đọc `unitree_src/unitree_mujoco/unitree_robots/g1/`.
  - 🧪 Script riêng: thả G1 rơi tự do; treo pelvis cố định rồi giữ tư thế bằng PD (có / không bù trọng lực); ghi mô-men các khớp và so với T3.1.
  - ✅ Có đồ thị mô-men theo thời gian; hiểu khác biệt giữa sim 500 Hz và điều khiển 50 Hz.

**🏁 Mốc GĐ3:** giải thích được vì sao khớp gối và hông pitch dùng motor lớn nhất (7520), dựa trên số liệu tự tính.

---

## GĐ4: Phần mềm và giao tiếp, "ra lệnh cho robot thế nào?" (3 tuần)

*Làm trong WSL Ubuntu 22.04: cyclonedds và SDK chạy ổn trên Linux.*

- [ ] **T4.1 Kiến trúc phần mềm Unitree**
  - 📖 DDS (publish / subscribe, topic, QoS, domain id), CycloneDDS. Message IDL: `LowCmd_`, `LowState_`, `MotorCmd_`, `IMUState_` trong `unitree_sdk2/include/`. CRC32 của lowcmd, tần số 500 Hz, `mode_pr`, `mode_machine`.
  - 🧪 Vẽ sơ đồ: ai publish / subscribe topic nào (`rt/lowcmd`, `rt/lowstate`, `rt/arm_sdk`, `rt/dex3/*`, RPC của LocoClient). Đối chiếu tab Chức năng trên web.
  - ✅ Giải thích được vì sao phải tắt dịch vụ điều khiển cấp cao (sport mode) trước khi gửi `rt/lowcmd`.

- [ ] **T4.2 Chạy SDK với mô phỏng chính thức**
  - 🧪 Trong WSL: cài `unitree_sdk2_python` + cyclonedds 0.10.2. Chạy `unitree_mujoco/simulate_python/unitree_mujoco.py` với robot g1 (domain 1, interface `lo`). Chạy `unitree_sdk2_python/example/g1/low_level/g1_low_level_example.py` trỏ vào sim.
  - ✅ Thấy robot trong sim cử động theo example, đọc được `rt/lowstate` (góc khớp, IMU) in ra terminal.

- [ ] **T4.3 Tự viết bộ điều khiển cấp thấp**
  - 🧪 `my_stand.py`: từ tư thế hiện tại, nội suy mượt về tư thế đứng trong 3 s qua `rt/lowcmd`, rồi giữ bằng PD. Phải có: kiểm tra giới hạn khớp, giới hạn tốc độ thay đổi, tự chuyển sang damp nếu mất `lowstate` > 0.1 s, CRC đúng.
  - 🧪 Thêm "lắc cổ chân" ở chế độ PR, rồi ở chế độ AB, để thấy khác biệt.
  - ✅ Chạy ổn định trong sim; đọc lại code `g1_ankle_swing_example.cpp` (C++) và chỉ ra chỗ tương ứng.

- [ ] **T4.4 🛠 Web: xem trạng thái live từ mô phỏng chính thức**
  - 🛠 Cho `backend/robot_bridge.py` một chế độ `--sim` (domain 1, `lo`) để nghe `rt/lowstate` từ `unitree_mujoco`. Web hiện 29 góc khớp lên mô hình 3D + IMU + đồ thị góc khớp theo thời gian.
  - Ghi chú: sim chính thức chỉ có lowstate/lowcmd, không có LocoClient/ArmAction (các dịch vụ đó nằm trong firmware robot). Phần cấp cao của bridge vẫn chưa test được.
  - ✅ Đây là lần đầu `robot_bridge.py` được kiểm thử thật (phần cấp thấp). Cập nhật `status.md`.

- [ ] **T4.5 API cấp cao (đọc hiểu)**
  - 📖 `g1_loco_client_example.py`, `g1_arm_action_example.py`, `g1_audio_client_example.py`; cơ chế RPC request/response trên DDS (`unitree_sdk2py/rpc/`). Máy trạng thái FSM (0, 1, 2, 3, 4, 500, 702, 706…).
  - 🧪 Vẽ sơ đồ chuyển trạng thái FSM: từ trạng thái nào sang được trạng thái nào, lệnh gì.
  - ✅ Sơ đồ khớp với tab Chức năng; biết lệnh nào nguy hiểm (zero torque khi đang đứng).

- [ ] **T4.6 ROS 2**
  - 📖 ROS 2 Humble: node, topic, tf2, `robot_state_publisher`, RViz2. `unitree_ros2` (cầu DDS trực tiếp, không cần bridge).
  - 🧪 Trong WSL: hiển thị URDF G1 trên RViz2; viết node đọc `lowstate` từ sim → publish `/joint_states` → RViz2 cử động theo sim.
  - ✅ RViz2 và web cùng hiện một tư thế.

**🏁 Mốc GĐ4:** tự viết từ đầu chương trình điều khiển G1 cấp thấp an toàn trong sim, và giải thích từng byte gửi đi.

---

## GĐ5: Cân bằng và đi bộ cổ điển, "vì sao đứng / đi được?" (2–3 tuần)

*Học nền tảng vật lý trước để hiểu RL ở GĐ6 đang "học" cái gì.*

- [ ] **T5.1 ZMP, con lắc ngược, capture point**
  - 📖 Kajita, *Introduction to Humanoid Robotics* (ZMP, LIPM, preview control); Tedrake, *Underactuated Robotics* (online, chương về đi bộ); Pratt: capture point.
  - 🧪 Mô phỏng LIPM 1D trong Python: đẩy thân, tính capture point, đặt bước chân tại đó → dừng được.
  - ✅ Giải thích được: vì sao CoM trong đa giác chân đỡ là chưa đủ khi đang chuyển động; vì sao bước chân là "cách cân bằng mạnh nhất".

- [ ] **T5.2 🛠 Web: trang demo LIPM tương tác**
  - 🛠 Trang `public/lab/lipm.html`: con lắc ngược 2D/3D, kéo thả để đẩy, hiện ZMP, capture point, vùng chân đỡ, tự đặt bước. Thêm link từ tab Hệ thống.
  - ✅ Đẩy mạnh thì demo tự bước, đẩy nhẹ thì chỉ nghiêng.

- [ ] **T5.3 Đứng cân bằng trong MuJoCo**
  - 🧪 Bộ điều khiển đứng: PD khớp + bù trọng lực + chiến lược cổ chân (ankle strategy) / hông (hip strategy) theo lỗi CoM. Đẩy thân bằng lực ngoài, đo lực đẩy tối đa trước khi ngã.
  - 🧪 So với policy Unitree (sim_server hiện có) khi bị đẩy cùng mức lực.
  - ✅ Bảng: lực đẩy tối đa của bộ điều khiển tự viết so với policy RL.

- [ ] **T5.4 (tuỳ chọn, nâng cao) Đi tại chỗ bằng ZMP preview control**
  - 🧪 Sinh quỹ đạo CoM từ kế hoạch bước chân, dùng IK (T2.4) đổi ra góc khớp, chạy trong MuJoCo.
  - ✅ G1 bước tại chỗ ≥10 bước không ngã.

**🏁 Mốc GĐ5:** giải thích được vì sao Unitree chọn RL thay vì ZMP cho G1, dựa trên chính thí nghiệm T5.3/T5.4.

---

## GĐ6: Học tăng cường, "Unitree làm G1 đi thế nào?" (4 tuần)

- [ ] **T6.1 Nền tảng RL**
  - 📖 MDP, policy, value, PPO. Nguồn: OpenAI *Spinning Up*; bài *Learning to Walk in Minutes* (Rudin et al., 2021, nền của `legged_gym`).
  - 🧪 Train PPO cho CartPole / Pendulum (Gymnasium + stable-baselines3, chạy CPU được).
  - ✅ Giải thích được vai trò của reward, advantage, clip trong PPO.

- [ ] **T6.2 Mổ xẻ policy đang chạy trên máy**
  - 📖 `unitree_rl_gym/deploy/deploy_mujoco/deploy_mujoco.py` và `g1-explorer/backend/sim_core.py`: vector quan sát (vận tốc góc, hướng trọng lực, lệnh, q, q̇, action trước, pha bước), action scale, góc mặc định, kp/kd, decimation 500→50 Hz, trạng thái LSTM.
  - 🛠 **Policy inspector**: tab Chức năng hiện realtime vector obs và action (đồ thị), pha bước, chân nào đang chạm đất.
  - ✅ Liệt kê được từng phần tử trong obs và nói vì sao policy cần nó.

- [ ] **T6.3 Môi trường train**
  - 📖 `unitree_rl_gym/legged_gym/envs/g1/` + `envs/base/legged_robot.py`: các reward, domain randomization (ma sát, khối lượng, đẩy), curriculum, địa hình. Song song đọc `unitree_rl_lab` (bản Isaac Lab, mới hơn).
  - 🧪 Bảng: mỗi reward → mục đích → điều gì xảy ra nếu bỏ nó (dự đoán).
  - ✅ Bảng hoàn chỉnh, đối chiếu được 2 repo.

- [ ] **T6.4 Train policy của riêng mình** *(cần GPU cloud)*
  - 🧪 MX450 2 GB không đủ → dùng GPU thuê hoặc Colab. Hai lựa chọn: (a) Isaac Gym + `unitree_rl_gym` trên máy thuê Linux; (b) MuJoCo Playground (MJX, JAX) có môi trường G1 đi bộ, chạy được trên Colab (kiểm tra lại tên env khi làm).
  - 🧪 Export policy → chạy sim2sim trong MuJoCo bằng `sim_server.py` (thay `motion.pt`).
  - ✅ Policy tự train đi được trong MuJoCo của máy mình.

- [ ] **T6.5 Thí nghiệm có kiểm soát (ablation)**
  - 🧪 Mỗi lần đổi một thứ: bỏ domain randomization / bỏ một reward / đổi kp. Train lại, đo tốc độ, năng lượng (Σ|τ·q̇|), số lần ngã khi bị đẩy. Kiểm chứng dự đoán ở T6.3.
  - ✅ Báo cáo `notes/GĐ6_ablation.md` có bảng số và kết luận.

- [ ] **T6.6 Bắt chước chuyển động (motion imitation)**
  - 📖 `unitree_rl_lab/.../tasks/mimic`: policy theo dõi quỹ đạo tham chiếu (dữ liệu dance CSV đã có trong web).
  - 🧪 So sánh phát lại động học (web hiện tại) với tracking bằng policy có vật lý: vì sao phát lại thì robot thật sẽ ngã.
  - ✅ Giải thích được khác biệt giữa động học (kinematic) và động lực (dynamic).

**🏁 Mốc GĐ6:** tự đi hết chuỗi train → sim2sim → phân tích; giải thích từng dòng của `deploy_real.py`.

---

## GĐ7: Tay, thao tác và điều khiển từ xa (3 tuần)

- [ ] **T7.1 Điều khiển tay trên nền đi bộ**
  - 📖 `rt/arm_sdk` và trọng số trộn (`g1_arm7_sdk_dds_example.py`): policy giữ chân, người dùng điều khiển tay.
  - 🧪 Trong sim của mình: chân do policy, tay do IK (T2.4) theo đích, có trộn trọng số mượt.
  - ✅ Robot vừa đi vừa giơ tay tới đích mà không ngã.

- [ ] **T7.2 Bàn tay Dex3**
  - 📖 `unitree_sdk2/example/g1/dex3/g1_dex3_example.cpp`: topic `rt/dex3/left|right/cmd|state`, xúc giác, giới hạn lực.
  - 🧪 Nắm / mở có điều khiển lực trong MuJoCo (nếu MJCF có tay) hoặc trong mô phỏng đơn giản tự viết.
  - ✅ Giải thích được điều khiển vị trí và điều khiển lực khác nhau thế nào khi cầm vật mềm.

- [ ] **T7.3 Teleoperation**
  - 📖 `xr_teleoperate/teleop/`: televuer (nhận tư thế tay từ kính XR), robot_control (IK tay bằng Pinocchio), retarget bàn tay người → robot.
  - 🧪 Vẽ luồng dữ liệu từ kính đến motor, độ trễ ở từng bước.
  - ✅ Hiểu đủ để chạy chế độ sim của repo nếu có thiết bị.

- [ ] **T7.4 🛠 Web: retarget bàn tay từ webcam**
  - 🛠 Dùng MediaPipe Hands (JS) đọc bàn tay qua webcam → ánh xạ góc ngón sang khớp Dex3 / Inspire trên mô hình 3D (chính là bài toán retarget của T7.3).
  - ✅ Nắm / mở tay thật thì tay robot trên web làm theo.

- [ ] **T7.5 Học bắt chước (imitation learning), tổng quan**
  - 📖 ACT, Diffusion Policy, LeRobot; repo `unitree_IL_lerobot` (tải thêm khi tới bước này).
  - ✅ Giải thích được vì sao teleop là bước thu dữ liệu cho imitation learning.

---

## GĐ8: Cảm nhận và định vị (3 tuần)

- [ ] **T8.1 Ước lượng trạng thái**
  - 📖 IMU: gyro, gia tốc, trôi (bias). Bộ lọc bù (complementary filter), EKF. Ước lượng vận tốc thân từ IMU + chân chạm đất (leg odometry).
  - 🧪 Lấy IMU từ sim (thêm nhiễu và bias) → tự viết complementary filter → so với ground truth.
  - ✅ Đồ thị sai số roll/pitch theo thời gian.

- [ ] **T8.2 Camera độ sâu**
  - 📖 Mô hình camera pinhole, nội tham số / ngoại tham số; ngoại tham số D435i lấy từ URDF.
  - 🧪 Render ảnh depth từ camera gắn ở đầu G1 trong MuJoCo → chiếu ra point cloud → biến đổi sang hệ toạ độ pelvis bằng FK.
  - ✅ Point cloud nằm đúng chỗ so với cảnh sim.

- [ ] **T8.3 LiDAR và SLAM**
  - 📖 MID-360 (manual trong `research/`), FAST-LIO2, bản đồ chiếm ô (occupancy map).
  - 🧪 Trong WSL + ROS 2: chạy FAST-LIO2 trên bộ dữ liệu mẫu của MID-360; xem trên RViz2.
  - ✅ Có bản đồ 3D + quỹ đạo.

- [ ] **T8.4 🛠 Web: point cloud trên mô hình**
  - 🛠 Nạp file PLY/PCD, đặt đúng hệ toạ độ `mid360_link` / `d435_link` trên robot 3D, tô màu theo độ cao.
  - ✅ Cloud từ T8.2/T8.3 hiện đúng vị trí trên web.

---

## GĐ9: Robot thật (khi có G1)

- [ ] **T9.1 An toàn trước hết**: giá treo, debug mode, dừng khẩn, kiểm tra nhiệt độ motor / pin, vùng cấm người. Viết checklist in ra giấy.
- [ ] **T9.2 Kết nối, chỉ đọc**: mạng 192.168.123.x, đọc `lowstate` thật. So nhiễu IMU và encoder với sim (sai khác sim2real).
- [ ] **T9.3 `robot_bridge.py` từng bước**: chỉ đọc → TTS/LED → động tác tay khi robot treo → Move tốc độ thấp.
- [ ] **T9.4 Deploy policy tự train** (`deploy_real`), chỉ sau khi T6.4 sim2sim ổn định, bắt đầu khi treo giá.

---

## GĐ10: Dự án tổng hợp (2–4 tuần)

Chọn 1 dự án (hoặc tự đề xuất), làm trong sim, kết hợp ≥3 giai đoạn:
- **"Đi tới và chạm"**: nhận đích từ point cloud (GĐ8) → đi tới bằng policy (GĐ6) → chạm bằng IK tay (GĐ2/7).
- **"Chịu đẩy"**: so sánh có hệ thống bộ điều khiển cổ điển với RL (GĐ5 + GĐ6), có số liệu.
- **"Bắt chước người"**: webcam → tư thế người → retarget toàn thân → policy tracking (GĐ6.6 + GĐ7.4).

✅ Báo cáo cuối: mục tiêu, phương pháp, số liệu, giới hạn, video demo. Trang web có tab trình diễn.

---

## Tài liệu chính (theo thứ tự dùng)

| Tài liệu | Dùng ở |
|---|---|
| 3Blue1Brown, *Essence of Linear Algebra* | GĐ0 |
| Lynch & Park, *Modern Robotics* (miễn phí, có khoá Coursera) | GĐ0, GĐ2, GĐ3 |
| Web `g1-explorer` + `status.md` + `research/*.pdf` | GĐ1 |
| Tài liệu Pinocchio, MuJoCo | GĐ2, GĐ3 |
| `unitree_src/unitree_sdk2(_python)`, `unitree_mujoco`, `unitree_ros2`, docs ROS 2 Humble | GĐ4 |
| Kajita, *Introduction to Humanoid Robotics*; Tedrake, *Underactuated Robotics* | GĐ5 |
| *Spinning Up*; Rudin et al. 2021; `unitree_rl_gym`, `unitree_rl_lab` | GĐ6 |
| `xr_teleoperate`, LeRobot | GĐ7 |
| Livox MID-360 manual, FAST-LIO2, Intel RealSense docs | GĐ8 |

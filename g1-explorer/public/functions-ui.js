// Phase 2 UI: the "Chức năng" tab (catalogue from functions.js) and the floating control dock that
// drives the 3D robot from one of
//   - the MuJoCo simulation (backend/sim_server.py, ws://127.0.0.1:18765) running Unitree's
//     pre-trained walking policy - real physics, legs only (the 12-DoF policy; arms stay in pose)
//   - a real G1 through backend/robot_bridge.py (unitree_sdk2_python) - the page shows the robot's
//     measured joint angles + IMU attitude and sends LocoClient / ArmAction / Audio commands
//   - Unitree's motion-reference CSVs (unitree_rl_lab mimic tasks) - kinematic replay, 29 joints
// app.js passes the hooks it needs (setDrive / setDriveData / setPose / setLed / setXray).
import { FN_GROUPS, FN_SRC } from '/functions.js';

const SIM_URL = 'ws://127.0.0.1:18765';
const ROBOT_URL_DEFAULT = 'ws://127.0.0.1:18766';
const KEY_SPEED = { vx: 0.6, vy: 0.4, yaw: 0.8 };
const ARM_ACTIONS = [[11, 'two-hand kiss'], [12, 'kiss (1 tay)'], [15, 'hands up'], [17, 'clap'], [18, 'high five'], [19, 'hug'],
  [20, 'heart'], [21, 'right heart'], [22, 'reject'], [23, 'right hand up'], [24, 'x-ray'], [25, 'face wave'], [26, 'high wave'],
  [27, 'shake hand'], [99, 'thả tay (release)']];

export function initFunctions(api) {
  const { h } = api;
  let ws = null;
  let target = null;                     // 'sim' | 'robot' | null
  let status = 'off';                    // off | connecting | on | error
  let state = null;                      // last state message
  let enabled = false;                   // robot: movement enable sent
  let motion = null;                     // {name, frames, i, playing, t0}
  let robotUrl = ROBOT_URL_DEFAULT;
  try { robotUrl = localStorage.getItem('g1.robotUrl') || ROBOT_URL_DEFAULT; } catch { /* storage blocked */ }
  const keys = new Set();
  let sliderCmd = { vx: 0, vy: 0, yaw: 0 };
  let cmdTimer = null;

  // ------------------------------------------------------------------ dock (floating controls)
  const dock = h('div', { class: 'fn-dock', hidden: true });
  document.body.append(dock);

  function renderDock() {
    dock.hidden = status !== 'on' && !motion;
    dock.replaceChildren();
    if (status === 'on') {
      const isSim = target === 'sim';
      dock.append(h('div', { class: 'fn-dock-head' },
        h('b', {}, isSim ? 'Mô phỏng MuJoCo' : 'ROBOT THẬT'), h('span', { class: 'faint' }, isSim ? ' · policy đi bộ Unitree' : ` · ${robotUrl}`),
        h('button', { class: 'btn small', type: 'button', style: 'margin-left:auto', onclick: disconnect }, 'Ngắt')));
      if (isSim) {
        dock.append(h('div', { class: 'fn-modes' }, ...[['walk', 'Start (policy)'], ['stand', 'Giữ đứng (PD)'], ['damp', 'Damp'], ['zero', 'Zero torque']].map(([m, t]) =>
          h('button', { class: 'btn small', type: 'button', 'data-mode': m, onclick: () => send({ type: 'mode', mode: m }) }, t)),
        h('button', { class: 'btn small', type: 'button', onclick: () => send({ type: 'reset' }) }, '↺ Đặt lại')));
      } else {
        dock.append(
          h('div', { class: 'caveat', style: 'margin:4px 0' }, 'Robot thật: treo trên giá khi thử lần đầu, tay cầm điều khiển luôn sẵn để damp.'),
          h('div', { class: 'fn-modes' },
            h('button', { class: `btn small${enabled ? ' primary' : ''}`, type: 'button', onclick: () => { enabled = !enabled; send({ type: 'enable', on: enabled }); renderDock(); } },
              enabled ? '✔ Đang cho phép điều khiển' : 'Bật cho phép điều khiển'),
            h('button', { class: 'btn small', type: 'button', style: 'border-color:#f85149;color:#ff9b95', onclick: () => { if (confirm('Damp: robot sẽ mềm và khuỵu xuống. Gửi?')) send({ type: 'fsm', id: 1 }); } }, 'DAMP')));
      }
      dock.append(
        ...['vx', 'vy', 'yaw'].map((k) => {
          const lim = { vx: [-0.6, 1.0], vy: [-0.5, 0.5], yaw: [-1, 1] }[k];
          const label = { vx: 'Tiến / lùi (m/s)', vy: 'Ngang (m/s)', yaw: 'Quay (rad/s)' }[k];
          return h('label', { class: 'row' }, label,
            h('input', { type: 'range', min: lim[0], max: lim[1], step: 0.05, value: sliderCmd[k], oninput: (e) => { sliderCmd[k] = Number(e.target.value); pushCmd(); } }),
            h('output', { 'data-out': k }, sliderCmd[k].toFixed(2)));
        }),
        h('p', { class: 'faint', style: 'margin:4px 0' }, 'Phím: W/S tiến-lùi · A/D ngang · Q/E quay · Space dừng'),
        h('dl', { class: 'hud', 'data-hud': '' }),
        h('div', { class: 'fn-tau', 'data-tau': '' }),
      );
    }
    if (motion) {
      dock.append(h('div', { class: 'fn-dock-head', style: status === 'on' ? 'margin-top:10px' : '' },
        h('b', {}, `Phát chuyển động: ${motion.name}`),
        h('button', { class: 'btn small', type: 'button', style: 'margin-left:auto', onclick: () => { motion.playing = !motion.playing; motion.t0 = performance.now() - (motion.i / 60) * 1000; renderDock(); } }, motion.playing ? '⏸' : '▶'),
        h('button', { class: 'btn small', type: 'button', onclick: stopMotion }, '■')),
      h('div', { class: 'bar' }, h('i', { 'data-prog': '' })),
      h('p', { class: 'faint', style: 'margin:4px 0' }, 'Dữ liệu tham chiếu 60 Hz của unitree_rl_lab (29 khớp + thân) - phát lại động học, không mô phỏng lực.'));
    }
  }

  function updateDockLive() {
    const hud = dock.querySelector('[data-hud]');
    if (state && hud && target === 'sim') {
      const v = state.base_vel;
      hud.innerHTML = `<dt>Thời gian</dt><dd>${state.t.toFixed(1)} s</dd>
        <dt>Chế độ</dt><dd>${state.mode}${state.fallen ? ' · <b style="color:#f85149">ĐÃ NGÃ</b>' : ''}</dd>
        <dt>Lệnh</dt><dd>${state.cmd.map((x) => x.toFixed(2)).join(' / ')}</dd>
        <dt>Tốc độ thật</dt><dd>${Math.hypot(v[0], v[1]).toFixed(2)} m/s</dd>
        <dt>Cao pelvis</dt><dd>${state.base_pos[2].toFixed(3)} m</dd>`;
      const tauEl = dock.querySelector('[data-tau]');
      tauEl.innerHTML = Object.entries(state.tau).map(([n, t]) => {
        const short = n.replace('_joint', '').replace('left_', 'T ').replace('right_', 'P ').replace('_', ' ');
        const lim = /knee|hip_roll/.test(n) ? 139 : /hip/.test(n) ? 88 : 35;
        return `<div class="fn-tau-row"><span>${short}</span><div class="bar"><i style="width:${Math.min(100, (Math.abs(t) / lim) * 100)}%;background:${Math.abs(t) > lim * 0.8 ? '#f85149' : '#4fa3ff'}"></i></div><b>${t.toFixed(0)}</b></div>`;
      }).join('');
      for (const b of dock.querySelectorAll('[data-mode]')) b.classList.toggle('primary', b.dataset.mode === state.mode);
    } else if (state && hud && target === 'robot') {
      const r = state.imu_rpy || [0, 0, 0];
      hud.innerHTML = `<dt>mode_machine</dt><dd>${state.mode_machine ?? '-'}</dd>
        <dt>IMU r/p/y</dt><dd>${r.map((x) => `${(x * 57.3).toFixed(1)}°`).join(' / ')}</dd>
        <dt>Cho phép</dt><dd>${state.enabled ? 'có' : 'không'}</dd>
        ${state.last_error ? `<dt>Lỗi</dt><dd style="color:#ff9b95">${state.last_error}</dd>` : ''}`;
      const tauEl = dock.querySelector('[data-tau]');
      if (state.temps) {
        tauEl.innerHTML = Object.entries(state.temps).slice(0, 15).map(([n, t]) => `<div class="fn-tau-row"><span>${n.replace('_joint', '').replace('left_', 'T ').replace('right_', 'P ')}</span><div class="bar"><i style="width:${Math.min(100, (t[0] / 90) * 100)}%;background:${t[0] > 70 ? '#f85149' : '#3fb950'}"></i></div><b>${t[0]}°</b></div>`).join('');
      }
    }
    if (motion) {
      const p = dock.querySelector('[data-prog]');
      if (p) p.style.width = `${(motion.i / motion.frames.length) * 100}%`;
    }
  }

  // ------------------------------------------------------------------ link (sim or robot)
  function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
  function currentCmd() {
    return {
      vx: sliderCmd.vx + (keys.has('w') ? KEY_SPEED.vx : 0) - (keys.has('s') ? KEY_SPEED.vx : 0),
      vy: sliderCmd.vy + (keys.has('a') ? KEY_SPEED.vy : 0) - (keys.has('d') ? KEY_SPEED.vy : 0),
      yaw: sliderCmd.yaw + (keys.has('q') ? KEY_SPEED.yaw : 0) - (keys.has('e') ? KEY_SPEED.yaw : 0),
    };
  }
  function pushCmd() {
    send({ type: 'cmd', ...currentCmd() });
    for (const k of ['vx', 'vy', 'yaw']) {
      const o = dock.querySelector(`[data-out="${k}"]`);
      if (o) o.textContent = sliderCmd[k].toFixed(2);
    }
  }
  function connect(which, then) {
    if (target === which && ws && ws.readyState <= 1) {
      if (ws.readyState === 1) then?.(); else ws.addEventListener('open', () => then?.(), { once: true });
      return;
    }
    disconnect(true);
    stopMotion();
    target = which;
    status = 'connecting';
    enabled = false;
    api.rerender();
    ws = new WebSocket(which === 'sim' ? SIM_URL : robotUrl);
    ws.addEventListener('open', () => {
      status = 'on';
      renderDock();
      api.rerender();
      // the robot bridge stops after 0.5 s without a command: keep sending while connected
      if (which === 'robot') cmdTimer = setInterval(pushCmd, 100);
      else send({ type: 'reset' });          // fresh standing robot at the origin
      then?.();
    });
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === 'state') {
        state = m;
        api.setDriveData({ base: { pos: m.base_pos, quat: m.base_quat }, q: m.q });
      } else if (m.type === 'robot_state') {
        state = m;
        if (m.q) api.setDriveData({ base: { pos: [0, 0, 0.78], quat: m.imu_quat || [1, 0, 0, 0] }, q: m.q });
      } else return;
      updateDockLive();
    });
    ws.addEventListener('close', () => {
      if (status !== 'off') status = 'error';
      clearInterval(cmdTimer);
      ws = null;
      state = null;
      api.setDrive(null);
      renderDock();
      api.rerender();
    });
  }
  function disconnect(silent = false) {
    clearInterval(cmdTimer);
    status = 'off';
    if (ws) { send({ type: 'cmd', vx: 0, vy: 0, yaw: 0 }); ws.close(); }
    ws = null;
    state = null;
    target = null;
    api.setDrive(null);
    if (!silent) { renderDock(); api.rerender(); }
  }

  window.addEventListener('keydown', (e) => {
    if (status !== 'on' || e.target.closest?.('input,select,textarea')) return;
    const k = e.key.toLowerCase();
    if (k.length === 1 && 'wsadqe'.includes(k)) { keys.add(k); pushCmd(); }
    if (e.key === ' ') { keys.clear(); sliderCmd = { vx: 0, vy: 0, yaw: 0 }; renderDock(); pushCmd(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { if (keys.delete(e.key.toLowerCase())) pushCmd(); });

  // ------------------------------------------------------------------ motion replay (unitree_rl_lab CSV)
  async function playMotion(name) {
    if (status === 'on') disconnect();
    const txt = await (await fetch(`/data/motions/${name}.csv`)).text();
    const frames = txt.trim().split(/\r?\n/).map((l) => l.split(',').map(Number));
    motion = { name, frames, i: 0, playing: true, t0: performance.now() };
    renderDock();
    api.rerender();
    requestAnimationFrame(tickMotion);
  }
  function tickMotion(now) {
    if (!motion) return;
    if (motion.playing) {
      motion.i = Math.floor(((now - motion.t0) / 1000) * 60) % motion.frames.length;
      const f = motion.frames[motion.i];
      const q = {};
      api.sdkOrder.forEach((n, k) => { q[n] = f[7 + k]; });
      // CSV quaternion is x, y, z, w; the drive wants w, x, y, z
      api.setDriveData({ base: { pos: [f[0], f[1], f[2]], quat: [f[6], f[3], f[4], f[5]] }, q });
      updateDockLive();
    }
    requestAnimationFrame(tickMotion);
  }
  function stopMotion() {
    if (!motion) return;
    motion = null;
    api.setDrive(null);
    renderDock();
    api.rerender();
  }

  // ------------------------------------------------------------------ demos (sim / motion / pose) and real commands
  function runDemo(demo) {
    const [kind, arg, extra] = demo.split(':');
    if (kind === 'sim') {
      connect('sim', () => {
        if (arg === 'walk') {
          if (state?.fallen) send({ type: 'reset' });
          send({ type: 'mode', mode: 'walk' });
          if (extra) {
            const [vx, vy, yaw] = extra.split(',').map(Number);
            sliderCmd = { vx, vy, yaw };
            renderDock();
            pushCmd();
          }
        } else send({ type: 'mode', mode: arg });
      });
    } else if (kind === 'motion') playMotion(arg);
    else if (kind === 'pose') { disconnect(); stopMotion(); api.setPose(arg); }
    else if (kind === 'say') {
      const u = new SpeechSynthesisUtterance('Hello. I am a robot from Unitree Robotics.');
      u.lang = 'en-US';
      window.speechSynthesis?.speak(u);
    }
  }

  function demoControls(item) {
    const out = [];
    if (item.demo === 'led') {
      out.push(h('label', { class: 'chip', style: 'cursor:pointer' }, 'Màu LED: ',
        h('input', { type: 'color', value: '#ff7b72', oninput: (e) => {
          const hex = parseInt(e.target.value.slice(1), 16);
          api.setXray(true);
          api.setLed(hex);
          if (target === 'robot') send({ type: 'led', r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 });
        } })));
    } else if (item.demo) {
      const label = item.demo.startsWith('sim') ? '▶ Mô phỏng'
        : item.demo.startsWith('motion') ? '▶ Phát dữ liệu'
          : item.demo.startsWith('pose') ? '▶ Dáng minh hoạ'
            : item.demo === 'say' ? '🔊 Nghe thử' : '▶';
      out.push(h('button', { class: 'btn small', type: 'button', onclick: () => runDemo(item.demo) }, label));
    }
    if (target === 'robot' && status === 'on' && item.real) {
      if (Array.isArray(item.real)) {
        for (const r of item.real) {
          out.push(h('button', { class: 'btn small primary', type: 'button', onclick: () => {
            if (!enabled) { alert('Bật "cho phép điều khiển" ở bảng bên trái trước.'); return; }
            if (r.danger && !confirm(`${r.label}: robot có thể mềm / ngã. Robot đang được treo hoặc có người đỡ?`)) return;
            send(r.msg);
          } }, `🤖 ${r.label}`));
        }
      } else if (item.real === 'arm_select') {
        const sel = h('select', {}, ...ARM_ACTIONS.map(([id, n]) => h('option', { value: id }, `${id} · ${n}`)));
        out.push(sel, h('button', { class: 'btn small primary', type: 'button', onclick: () => send({ type: 'arm_action', id: Number(sel.value) }) }, '🤖 Thực hiện'));
      } else if (item.real === 'tts_input') {
        const inp = h('input', { type: 'text', value: 'Hello, I am G1.', style: 'width:150px' });
        const sp = h('select', {}, h('option', { value: 1 }, 'English (1)'), h('option', { value: 0 }, '中文 (0)'));
        out.push(inp, sp, h('button', { class: 'btn small primary', type: 'button', onclick: () => send({ type: 'tts', text: inp.value, speaker: Number(sp.value) }) }, '🤖 Nói'));
      } else if (item.real === 'volume_input') {
        out.push(h('input', { type: 'range', min: 0, max: 100, value: 50, onchange: (e) => send({ type: 'volume', value: Number(e.target.value) }) }));
      }
    }
    if (!out.length) out.push(h('span', { class: 'chip', title: 'Cần robot thật - xem API và nguồn' }, 'cần robot thật'));
    return h('span', { class: 'fn-ctrls' }, ...out);
  }

  // ------------------------------------------------------------------ the tab
  function render(body) {
    const label = { off: 'chưa kết nối', connecting: 'đang kết nối…', on: 'đang chạy', error: 'không kết nối được' };
    const urlInput = h('input', { type: 'text', value: robotUrl, style: 'width:190px', onchange: (e) => {
      robotUrl = e.target.value.trim();
      try { localStorage.setItem('g1.robotUrl', robotUrl); } catch { /* storage blocked */ }
    } });
    body.append(
      h('h2', {}, 'Chức năng của G1'),
      h('p', { class: 'muted' }, 'Danh mục rút từ source code Unitree đã tải về (../unitree_src): mỗi chức năng có API thật, cơ chế, '
        + 'giới hạn và file nguồn. Không có robot vẫn chạy được: mô phỏng MuJoCo với policy đi bộ của Unitree và dữ liệu nhảy của Unitree.'),
      h('div', { class: 'piece' },
        h('b', {}, 'Mô phỏng MuJoCo '), h('span', { class: `fn-status fn-${target === 'sim' ? status : 'off'}` }, target === 'sim' ? label[status] : label.off),
        h('p', { class: 'muted', style: 'margin:6px 0' }, 'Chạy trước: ', h('code', {}, 'start_sim.bat'), '. Policy unitree_rl_gym motion.pt - 12 khớp chân, 50 Hz; vật lý 500 Hz.'),
        target === 'sim' && status === 'on'
          ? h('button', { class: 'btn small', type: 'button', onclick: () => disconnect() }, 'Ngắt')
          : h('button', { class: 'btn small primary', type: 'button', onclick: () => connect('sim', () => send({ type: 'mode', mode: 'walk' })) }, 'Kết nối mô phỏng')),
      h('div', { class: 'piece', style: 'background:#2a1515;border-color:#5c2626' },
        h('b', { style: 'color:#ff9b95' }, 'Robot thật '), h('span', { class: `fn-status fn-${target === 'robot' ? status : 'off'}` }, target === 'robot' ? label[status] : label.off),
        h('p', { class: 'muted', style: 'margin:6px 0' }, 'Chạy backend/robot_bridge.py --iface <card mạng> trên máy nối mạng 192.168.123.x của robot. '
          + 'Bridge CHƯA được thử trên robot thật. Vận tốc bị giới hạn, tự dừng nếu mất lệnh 0.5 s.'),
        h('div', { class: 'fn-ctrls' }, urlInput,
          target === 'robot' && status === 'on'
            ? h('button', { class: 'btn small', type: 'button', onclick: () => disconnect() }, 'Ngắt')
            : h('button', { class: 'btn small', type: 'button', onclick: () => connect('robot') }, 'Kết nối robot'))),
    );
    for (const g of FN_GROUPS) {
      body.append(h('details', { class: 'fn-group', open: g.id === 'state' || g.id === 'move' ? true : null },
        h('summary', {}, g.title),
        h('p', { class: 'muted' }, g.intro),
        ...g.items.map((it) => h('div', { class: 'fn-item' },
          h('div', { class: 'fn-item-head' }, h('b', {}, it.title), demoControls(it)),
          h('code', { class: 'fn-api' }, it.api),
          it.how ? h('p', {}, it.how) : null,
          h('div', { class: 'sources' }, 'Nguồn: ', h('code', {}, FN_SRC[it.src] || it.src))))));
    }
  }

  return { render };
}

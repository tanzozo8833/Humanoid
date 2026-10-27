"""G1 locomotion in MuJoCo with Unitree's own pre-trained walking policy.

A faithful port of unitree_rl_gym/deploy/deploy_mujoco/deploy_mujoco.py (config g1.yaml), turned into
a steppable class (plus: the LSTM memory of the policy is cleared on reset) so a server can drive it and stream the state:

  physics 500 Hz (dt 0.002) -> every 10 steps (50 Hz) the policy reads a 47-number observation
  [ang vel*0.25, projected gravity, cmd*(2,2,0.25), 12 joint pos - default, 12 joint vel*0.05,
   last 12 actions, sin/cos of a 0.8 s gait phase] and outputs 12 actions; target joint angle =
  default + 0.25*action; a PD loop (kp/kd per joint from the config) turns it into torques.

Extra modes (not in Unitree's script, built from the same PD law the SDK exposes per motor):
  "walk"  - the RL policy above (velocity command vx, vy, yaw rate)
  "stand" - PD to the default standing angles, no policy (the robot balances only passively)
  "damp"  - kp = 0, kd only: what LocoClient.Damp() does - joints go soft, the robot sinks/falls
  "zero"  - zero torque: what LocoClient.ZeroTorque() does - the robot collapses

Paths default to the unitree_rl_gym checkout next to this project (../../unitree_src/unitree_rl_gym).
"""
import os

import mujoco
import numpy as np
import torch
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
RL_GYM = os.environ.get("UNITREE_RL_GYM", os.path.normpath(os.path.join(HERE, "..", "..", "unitree_src", "unitree_rl_gym")))
CONFIG = os.path.join(RL_GYM, "deploy", "deploy_mujoco", "configs", "g1.yaml")

JOINTS = [
    "left_hip_pitch_joint", "left_hip_roll_joint", "left_hip_yaw_joint", "left_knee_joint",
    "left_ankle_pitch_joint", "left_ankle_roll_joint",
    "right_hip_pitch_joint", "right_hip_roll_joint", "right_hip_yaw_joint", "right_knee_joint",
    "right_ankle_pitch_joint", "right_ankle_roll_joint",
]
CMD_LIMITS = {"vx": (-0.6, 1.0), "vy": (-0.5, 0.5), "yaw": (-1.0, 1.0)}   # what the policy was shown to handle


def gravity_orientation(q):
    qw, qx, qy, qz = q
    return np.array([2 * (-qz * qx + qw * qy), -2 * (qz * qy + qw * qx), 1 - 2 * (qw * qw + qz * qz)])


class G1Sim:
    def __init__(self):
        with open(CONFIG, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        sub = lambda p: p.replace("{LEGGED_GYM_ROOT_DIR}", RL_GYM)
        self.cfg = cfg
        self.model = mujoco.MjModel.from_xml_path(sub(cfg["xml_path"]))
        self.model.opt.timestep = cfg["simulation_dt"]
        self.data = mujoco.MjData(self.model)
        self.policy = torch.jit.load(sub(cfg["policy_path"]))
        self.kps = np.array(cfg["kps"], dtype=np.float32)
        self.kds = np.array(cfg["kds"], dtype=np.float32)
        self.default = np.array(cfg["default_angles"], dtype=np.float32)
        self.decimation = cfg["control_decimation"]
        self.n = cfg["num_actions"]
        self.cmd = np.zeros(3, dtype=np.float32)
        self.mode = "walk"
        self.reset()

    # ------------------------------------------------------------------ control
    def reset(self):
        # motion.pt is an LSTM policy (ActorCriticRecurrent in g1_config.py): its hidden/cell state
        # buffers carry memory between calls and must be cleared, or a robot that just fell keeps
        # "remembering" the fall and falls again right after the reset.
        with torch.no_grad():
            for name, buf in self.policy.named_buffers():
                if name in ("hidden_state", "cell_state"):
                    buf.zero_()
        mujoco.mj_resetData(self.model, self.data)
        self.data.qpos[7:] = self.default
        mujoco.mj_forward(self.model, self.data)
        self.action = np.zeros(self.n, dtype=np.float32)
        self.target = self.default.copy()
        self.obs = np.zeros(self.cfg["num_obs"], dtype=np.float32)
        self.counter = 0
        self.last_tau = np.zeros(self.n)

    def set_cmd(self, vx=0.0, vy=0.0, yaw=0.0):
        clip = lambda v, k: float(np.clip(v, *CMD_LIMITS[k]))
        self.cmd[:] = (clip(vx, "vx"), clip(vy, "vy"), clip(yaw, "yaw"))

    def set_mode(self, mode):
        if mode in ("walk", "stand", "damp", "zero"):
            self.mode = mode

    def _policy_step(self):
        c = self.cfg
        d = self.data
        qj = (d.qpos[7:] - self.default) * c["dof_pos_scale"]
        dqj = d.qvel[6:] * c["dof_vel_scale"]
        omega = d.qvel[3:6] * c["ang_vel_scale"]
        phase = (self.counter * c["simulation_dt"]) % 0.8 / 0.8
        o = self.obs
        o[:3] = omega
        o[3:6] = gravity_orientation(d.qpos[3:7])
        o[6:9] = self.cmd * np.array(c["cmd_scale"], dtype=np.float32)
        o[9:9 + self.n] = qj
        o[9 + self.n:9 + 2 * self.n] = dqj
        o[9 + 2 * self.n:9 + 3 * self.n] = self.action
        o[9 + 3 * self.n:9 + 3 * self.n + 2] = (np.sin(2 * np.pi * phase), np.cos(2 * np.pi * phase))
        with torch.no_grad():
            self.action = self.policy(torch.from_numpy(o).unsqueeze(0)).numpy().squeeze()
        self.target = self.action * c["action_scale"] + self.default

    def step(self, n_steps=1):
        d = self.data
        for _ in range(n_steps):
            q, dq = d.qpos[7:], d.qvel[6:]
            if self.mode == "walk":
                tau = (self.target - q) * self.kps - dq * self.kds
            elif self.mode == "stand":
                tau = (self.default - q) * self.kps - dq * self.kds
            elif self.mode == "damp":
                tau = -dq * self.kds * 4
            else:
                tau = np.zeros(self.n)
            d.ctrl[:] = tau
            self.last_tau = tau
            mujoco.mj_step(self.model, d)
            self.counter += 1
            if self.mode == "walk" and self.counter % self.decimation == 0:
                self._policy_step()

    # ------------------------------------------------------------------ state for the web page
    def state(self):
        d = self.data
        return {
            "t": round(d.time, 3),
            "mode": self.mode,
            "cmd": [round(float(v), 3) for v in self.cmd],
            "base_pos": [round(float(v), 4) for v in d.qpos[0:3]],
            "base_quat": [round(float(v), 5) for v in d.qpos[3:7]],      # w, x, y, z
            "q": {j: round(float(v), 4) for j, v in zip(JOINTS, d.qpos[7:])},
            "tau": {j: round(float(v), 2) for j, v in zip(JOINTS, self.last_tau)},
            "base_vel": [round(float(v), 3) for v in d.qvel[0:3]],
            "fallen": bool(d.qpos[2] < 0.45),
        }


if __name__ == "__main__":
    # headless self-test: walk forward 5 s, report distance and height
    sim = G1Sim()
    sim.set_cmd(0.5, 0.0, 0.0)
    for _ in range(250):                      # 250 x 10 steps x 2 ms = 5 s
        sim.step(10)
    s = sim.state()
    print("t", s["t"], "pos", s["base_pos"], "fallen", s["fallen"])
    sim.set_mode("damp")
    for _ in range(150):
        sim.step(10)
    print("after damp 3 s: height", sim.state()["base_pos"][2])

"""WebSocket bridge between the G1 Explorer page and a REAL Unitree G1, through unitree_sdk2_python.

!! Not run against a robot yet - written from the SDK sources and examples (unitree_sdk2_python
   example/g1/high_level/*.py). Test with the robot hanging on its gantry first. !!

Run it on a machine on the robot network (PC2 / Jetson, or a Linux laptop with a static IP
192.168.123.x on the cable plugged into the neck panel):

  pip install -e unitree_sdk2_python          # needs cyclonedds 0.10.2 (Linux; see the SDK README)
  python backend/robot_bridge.py --iface eth0 [--host 127.0.0.1] [--port 18766] [--max-vx 0.5]

What the page can ask (JSON over ws, same style as sim_server.py):
  {"type":"enable", "on":true|false}              movement is refused until enabled
  {"type":"fsm", "id":0|1|2|3|4|500|702|706}      LocoClient.SetFsmId (zero torque, damp, squat, sit,
                                                  stand up, start, lie->stand, squat<->stand)
  {"type":"cmd", "vx":..,"vy":..,"yaw":..}        LocoClient.Move, clamped; must be re-sent < 0.5 s
  {"type":"height", "high":true|false}            HighStand / LowStand
  {"type":"balance", "mode":0|1}                  BalanceStand / ContinuousGait
  {"type":"task", "name":"wave"|"wave_turn"|"shake"}
  {"type":"arm_action", "id":11..27|99}           G1ArmActionClient.ExecuteAction
  {"type":"tts", "text":"...", "speaker":0|1}     AudioClient.TtsMaker
  {"type":"led", "r":..,"g":..,"b":..}            AudioClient.LedControl
  {"type":"volume", "value":0..100}               AudioClient.SetVolume
State sent back ~20 Hz: {"type":"robot_state", "q": {joint: rad}, "imu_rpy": [...], "imu_quat": [w,x,y,z],
  "temps": {joint: [t0, t1]}, "mode_machine": n, "enabled": bool, "last_error": str}

Safety built in: velocity clamped (--max-vx / --max-vy / --max-yaw); a watchdog sends StopMove if no
"cmd" arrives for 0.5 s; StopMove when the page disconnects; movement and FSM changes refused until
"enable". The robot's own controller still has the last word - keep the remote's damping key at hand.
"""
import argparse
import asyncio
import json
import threading
import time

import websockets

JOINTS = [
    "left_hip_pitch_joint", "left_hip_roll_joint", "left_hip_yaw_joint", "left_knee_joint",
    "left_ankle_pitch_joint", "left_ankle_roll_joint",
    "right_hip_pitch_joint", "right_hip_roll_joint", "right_hip_yaw_joint", "right_knee_joint",
    "right_ankle_pitch_joint", "right_ankle_roll_joint",
    "waist_yaw_joint", "waist_roll_joint", "waist_pitch_joint",
    "left_shoulder_pitch_joint", "left_shoulder_roll_joint", "left_shoulder_yaw_joint", "left_elbow_joint",
    "left_wrist_roll_joint", "left_wrist_pitch_joint", "left_wrist_yaw_joint",
    "right_shoulder_pitch_joint", "right_shoulder_roll_joint", "right_shoulder_yaw_joint", "right_elbow_joint",
    "right_wrist_roll_joint", "right_wrist_pitch_joint", "right_wrist_yaw_joint",
]
ALLOWED_FSM = {0, 1, 2, 3, 4, 500, 702, 706}
ARM_ACTIONS = {11, 12, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 99}


class Robot:
    def __init__(self, iface, limits):
        # imported here so the module can be read / its help printed without the SDK installed
        from unitree_sdk2py.core.channel import ChannelFactoryInitialize, ChannelSubscriber
        from unitree_sdk2py.g1.arm.g1_arm_action_client import G1ArmActionClient
        from unitree_sdk2py.g1.audio.g1_audio_client import AudioClient
        from unitree_sdk2py.g1.loco.g1_loco_client import LocoClient
        from unitree_sdk2py.idl.unitree_hg.msg.dds_ import LowState_

        ChannelFactoryInitialize(0, iface)
        self.loco = LocoClient()
        self.loco.SetTimeout(10.0)
        self.loco.Init()
        self.arm = G1ArmActionClient()
        self.arm.SetTimeout(10.0)
        self.arm.Init()
        self.audio = AudioClient()
        self.audio.SetTimeout(10.0)
        self.audio.Init()
        self.limits = limits
        self.lock = threading.Lock()
        self.low = None
        self.enabled = False
        self.last_cmd_at = 0.0
        self.moving = False
        self.last_error = ""
        self.sub = ChannelSubscriber("rt/lowstate", LowState_)
        self.sub.Init(self._on_low, 10)

    def _on_low(self, msg):
        with self.lock:
            self.low = msg

    def state(self):
        with self.lock:
            m = self.low
        out = {"type": "robot_state", "enabled": self.enabled, "last_error": self.last_error}
        if m is None:
            return out
        out["q"] = {j: round(float(m.motor_state[i].q), 4) for i, j in enumerate(JOINTS)}
        out["temps"] = {j: list(m.motor_state[i].temperature) for i, j in enumerate(JOINTS)}
        out["imu_rpy"] = [round(float(v), 4) for v in m.imu_state.rpy]
        out["imu_quat"] = [round(float(v), 5) for v in m.imu_state.quaternion]      # w, x, y, z
        out["mode_machine"] = int(m.mode_machine)
        return out

    def handle(self, m):
        t = m.get("type")
        if t == "enable":
            self.enabled = bool(m.get("on"))
            if not self.enabled:
                self.stop()
            return
        if t in ("fsm", "cmd", "height", "balance", "task", "arm_action") and not self.enabled:
            self.last_error = "chưa bật cho phép điều khiển (enable)"
            return
        if t == "fsm":
            fid = int(m.get("id"))
            if fid in ALLOWED_FSM:
                self.loco.SetFsmId(fid)
        elif t == "cmd":
            clamp = lambda v, k: max(-self.limits[k], min(self.limits[k], float(v)))
            vx, vy, yaw = clamp(m.get("vx", 0), "vx"), clamp(m.get("vy", 0), "vy"), clamp(m.get("yaw", 0), "yaw")
            self.loco.Move(vx, vy, yaw)
            self.last_cmd_at = time.time()
            self.moving = any(abs(v) > 1e-3 for v in (vx, vy, yaw))
        elif t == "height":
            (self.loco.HighStand if m.get("high") else self.loco.LowStand)()
        elif t == "balance":
            self.loco.BalanceStand(int(m.get("mode", 0)))
        elif t == "task":
            name = m.get("name")
            if name == "wave":
                self.loco.WaveHand(False)
            elif name == "wave_turn":
                self.loco.WaveHand(True)
            elif name == "shake":
                self.loco.ShakeHand()
        elif t == "arm_action":
            aid = int(m.get("id"))
            if aid in ARM_ACTIONS:
                code = self.arm.ExecuteAction(aid)
                self.last_error = "" if code == 0 else f"arm action lỗi {code} (chỉ chạy ở FSM 500/501/801)"
        elif t == "tts":
            self.audio.TtsMaker(str(m.get("text", ""))[:200], int(m.get("speaker", 1)))
        elif t == "led":
            self.audio.LedControl(*(max(0, min(255, int(m.get(k, 0)))) for k in ("r", "g", "b")))
        elif t == "volume":
            self.audio.SetVolume(max(0, min(100, int(m.get("value", 50)))))

    def stop(self):
        if self.moving:
            self.loco.StopMove()
            self.moving = False

    def watchdog(self):
        if self.moving and time.time() - self.last_cmd_at > 0.5:
            self.stop()


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--iface", required=True, help="network interface on the 192.168.123.x network, e.g. eth0")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=18766)
    ap.add_argument("--max-vx", type=float, default=0.5)
    ap.add_argument("--max-vy", type=float, default=0.3)
    ap.add_argument("--max-yaw", type=float, default=0.6)
    a = ap.parse_args()
    robot = Robot(a.iface, {"vx": a.max_vx, "vy": a.max_vy, "yaw": a.max_yaw})
    clients = set()

    async def handler(ws):
        clients.add(ws)
        try:
            async for raw in ws:
                try:
                    robot.handle(json.loads(raw))
                except Exception as e:          # keep the bridge alive, report to the page
                    robot.last_error = f"{type(e).__name__}: {e}"
        finally:
            clients.discard(ws)
            robot.stop()                        # never keep walking without a page watching

    async with websockets.serve(handler, a.host, a.port):
        print(f"G1 robot bridge on ws://{a.host}:{a.port} via {a.iface}")
        while True:
            robot.watchdog()
            if clients:
                websockets.broadcast(clients, json.dumps(robot.state()))
            await asyncio.sleep(0.05)


if __name__ == "__main__":
    asyncio.run(main())

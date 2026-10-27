"""WebSocket bridge between the G1 Explorer page and the MuJoCo simulation (sim_core.G1Sim).

  python backend/sim_server.py            -> ws://localhost:18765

Runs the physics in real time (500 Hz, stepped 10 at a time every 20 ms) and sends the state to every
connected page 30 times a second. Messages from the page (JSON):
  {"type": "cmd", "vx": .., "vy": .., "yaw": ..}   velocity command for the walking policy
  {"type": "mode", "mode": "walk"|"stand"|"damp"|"zero"}
  {"type": "reset"}
Messages to the page: {"type": "state", ...G1Sim.state()} and {"type": "hello", "joints": [...]}.
Only binds to localhost.
"""
import asyncio
import json
import time

import websockets

from sim_core import G1Sim, JOINTS, CMD_LIMITS

PORT = int(__import__("os").environ.get("G1_SIM_PORT", 18765))   # 8765 is often taken (VS Code)
CONTROL_DT = 0.02           # 10 physics steps of 2 ms
SEND_EVERY = 1 / 30

sim = G1Sim()
sim.set_cmd(0, 0, 0)
clients = set()


async def physics_loop():
    next_t = time.perf_counter()
    last_send = 0.0
    while True:
        sim.step(10)
        now = time.perf_counter()
        if clients and now - last_send >= SEND_EVERY:
            last_send = now
            msg = json.dumps({"type": "state", **sim.state()})
            websockets.broadcast(clients, msg)
        next_t += CONTROL_DT
        delay = next_t - time.perf_counter()
        if delay < -0.5:            # fell far behind (slow machine): resync instead of spiralling
            next_t = time.perf_counter()
        await asyncio.sleep(max(0.0, delay))


async def handler(ws):
    clients.add(ws)
    await ws.send(json.dumps({"type": "hello", "joints": JOINTS, "limits": CMD_LIMITS,
                              "policy": "unitree_rl_gym deploy/pre_train/g1/motion.pt"}))
    try:
        async for raw in ws:
            try:
                m = json.loads(raw)
            except ValueError:
                continue
            if m.get("type") == "cmd":
                sim.set_cmd(m.get("vx", 0), m.get("vy", 0), m.get("yaw", 0))
            elif m.get("type") == "mode":
                sim.set_mode(m.get("mode"))
            elif m.get("type") == "reset":
                sim.reset()
                sim.set_mode("walk")
                sim.set_cmd(0, 0, 0)
    finally:
        clients.discard(ws)


async def main():
    async with websockets.serve(handler, "127.0.0.1", PORT):
        print(f"G1 sim: ws://127.0.0.1:{PORT}  (policy: Unitree motion.pt, MuJoCo {__import__('mujoco').__version__})")
        await physics_loop()


if __name__ == "__main__":
    asyncio.run(main())

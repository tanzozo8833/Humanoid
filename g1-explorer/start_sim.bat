@echo off
rem MuJoCo simulation of the G1 with Unitree's pre-trained walking policy (unitree_rl_gym motion.pt).
rem Needs the Python env with mujoco + torch + websockets + pyyaml (default: %USERPROFILE%\.venvs\g1sim).
cd /d "%~dp0backend"
set PY=%USERPROFILE%\.venvs\g1sim\Scripts\python.exe
if not exist "%PY%" set PY=python
"%PY%" sim_server.py

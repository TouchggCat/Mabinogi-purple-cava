@echo off
cd /d %~dp0
echo Purple Cava: http://127.0.0.1:8000  (close this window to stop)
.venv\Scripts\python -m backend
pause

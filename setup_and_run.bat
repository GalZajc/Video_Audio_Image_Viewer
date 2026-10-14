@echo off
chcp 65001 >nul
cd /d "%~dp0"
set NODE_USE_SYSTEM_CA=1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fetch-ffmpeg.ps1"
if errorlevel 1 goto fail
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto fail
node node_modules\electron\install.js
if errorlevel 1 goto fail
call npm.cmd run build
if errorlevel 1 goto fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-shortcut.ps1"
if errorlevel 1 goto fail
start "" wscript.exe "%~dp0Video Audio Image Viewer.vbs"
exit /b 0
:fail
echo Namestitev ni uspela. Preveri zapis napake zgoraj.
pause

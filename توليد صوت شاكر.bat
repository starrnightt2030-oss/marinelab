@echo off
chcp 65001 >nul
title MarineLab 3D - Shakir voice
cd /d "%~dp0"
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo Python is not installed. Install it from https://www.python.org/downloads/ then run this file again.
  pause
  exit /b 1
)
echo Installing edge-tts ...
%PY% -m pip install --user --upgrade edge-tts
echo Generating Shakir voice clips ...
%PY% "%~dp0tools\make_voice.py"
echo.
echo Done. Voice files saved in assets\voice
pause

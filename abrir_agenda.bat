@echo off
title Agenda Personal
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0servidor.ps1"
timeout /t 2 >nul
start "" "http://localhost:8787/"

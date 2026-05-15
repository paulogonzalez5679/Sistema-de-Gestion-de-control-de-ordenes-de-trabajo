@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Verificar instalacion - AutoDetail

echo.
echo  === Verificacion de instalacion ===
echo  Carpeta: %CD%
echo.

if exist "BUILD-INFO.txt" (
  echo  --- Informacion del paquete ---
  type BUILD-INFO.txt
  echo.
)

echo  --- Node.js ---
where node >nul 2>&1
if errorlevel 1 (
  echo  [FALLO] Node.js no encontrado. Instale desde https://nodejs.org
) else (
  for /f "delims=" %%v in ('node -v') do echo  [OK] Node %%v
)

echo.
echo  --- Archivos necesarios ---
if exist "server.js" (echo  [OK] server.js) else (echo  [FALLO] Falta server.js)
if exist "launch-server.mjs" (echo  [OK] launch-server.mjs) else (echo  [FALLO] Falta launch-server.mjs)
if exist ".next\static" (echo  [OK] .next\static) else (echo  [FALLO] Falta .next\static)
if exist ".env" (echo  [OK] .env) else (echo  [FALLO] Cree .env desde .env.example)

echo.
echo  --- Prueba rapida del servidor (5 segundos) ---
if not exist ".env" (
  echo  Omitida: falta .env
  goto :fin
)

set HOSTNAME=127.0.0.1
set PORT=3099
start /B node launch-server.mjs > test-server.log 2>&1
timeout /t 5 /nobreak >nul
taskkill /F /IM node.exe >nul 2>&1

if exist test-server.log (
  echo  --- Salida del servidor ---
  type test-server.log
  del test-server.log
)

:fin
echo.
echo  Si hay FALLO en BUILD-INFO (INCOMPATIBLE_CON_WINDOWS), debe regenerar
echo  el paquete EN WINDOWS, no copiar el generado en Mac.
echo.
pause
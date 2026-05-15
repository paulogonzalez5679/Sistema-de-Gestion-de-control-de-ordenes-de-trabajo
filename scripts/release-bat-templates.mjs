/** Plantillas .bat incluidas en el paquete Windows (UTF-8). */

export const iniciarServidorBat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AutoDetail SaaS Pro

echo.
echo  AutoDetail SaaS Pro
echo  ===================
echo.

if exist "BUILD-INFO.txt" (
  findstr /C:"INCOMPATIBLE_CON_WINDOWS=si" BUILD-INFO.txt >nul 2>&1
  if not errorlevel 1 (
    echo  ERROR: Este paquete se compilo en Mac/Linux y NO sirve en Windows.
    echo.
    type BUILD-INFO.txt
    echo.
    echo  Solucion: genere el paquete en un PC Windows con "npm run package:win"
    echo  o descargue el ZIP generado por GitHub Actions (build Windows).
    echo.
    pause
    exit /b 1
  )
)

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js no esta instalado o no esta en el PATH.
  echo  Instale Node.js LTS 20.x o 22.x desde https://nodejs.org
  echo  Marque "Add to PATH" al instalar y reinicie el PC.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo  ERROR: Falta el archivo .env en esta carpeta.
  echo.
  echo  1. Copie .env.example y renombre la copia a .env
  echo  2. Edite .env con las claves de Supabase
  echo  3. Vuelva a ejecutar este archivo
  echo.
  pause
  exit /b 1
)

set HOSTNAME=0.0.0.0
set PORT=3000

echo  Iniciando servidor...
echo.

node launch-server.mjs
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% NEQ 0 (
  echo  El servidor termino con error (codigo %EXIT_CODE%^).
  echo  Ejecute Verificar-Instalacion.bat para mas ayuda.
) else (
  echo  Servidor detenido.
)
pause
exit /b %EXIT_CODE%
`;

export const verificarInstalacionBat = `@echo off
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
if exist ".next\\static" (echo  [OK] .next\\static) else (echo  [FALLO] Falta .next\\static)
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
`;

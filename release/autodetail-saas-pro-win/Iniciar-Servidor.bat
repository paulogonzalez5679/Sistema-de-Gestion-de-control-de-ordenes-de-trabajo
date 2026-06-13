@echo off
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

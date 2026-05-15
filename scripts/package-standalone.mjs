/**
 * Genera el paquete de distribución Windows (standalone) sin código fuente.
 * Uso: npm run package:win
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const standaloneDir = join(root, ".next", "standalone");
const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");
const releaseName = "autodetail-saas-pro-win";
const outDir = join(root, "release", releaseName);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureExists(path, label) {
  if (!existsSync(path)) {
    console.error(`\nError: no se encontró ${label}: ${path}`);
    console.error("Ejecuta primero un build correcto (npm run build).\n");
    process.exit(1);
  }
}

console.log("\n=== AutoDetail SaaS Pro — empaquetado Windows ===\n");
console.log("1/3  Compilando aplicación (npm run build)...\n");
run("npm", ["run", "build"]);

ensureExists(standaloneDir, "salida standalone (.next/standalone)");
ensureExists(staticDir, "assets estáticos (.next/static)");

if (existsSync(outDir)) {
  console.log(`\n2/3  Limpiando carpeta anterior: ${outDir}\n`);
  rmSync(outDir, { recursive: true, force: true });
}

console.log("\n2/3  Copiando artefactos al paquete...\n");
mkdirSync(outDir, { recursive: true });
cpSync(standaloneDir, outDir, { recursive: true });
mkdirSync(join(outDir, ".next"), { recursive: true });
cpSync(staticDir, join(outDir, ".next", "static"), { recursive: true });

if (existsSync(publicDir)) {
  cpSync(publicDir, join(outDir, "public"), { recursive: true });
}

copyFileSync(join(__dirname, "launch-server.mjs"), join(outDir, "launch-server.mjs"));
copyFileSync(join(root, ".env.example"), join(outDir, ".env.example"));

const shippedEnv = join(outDir, ".env");
if (existsSync(shippedEnv)) {
  unlinkSync(shippedEnv);
  console.log("  (omitido .env del paquete — el taller debe crear el suyo desde .env.example)\n");
}

const batContent = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AutoDetail SaaS Pro

echo.
echo  AutoDetail SaaS Pro
echo  ===================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js no esta instalado o no esta en el PATH.
  echo  Instale Node.js LTS 20.x o 22.x desde https://nodejs.org
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

echo.
echo  Servidor detenido.
pause
`;

writeFileSync(join(outDir, "Iniciar-Servidor.bat"), batContent, "utf8");

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const readme = `# AutoDetail SaaS Pro — paquete Windows (v${version})

Este paquete **no incluye código fuente**. Solo contiene el servidor compilado.

## Requisitos en el PC del taller

1. **Node.js LTS** 20.x o 22.x — https://nodejs.org (marque "Add to PATH" al instalar).
2. Archivo **.env** con las variables de Supabase (ver \`.env.example\`).
3. Conexión a **internet** hacia Supabase.
4. (Opcional) Permitir Node en el **Firewall de Windows** para el puerto 3000.

## Instalación rápida

1. Copie toda esta carpeta al PC (USB, red, etc.).
2. Renombre o copie \`.env.example\` → \`.env\` y complete los valores de Supabase.
3. Doble clic en **Iniciar-Servidor.bat**.
4. En la consola verá:
   - \`http://localhost:3000\` — solo en este PC
   - \`http://192.168.x.x:3000\` — tablets y otros PCs en la misma Wi‑Fi
5. Abra esa URL en el navegador e inicie sesión.

## Importante

- Use **siempre la misma URL** en el equipo (localhost o IP de red), no mezcle ambas.
- No comparta el archivo \`.env\` (contiene claves secretas).
- Para detener el servidor, cierre la ventana negra o pulse Ctrl+C.

Guía completa: en el repositorio de desarrollo, \`docs/instalacion-windows-standalone.md\`.
`;

writeFileSync(join(outDir, "LEEME.txt"), readme, "utf8");

console.log("\n3/3  Paquete listo.\n");
console.log(`  Carpeta: ${outDir}`);
console.log("\n  Contenido para el taller:");
console.log("    - Iniciar-Servidor.bat");
console.log("    - .env.example  (copiar a .env y rellenar)");
console.log("    - LEEME.txt");
console.log("\n  Comprima la carpeta en ZIP para distribuir si lo desea.\n");

/**
 * Genera el paquete de distribución Windows (standalone) sin código fuente.
 * IMPORTANTE: para uso en Windows, ejecute este script EN UN PC WINDOWS.
 * Un paquete generado en macOS incluye binarios de Mac y fallará en Windows.
 *
 * Uso: npm run package:win
 */
import { spawnSync } from "node:child_process";
import { platform, arch } from "node:os";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { iniciarServidorBat, verificarInstalacionBat } from "./release-bat-templates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const standaloneDir = join(root, ".next", "standalone");
const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");
const releaseName = "autodetail-saas-pro-win";
const outDir = join(root, "release", releaseName);

const buildOs = platform();
const isWindowsBuild = buildOs === "win32";

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

function findWrongPlatformNativeModules(dir) {
  const bad = [];
  if (!existsSync(dir)) return bad;
  for (const name of readdirSync(dir)) {
    if (/darwin|linux-(?!win)/i.test(name) && /sharp|swc|esbuild/i.test(name)) {
      bad.push(name);
    }
  }
  return bad;
}

console.log("\n=== AutoDetail SaaS Pro — empaquetado Windows ===\n");

if (!isWindowsBuild) {
  console.log("  ⚠  ATENCIÓN: está empaquetando desde", `${buildOs} (${arch()})`);
  console.log("  El ZIP resultante NO funcionará en Windows si incluye módulos nativos de Mac.\n");
  console.log("  Opciones:");
  console.log("    1) Ejecute npm run package:win en un PC con Windows");
  console.log("    2) Use GitHub Actions: workflow build-windows-release.yml\n");
}

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

const imgDir = join(outDir, "node_modules", "@img");
const nativeBad = findWrongPlatformNativeModules(imgDir);
const incompatible = !isWindowsBuild || nativeBad.length > 0;

const buildInfo = [
  `version=${JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version}`,
  `build_os=${buildOs}`,
  `build_arch=${arch()}`,
  `target_os=win32`,
  `INCOMPATIBLE_CON_WINDOWS=${incompatible ? "si" : "no"}`,
  incompatible
    ? "mensaje=Este paquete se genero fuera de Windows o contiene binarios de otra plataforma. No lo use en PCs Windows; regenere con npm run package:win en Windows."
    : "mensaje=Paquete apto para Windows.",
  nativeBad.length ? `modulos_sospechosos=${nativeBad.join(",")}` : ""
]
  .filter(Boolean)
  .join("\n");

writeFileSync(join(outDir, "BUILD-INFO.txt"), `${buildInfo}\n`, "utf8");
writeFileSync(join(outDir, "Iniciar-Servidor.bat"), iniciarServidorBat, "utf8");
writeFileSync(join(outDir, "Verificar-Instalacion.bat"), verificarInstalacionBat, "utf8");

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const readme = `# AutoDetail SaaS Pro — paquete Windows (v${version})

IMPORTANTE: el paquete debe generarse EN UN PC WINDOWS (npm run package:win).
Si BUILD-INFO.txt dice INCOMPATIBLE_CON_WINDOWS=si, no funcionara en Windows.

## Requisitos en el PC del taller

1. Node.js LTS 20.x o 22.x — https://nodejs.org ("Add to PATH")
2. Archivo .env (copiar desde .env.example)
3. Internet hacia Supabase

## Pasos

1. Copie toda esta carpeta al PC Windows.
2. .env.example -> .env (rellenar Supabase)
3. Doble clic: Verificar-Instalacion.bat (recomendado la primera vez)
4. Doble clic: Iniciar-Servidor.bat
5. Abra http://localhost:3000 o la IP Network que muestre la consola.

Guia: docs/instalacion-windows-standalone.md (en el repo del desarrollador).
`;

writeFileSync(join(outDir, "LEEME.txt"), readme, "utf8");

console.log("\n3/3  Paquete listo.\n");
console.log(`  Carpeta: ${outDir}`);
console.log(`  BUILD-INFO: INCOMPATIBLE_CON_WINDOWS=${incompatible ? "si" : "no"}`);
if (incompatible) {
  console.log("\n  ⚠  No distribuya este ZIP a Windows. Genere el paquete en Windows.\n");
} else {
  console.log("\n  Listo para copiar a PCs Windows.\n");
}
console.log("  Archivos:");
console.log("    - Iniciar-Servidor.bat");
console.log("    - Verificar-Instalacion.bat");
console.log("    - BUILD-INFO.txt");
console.log("    - .env.example\n");

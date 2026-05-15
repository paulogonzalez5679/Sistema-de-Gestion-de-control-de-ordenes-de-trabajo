/**
 * Arranque del servidor standalone: escucha en LAN y muestra URLs Local / Network.
 * Se copia al paquete de distribución junto a server.js.
 */
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT ?? "3000";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

function getLanAddresses() {
  try {
    const nets = networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        const family = net.family;
        const isIPv4 = family === "IPv4" || family === 4;
        if (isIPv4 && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
    return [...new Set(addresses)];
  } catch {
    return [];
  }
}

function printBanner() {
  const lan = getLanAddresses();
  console.log("");
  console.log("  AutoDetail SaaS Pro — servidor en ejecución");
  console.log("");
  console.log(`   - Local:    http://localhost:${port}`);
  if (lan.length === 0) {
    console.log(`   - Network:  (no se detectó IPv4 en LAN; revisa la conexión Wi‑Fi/Ethernet)`);
  } else {
    for (const ip of lan) {
      console.log(`   - Network:  http://${ip}:${port}`);
    }
  }
  console.log("");
  console.log("  Otros dispositivos en la misma red pueden usar la URL Network.");
  console.log("  Cierra esta ventana o pulsa Ctrl+C para detener el servidor.");
  console.log("");
}

process.env.PORT = port;
process.env.HOSTNAME = hostname;

printBanner();

const serverPath = join(__dirname, "server.js");
const child = spawn(process.execPath, [serverPath], {
  cwd: __dirname,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

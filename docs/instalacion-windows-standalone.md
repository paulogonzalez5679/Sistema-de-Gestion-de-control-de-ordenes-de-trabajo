# Instalación en Windows (paquete standalone, sin código fuente)

Esta guía cubre **dos roles**:

| Rol | Dónde | Qué hace |
|-----|--------|----------|
| **Desarrollador / proveedor** | PC con el repositorio y Node.js | Genera el ZIP o carpeta que se entrega al taller |
| **Operador del taller** | PC Windows del negocio | Ejecuta la app en red local sin tener el código fuente |

---

## Parte A — Generar el paquete (en tu PC de desarrollo)

### A.0 Muy importante: compilar en Windows

Un paquete generado en **macOS o Linux no funciona en Windows** (incluye librerías nativas de la plataforma incorrecta, p. ej. `sharp-darwin-arm64`).

| Dónde generar | ¿Sirve en Windows? |
|---------------|-------------------|
| Mac / Linux (`npm run package:win`) | **No** — `BUILD-INFO.txt` marcará `INCOMPATIBLE_CON_WINDOWS=si` |
| **PC con Windows** | **Sí** |
| **GitHub Actions** (workflow `build-windows-release.yml`) | **Sí** — descargue el artefacto ZIP |

### A.1 Requisitos

- Node.js LTS **20.x o 22.x** y npm
- Código del proyecto con dependencias instaladas (`npm install`)
- Archivo `.env` válido en la raíz (solo para **compilar**; no se incluye en el paquete)
- Para el ZIP final: máquina **Windows** o GitHub Actions

### A.2 Compilar y empaquetar (en Windows)

En la raíz del proyecto (donde está `package.json`), en un **PC Windows**:

```bash
npm install
npm run package:win
```

El script:

1. Ejecuta `npm run build` (modo producción con `output: "standalone"`).
2. Arma la carpeta `release/autodetail-saas-pro-win/` con el servidor compilado, estáticos, `Iniciar-Servidor.bat`, `Verificar-Instalacion.bat`, `BUILD-INFO.txt`, `.env.example` y `LEEME.txt`.

**No** copia `src/`, TypeScript ni el repositorio Git.

### A.2b Alternativa: GitHub Actions (si solo tienes Mac)

1. Sube el repo a GitHub.
2. **Actions** → **Build Windows release package** → **Run workflow**.
3. Al terminar, descarga el artefacto **autodetail-saas-pro-win** (ZIP listo para el taller).

El workflow usa variables placeholder solo para compilar; el taller pondrá su `.env` real.

### A.3 Entregar al taller

1. Abra la carpeta `release/autodetail-saas-pro-win/`.
2. (Opcional) Comprímala en ZIP para USB o correo.
3. Entregue al cliente **solo esa carpeta o ZIP**, más las instrucciones de la Parte B.
4. Envíe las claves de Supabase por un canal **seguro** (no dentro del ZIP público); el operador las pegará en su propio `.env`.

### A.4 Actualizar versión

Cada vez que publique una versión nueva:

```bash
npm run package:win
```

Sustituya la carpeta en el PC del taller (o desinstale la anterior y copie la nueva). Conserve el `.env` del taller si las claves no cambiaron.

---

## Parte B — Instalar y ejecutar en Windows (PC del taller)

### B.1 Requisitos en el PC del taller

| Requisito | Detalle |
|-----------|---------|
| Windows 10 u 11 | 64 bits recomendado |
| Node.js LTS | 20.x o 22.x desde [https://nodejs.org](https://nodejs.org) — al instalar, marque **“Add to PATH”** |
| Internet | Para conectar con **Supabase** |
| Supabase | Proyecto ya creado con `schema.sql` y migraciones aplicadas (ver [guia-ejecucion-usuario.md](./guia-ejecucion-usuario.md)) |

### B.2 Copiar el paquete

1. Descomprima el ZIP (si aplica) en una ruta fija, por ejemplo:  
   `C:\AutoDetail\autodetail-saas-pro-win\`
2. No mezcle esta carpeta con el código fuente del desarrollador; solo debe contener archivos como `server.js`, `Iniciar-Servidor.bat`, `.env.example`, etc.

### B.3 Configurar variables de entorno

1. En esa carpeta, copie `.env.example` y renombre la copia a **`.env`**.
2. Abra `.env` con el Bloc de notas y complete (desde Supabase → **Project Settings** → **API**):

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto, p. ej. `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon** |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** (secreta; no compartir) |
| `OUTBOX_WORKER_TOKEN` | Opcional; ver [outbox-workers.md](./outbox-workers.md) |

3. Guarde el archivo. **No** envíe `.env` por WhatsApp o correo masivo.

### B.4 Arrancar el servidor

1. (Recomendado la primera vez) Doble clic en **`Verificar-Instalacion.bat`** — comprueba Node, `.env` y si el paquete es compatible con Windows (`BUILD-INFO.txt`).
2. Doble clic en **`Iniciar-Servidor.bat`**.
2. Si falta Node.js o `.env`, la ventana mostrará un mensaje de error y pausará.
3. Si todo está bien, verá algo como:

```text
   - Local:    http://localhost:3000
   - Network:  http://192.168.70.14:3000
```

4. En el PC del taller: abra **Local** en Chrome o Edge.  
5. En tablets u otros PCs de la **misma Wi‑Fi**: abra la URL **Network** (la IP puede variar; use la que muestre la consola).

### B.5 Firewall de Windows

La primera vez, Windows puede pedir permiso para **Node.js JavaScript runtime**. Elija **Red privada** y permita el acceso. Si otros dispositivos no conectan:

1. **Configuración** → **Firewall de Windows** → **Permitir una aplicación**.
2. Permita **Node.js** en redes privadas, o cree una regla de entrada para el **puerto TCP 3000**.

### B.6 Detener el servidor

- Cierre la ventana de consola, o  
- En esa ventana, pulse **Ctrl+C**.

La app solo es accesible en la red mientras esa ventana siga abierta.

### B.7 Uso diario recomendado

- Cree un acceso directo en el escritorio a `Iniciar-Servidor.bat`.
- Acuerde con el equipo **una sola URL base** (siempre la IP de red o siempre localhost; no alternen, o las sesiones no coincidirán).
- Deje el PC encendido y el BAT en ejecución durante el horario de trabajo.

---

## Problemas frecuentes (Windows)

| Síntoma | Solución |
|---------|----------|
| Mensaje **INCOMPATIBLE_CON_WINDOWS** o paquete hecho en Mac | Regenerar el ZIP **en Windows** o con GitHub Actions; no copiar `release/` desde Mac |
| `Node.js no esta instalado` | Instale Node LTS desde nodejs.org y reinicie el PC |
| `Falta el archivo .env` | Copie `.env.example` → `.env` y rellene valores |
| Error de variables al arrancar | Revise URL y claves en `.env`; reinicie el BAT |
| Otro dispositivo no abre la web | Misma Wi‑Fi, firewall, use la IP **Network** de la consola |
| Puerto 3000 en uso | Cierre otra instancia del servidor o cambie `PORT=3001` en el BAT y en la URL |
| 401 / no autorizado | Usuario sin perfil en `profiles` o sesión caducada — ver guía de Supabase |

---

## Seguridad

- El paquete **no incluye** tu código fuente TypeScript/React, pero sí **JavaScript compilado** (normal en aplicaciones web).
- La clave **service_role** en `.env` es equivalente a acceso total a datos en Supabase: protégela.
- No suba `.env` a la nube ni lo deje en carpetas compartidas públicas.

---

## Referencias

| Documento | Contenido |
|-----------|-----------|
| [guia-ejecucion-usuario.md](./guia-ejecucion-usuario.md) | Supabase, esquema, variables, FAQ general |
| [outbox-workers.md](./outbox-workers.md) | Worker de notificaciones (opcional) |
| [manual-de-uso-sistema.md](./manual-de-uso-sistema.md) | Uso funcional del panel |

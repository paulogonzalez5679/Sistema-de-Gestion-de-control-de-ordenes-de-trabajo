# Guía de instalación y uso — AutoDetail SaaS Pro

**Audiencia:** responsable de TI, operador del taller o persona que debe **poner en marcha** la aplicación en un ordenador de la oficina o en la red local (LAN).  
**Alcance de red:** la aplicación Next.js corre en tu equipo o en tu LAN. La **única dependencia en internet** habitual es el proyecto **Supabase** (base de datos y autenticación en la nube de Supabase).

Para detalles técnicos del worker de notificaciones (outbox) y acceso LAN avanzado, consulta también [outbox-workers.md](./outbox-workers.md) y [rls-migration-plan.md](./rls-migration-plan.md).

---

## 1. Qué es esta aplicación

**AutoDetail SaaS Pro** es un software operativo para **talleres de auto detailing**: órdenes de trabajo, clientes y vehículos, inventario consumido en órdenes, programa de lealtad (puntos y canjes), agenda y notificaciones internas.  
Requiere un **proyecto Supabase** (Postgres + Auth) configurado y las variables de entorno correctas en un archivo `.env` local.

---

## 2. Requisitos del equipo

| Requisito | Detalle |
|-----------|---------|
| **Sistema operativo** | macOS, Windows o Linux donde puedas instalar Node.js. |
| **Node.js** | Versión **LTS 20.x o 22.x** recomendada (compatible con las dependencias del proyecto). |
| **npm** | Incluido con Node.js; se usa para instalar librerías y arrancar la app. |
| **Navegador** | Versión reciente de Chrome, Edge, Safari o Firefox. |
| **Internet** | Conexión estable para hablar con **Supabase** (HTTPS). No hace falta otro servicio en la nube para el uso normal. |
| **Red local (opcional)** | Si quieres que tablets u otros PCs abran la app por Wi‑Fi, necesitas saber la **IP local** del ordenador que ejecuta Next (ver sección 7). |

---

## 3. Requisitos en Supabase

### 3.1 Crear el proyecto

1. Entra en [https://supabase.com](https://supabase.com) e inicia sesión.
2. Crea un **nuevo proyecto** (elige región y contraseña de base de datos; guárdala de forma segura).
3. Espera a que el proyecto termine de provisionarse.

### 3.2 Aplicar el esquema de base de datos

Sin las tablas y funciones correctas, la aplicación mostrará errores al iniciar sesión o al usar el panel.

**Opción recomendada (orden lógico):**

1. En el panel de Supabase: **SQL Editor** → **New query**.
2. Abre el archivo del repositorio [`supabase/schema.sql`](../supabase/schema.sql), copia **todo** su contenido y ejecútalo una vez (crea tablas, RLS inicial, funciones de lealtad, etc.).
3. A continuación ejecuta **cada archivo de migración** en la carpeta [`supabase/migrations/`](../supabase/migrations/), **en orden cronológico** (por el prefijo de fecha en el nombre del archivo), del más antiguo al más reciente. Ejemplos de nombres (el listado exacto puede crecer con el tiempo):

   - `20260205120000_*.sql`
   - `20260207120000_*.sql`
   - … hasta el último `202605*.sql` (incluye lealtad, órdenes, bundle atómico, políticas RLS y outbox).

Si omites alguna migración, pueden fallar rutas concretas (por ejemplo RPC de bundle o tabla `outbox_events`).

### 3.3 Primer usuario administrador

La pantalla de la app usa **Supabase Auth** (email/contraseña según hayas configurado el proveedor).

1. En Supabase: **Authentication** → **Users** → **Add user** (o invita al usuario y confirma el correo según tu flujo).
2. Anota el **UUID** del usuario creado (aparece en la lista de usuarios).
3. Debe existir una fila en la tabla `public.profiles` con el **mismo `id`** que el usuario de Auth, rol `admin` y datos visibles (nombre, email). Si no existe un disparador automático en tu copia del esquema, créala en **SQL Editor**, sustituyendo los valores entre comillas:

```sql
insert into public.profiles (id, full_name, email, role)
values (
  'UUID-DEL-USUARIO-AUTH',
  'Administrador',
  'correo@ejemplo.com',
  'admin'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role;
```

4. En **Authentication** → usuario → **User metadata / App metadata**, conviene que `app_metadata` incluya `"role": "admin"` para alinear JWT y políticas RLS (el panel de perfiles de la app puede actualizar esto cuando ya tengas un admin operativo).

Sin un perfil `admin`, muchas rutas de administración devolverán “no autorizado”.

---

## 4. Variables de entorno

En la raíz del proyecto, copia el ejemplo y rellena los valores reales (nunca subas `.env` a Git):

```bash
cp .env.example .env
```

Abre `.env` con un editor de texto. Los valores los obtienes en Supabase: **Project Settings** → **API**.

| Variable | ¿Obligatoria? | Descripción |
|----------|---------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto, p. ej. `https://xxxxx.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave **anon** (pública); la usa el navegador con RLS según sesión. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave **service_role** (secreta). La usa el servidor Next para operaciones internas; **no** la expongas al frontend ni la compartas en chats públicos. |
| `OUTBOX_WORKER_TOKEN` | No | Si la dejas vacía, el endpoint del worker de outbox responde 401 (seguro por defecto). Si defines un token largo y aleatorio, podrás llamar al worker con `curl` (ver [outbox-workers.md](./outbox-workers.md)). |

Tras editar `.env`, **reinicia** el servidor de desarrollo (`Ctrl+C` y vuelve a ejecutar `npm run dev`).

---

## 5. Instalación (pasos en orden)

1. Obtén el código del proyecto (clon con Git o carpeta ZIP descomprimida).
2. Abre una terminal en la carpeta raíz del proyecto (donde está `package.json`).
3. Instala dependencias:

```bash
npm install
```

4. Crea y rellena `.env` como en la sección 4.
5. Asegúrate de haber aplicado el esquema y migraciones en Supabase (sección 3).
6. Arranca la aplicación (sección 6).

---

## 6. Comandos de uso

Todos se ejecutan en la **raíz del proyecto** (misma carpeta que `package.json`).

| Comando | Uso |
|---------|-----|
| `npm run dev` | Modo desarrollo. La app suele quedar en **solo este equipo** (`http://localhost:3000` o el puerto que indique la consola). |
| `npm run dev:lan` | Igual que desarrollo, pero escuchando en **todas las interfaces** (`0.0.0.0`): otros dispositivos en la **misma Wi‑Fi/LAN** pueden abrir `http://IP-de-este-PC:3000`. |
| `npm run build` | Genera la versión optimizada para producción (carpeta `.next`). |
| `npm run start` | Sirve el build en localhost (tras `npm run build`). |
| `npm run start:lan` | Sirve el build accesible desde la LAN (tras `npm run build`). |
| `npm run lint` | Revisa estilo y reglas de ESLint (útil para quien mantenga el código). |
| `npm run typecheck` | Comprueba tipos TypeScript sin generar build. |
| `npm run clean` | Borra la caché de build local (`.next`); útil si algo queda “atascado”. |

### Worker de outbox (opcional)

Si configuraste `OUTBOX_WORKER_TOKEN`, puedes procesar la cola de notificaciones asíncronas con `curl` contra tu propia máquina o la IP LAN. Ejemplos y cron en [outbox-workers.md](./outbox-workers.md).

### Importante: misma dirección en el navegador

Si entras un día con `http://localhost:3000` y otro con `http://192.168.1.10:3000`, las **cookies de sesión no se comparten** (son orígenes distintos). Elige **una** base URL para todo el equipo (por ejemplo siempre la IP LAN si todos usan tablets en la red).

---

## 7. Cómo abrir la aplicación

- **Solo en este PC:** con `npm run dev`, abre el navegador en `http://localhost:3000` (o el puerto que muestre la terminal, p. ej. 3001 si 3000 está ocupado).
- **Desde otro dispositivo en la LAN:** ejecuta `npm run dev:lan` (o `npm run start:lan` tras build), averigua la IP local del PC (p. ej. en macOS: Preferencias del Sistema → Red; en Windows: `ipconfig`), y en el otro dispositivo abre `http://ESA-IP:3000`.

La pantalla de entrada es la de **login** (`/login`). Usa el usuario creado en Supabase Auth con perfil `admin` (u otro rol que hayas configurado).

---

## 8. Problemas frecuentes (FAQ)

| Síntoma | Qué revisar |
|---------|----------------|
| Error al arrancar sobre variables faltantes o URL inválida | `.env` completo; la URL debe coincidir con el **ref** del proyecto que lleva la clave anon (validación en `src/lib/env.ts`). |
| “SUPABASE_SERVICE_ROLE_KEY is required…” al usar APIs | Falta la clave **service_role** en `.env` o el servidor no se reinició tras guardarla. |
| 401 en muchas rutas / “No autorizado” | Sesión caducada (vuelve a iniciar sesión) o usuario sin fila en `profiles` / rol incorrecto. |
| Errores de tabla o función inexistente | No se ejecutó `schema.sql` o falta alguna **migración** en orden. |
| Notificaciones de nueva orden no aparecen | Si usas outbox, hace falta ejecutar el **worker** (`curl` al endpoint) o revisa [outbox-workers.md](./outbox-workers.md). Si no usas worker, revisa logs del servidor. |
| Puerto 3000 ocupado | Cierra la otra app o deja que Next elija otro puerto y usa la URL que imprime la consola. |

---

## 9. Seguridad (resumen para el negocio)

- El archivo **`.env` no debe subirse a Git** (ya está ignorado en `.gitignore` si el repositorio está bien configurado).
- La clave **service_role** equivale a acceso total a los datos del proyecto Supabase: trátala como una contraseña maestra; no la envíes por correo ni WhatsApp.
- Si crees que una clave se filtró, **rótala** en el panel de Supabase y actualiza `.env` en todos los equipos que ejecuten la app.

---

## 10. Documentación relacionada

| Documento | Contenido |
|-----------|------------|
| [manual-de-uso-sistema.md](./manual-de-uso-sistema.md) | **Manual funcional de usuario:** módulos del panel, roles, flujo completo de órdenes, FAQ operativa. |
| [outbox-workers.md](./outbox-workers.md) | Worker asíncrono, LAN, `curl`, token `OUTBOX_WORKER_TOKEN`. |
| [rls-migration-plan.md](./rls-migration-plan.md) | Evolución de seguridad en base de datos (RLS y cliente con sesión). |
| [`.env.example`](../.env.example) | Lista mínima de variables con comentarios. |
| [instalacion-windows-standalone.md](./instalacion-windows-standalone.md) | **Distribución Windows:** build standalone, ZIP sin fuente, `Iniciar-Servidor.bat` y LAN. |

Si necesitas soporte técnico del proveedor del código, adjunta versión de Node (`node -v`), mensaje de error exacto y confirmación de que `schema.sql` + migraciones se aplicaron sin error en el SQL Editor.

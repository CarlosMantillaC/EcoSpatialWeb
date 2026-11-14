# EcoSpatial Web

Plataforma logística de enrutamiento sostenible con **control HCI por voz** y **autenticación biométrica (Passwordless)**. Reemplaza el flujo CRUD tradicional por un motor interactivo sobre un mapa, con asignación automática del vehículo más cercano.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | npm workspaces (`client/` + `server/`) |
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS 4 + Zustand |
| Mapas | Leaflet + react-leaflet + tiles OpenStreetMap |
| Ruteo / ETA | OSRM público (gratuito, sin API key) |
| Voz | Web Speech API (procesamiento local en el navegador) |
| Biometría | WebAuthn / FIDO2 (`@simplewebauthn/*`) + JWT |
| Backend | NestJS + TypeORM |
| Base de datos | PostgreSQL 16 (Docker Compose) |
| Semántica | Serialización JSON-LD de vehículos y despachos |

## Requisitos

- Node.js >= 20
- Docker + Docker Compose
- Navegador Chromium (Chrome / Edge) para voz y biometría

## Puesta en marcha

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Dependencias
npm install

# 3. Base de datos (puerto configurado en DB_PORT, por defecto 5435)
npm run db:up

# 4. Arrancar backend + frontend
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api

### Primer ingreso

1. Abre http://localhost:5173 y entra a **Registrar dispositivo**.
2. Ingresa nombre y correo y elige el **método de autenticación**:
   - **Este dispositivo:** huella/rostro/PIN del equipo (Windows Hello, Touch ID, biometría Android).
   - **Teléfono:** usa la biometría del móvil (según soporte del navegador).
   - **Llave de seguridad:** llave FIDO2 por USB/NFC.
3. El navegador pedirá la verificación correspondiente.
4. A partir de ahí, el botón **Ingresar con biometría** abre el panel logístico sin contraseña.

> **Cada correo crea un solo perfil.** Si el correo ya está registrado, el registro responde **409** y puedes iniciar sesión; desde el panel, **Agregar dispositivo** vincula un segundo autenticador a tu perfil (la sesión es obligatoria, nadie puede tocar tu perfil desde el registro).

> WebAuthn requiere un *secure context*. `http://localhost` se considera seguro, por lo que funciona en desarrollo sin HTTPS.

#### Soporte por plataforma

| Plataforma / navegador | "Este dispositivo" (huella/PIN) | Teléfono | Llave de seguridad |
|---|---|---|---|
| Windows 10/11 (Chrome, Edge) | ✅ Windows Hello | ✅ | ✅ |
| macOS (Chrome, Safari) | ✅ Touch ID | ✅ | ✅ |
| Android (Chrome) | ✅ biometría | — | ✅ |
| **Linux (Chrome/Edge)** | ❌ normalmente no disponible | ⚠️ limitado | ✅ |

En **Linux** no existe una API de sistema para WebAuthn, así que Chrome/Edge no exponen el lector de huellas del portátil. Alternativas:

- Usar una llave de seguridad USB/NFC.
- Usar la biometría de un teléfono (si tu versión de Chrome ofrece el flujo híbrido).
- Instalar un puente externo que exponga el lector como autenticador FIDO2, por ejemplo [`tpm-fido2-thinkpad-linux`](https://github.com/mc256/tpm-fido2-thinkpad-linux) o la extensión [`WebAuthnLinux`](https://github.com/samveen/WebAuthnLinux) (fprintd + native messaging).
- Usar el **acceso de demostración** descrito abajo.

#### Acceso de demostración (solo desarrollo)

Con `DEV_LOGIN_ENABLED=true` (valor por defecto en `.env.example`) aparece en el login una sección para entrar con solo un correo, sin biometría. Está pensada para demos del MVP en equipos sin autenticador.

- Se desactiva automáticamente si `NODE_ENV=production`.
- Crea el usuario si no existe y emite un JWT normal.
- **No usar en producción.**

### Simulador de flota

El backend siembra vehículos al arrancar (si la tabla está vacía) y mueve sus posiciones cada `SIMULATOR_INTERVAL_SECONDS` segundos (por defecto 3). También puedes sembrar manualmente:

```bash
npm run seed -w server
```

**Viajes simulados y auto-completado:**

- Cada despacho activo avanza por su ruta (geometría de OSRM) durante `SIMULATOR_TRIP_SECONDS` segundos (por defecto 50) y, al llegar al destino, el servicio se **completa automáticamente**: el despacho pasa a `completado` y el vehículo queda `libre`.
- El progreso se calcula desde `createdAt` del despacho, sin estado adicional, así que sobrevive a reinicios del servidor.
- El frontend lo recibe en tiempo real por **SSE** (`GET /api/events/dispatch`): posiciones, progreso y el evento `dispatch-completed`. Si el SSE se cae, el polling de 12 s actúa de respaldo.
- Los vehículos sin despacho **deambulan por calles reales**: siguen rutas OSRM entre puntos aleatorios cercanos (~1–3 km) a velocidad urbana (~30–50 km/h) y se detienen unos segundos al llegar a cada destino. Nunca se mueven por encima de manzanas ni fuera de la red vial; si OSRM no responde, esperan quietos. Los `en_ruta` sembrados sin despacho son **tráfico de fondo** y nunca auto-completan.

## Comandos de voz

El micrófono se procesa localmente con la Web Speech API (`es-ES`). El diccionario vive en `client/src/modules/voice/commands.ts`.

| Comando | Acción |
|---|---|
| "mostrar tráfico" / "ocultar tráfico" | Capa de tráfico simulada |
| "modo oscuro" / "modo claro" | Tema de la interfaz |
| "centrar mapa" | Vuelve a la coordenada base (Cúcuta) |
| "acercar" / "alejar" | Zoom del mapa |
| "mostrar disponibles" | Filtra vehículos `libre` |
| "mostrar en ruta" | Filtra vehículos `en_ruta` |
| "limpiar pantalla" | Oculta marcadores y ruta |

> La capa de "tráfico" es **simulada** (incidencias propias), ya que OpenStreetMap no ofrece tráfico en tiempo real en tiles gratuitos.

## Despacho

El flujo es de **dos pasos**, para que ningún vehículo quede `en ruta` sin un viaje aprobado:

1. Haz clic en cualquier punto del mapa → se calcula una **vista previa** (`POST /api/dispatch/preview`): vehículo libre más cercano, distancia, ETA y trazado de ruta. **No se guarda nada ni cambia el estado de ningún vehículo.**
2. Revisa la propuesta en el panel y pulsa **Aprobar viaje** (o **Descartar**).
3. El backend revalida que el vehículo siga libre, consulta OSRM, guarda el despacho y marca el vehículo `en_ruta`.
4. Desde el panel puedes **completar** el servicio (libera el vehículo) o **cancelar** el despacho (también lo libera).

Mientras haya un despacho activo, nuevos clics en el mapa se bloquean con un aviso: primero completa o cancela el servicio actual.

**Durante el viaje** el vehículo se desplaza sobre la ruta en tiempo real y puedes seguirlo en:

- El **popup del marcador**: destino, conductor, barra de progreso y llegada estimada.
- La sección **"En ruta · con despacho"** del panel Flota (clic en la fila → el mapa vuela al vehículo).
- El **panel Despacho**: barra de progreso y segundos restantes.

Al llegar al destino el servicio **se completa solo** y aparece el aviso "Servicio completado automáticamente". El botón **Completar** sigue disponible para cerrar el servicio antes de tiempo.

> El botón **Ocultar ruta** y el comando de voz "limpiar pantalla" solo ocultan la ruta en pantalla; el despacho sigue activo y se puede completar, cancelar o volver a mostrar con **Mostrar ruta**.

## API principal

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register/options` | Genera opciones WebAuthn de registro (`method`: `device`, `phone`, `securityKey`). Responde **409** si el correo ya está registrado |
| POST | `/api/auth/register/verify` | Verifica registro, crea el perfil y emite JWT |
| POST | `/api/auth/devices/options` | Agrega un segundo dispositivo al perfil autenticado (JWT) |
| POST | `/api/auth/login/options` | Opciones de autenticación (con o sin correo) |
| POST | `/api/auth/login/verify` | Verifica firma biométrica y emite JWT |
| GET | `/api/auth/config` | Indica si el acceso demo está habilitado |
| POST | `/api/auth/dev/login` | Login por correo solo en desarrollo |
| GET | `/api/auth/me` | Usuario de la sesión (JWT) |
| GET | `/api/vehicles?status=libre` | Lista / filtra flota |
| GET | `/api/vehicles?format=jsonld` | Flota serializada en JSON-LD |
| POST | `/api/vehicles` | Crea vehículo |
| PATCH | `/api/vehicles/:id` | Actualiza vehículo |
| POST | `/api/dispatch/preview` | Vista previa: vehículo + ruta sin asignar ni guardar |
| POST | `/api/dispatch` | Asigna el vehículo más cercano y traza ruta (`vehicleId` opcional) |
| GET | `/api/dispatch` | Historial de despachos |
| GET | `/api/dispatch/active` | Despachos activos con progreso y segundos restantes |
| GET | `/api/dispatch/:id/jsonld` | Despacho en JSON-LD |
| POST | `/api/dispatch/:id/complete` | Completa y libera el vehículo |
| POST | `/api/dispatch/:id/cancel` | Cancela y libera el vehículo |
| GET | `/api/events/dispatch` | Stream SSE: `fleet` (flota + progreso) y `dispatch-completed` |

## Estructura

```
EcoSpatialWeb/
├─ client/
│  └─ src/
│     ├─ components/          # Header, ThemeToggle
│     ├─ lib/                 # api, webauthn, fleetStream (SSE)
│     ├─ modules/
│     │  ├─ auth/             # Login, Enroll, ProtectedRoute, inactividad
│     │  ├─ dashboard/        # Paneles de flota y despacho
│     │  ├─ map/              # Leaflet, marcadores, ruta, tráfico
│     │  └─ voice/            # Web Speech API + diccionario
│     └─ store/               # Zustand (auth, fleet, theme, map)
└─ server/
   └─ src/
      ├─ entities/            # User, Credential, Vehicle, Dispatch
      ├─ modules/
      │  ├─ auth/             # WebAuthn + JWT
      │  ├─ users/
      │  ├─ vehicles/
      │  ├─ dispatch/
      │  ├─ events/           # Stream SSE de estado de flota
      │  ├─ routing/          # Cliente OSRM
      │  └─ simulator/        # Movimiento de flota + auto-completado
      └─ semantic/            # JSON-LD
```

## Seguridad y sesión

- **Passwordless:** no se almacenan contraseñas; solo la clave pública WebAuthn.
- El contador de firma se actualiza en cada login para mitigar replay.
- JWT con expiración (`JWT_EXPIRES_IN`, por defecto `8h`).
- Cierre automático de sesión tras **5 minutos de inactividad** en el frontend.

## Despliegue en Render (plan gratuito)

El repositorio incluye `render.yaml`, un Blueprint que aprovisiona **de una sola vez** la API NestJS y el frontend Vite como Static Site. La base de datos PostgreSQL vive en **Neon** (free tier) y se conecta vía `DATABASE_URL`.

1. Crea un proyecto en [Neon](https://neon.tech) y copia su connection string.
2. En [Render](https://render.com) elige **New → Blueprint** y conecta este repositorio.
3. Render leerá `render.yaml` y creará:
   - `ecospatial-api` (Web Service free) en `https://ecospatial-api.onrender.com`.
   - `ecospatial-web` (Static Site free) en `https://ecospatial-web.onrender.com`.
4. En `ecospatial-api` → **Environment**, define `DATABASE_URL` con la connection string de Neon (Render lo pide al sincronizar porque usa `sync: false`).
5. Confirma y espera el primer despliegue.

Después del primer deploy, verifica que `WEBAUTHN_RP_ID` y `WEBAUTHN_ORIGIN` de `ecospatial-api` coincidan con el dominio real del Static Site (Render añade sufijos si el nombre está ocupado).

Notas del plan gratuito:

- El Web Service **se suspende** tras ~15 min de inactividad (el primer request tarda en despertar). El Static Site no se suspende.
- La base de datos de Neon no expira; su compute free se suspende por inactividad y despierta solo.
- `DB_SYNCHRONIZE=true` crea las tablas al arrancar; para producción real conviene usar migraciones TypeORM.
- Mantén **una sola instancia** del Web Service: los challenges de WebAuthn viven en memoria.
- `WEBAUTHN_RP_ID` debe ser el subdominio del frontend (`onrender.com` está en la Public Suffix List, no puede usarse como RP ID).

## Notas y limitaciones (MVP)

- La telemetría es **simulada** (no hay app móvil de conductores).
- OSRM público es un servidor demo con límites de uso; para producción conviene auto-alojarlo.
- El tráfico es simulado.
- `synchronize: true` está activo fuera de producción; para producción usa migraciones.
- La biometría depende del hardware del operador; el PIN del sistema operativo sirve como contingencia.

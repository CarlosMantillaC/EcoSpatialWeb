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

El backend siembra vehículos al arrancar (si la tabla está vacía) y mueve sus posiciones cada `SIMULATOR_INTERVAL_SECONDS` segundos. También puedes sembrar manualmente:

```bash
npm run seed -w server
```

## Comandos de voz

El micrófono se procesa localmente con la Web Speech API (`es-ES`). El diccionario vive en `client/src/modules/voice/commands.ts`.

| Comando | Acción |
|---|---|
| "mostrar tráfico" / "ocultar tráfico" | Capa de tráfico simulada |
| "modo oscuro" / "modo claro" | Tema de la interfaz |
| "centrar mapa" | Vuelve a la coordenada base (Quito) |
| "acercar" / "alejar" | Zoom del mapa |
| "mostrar disponibles" | Filtra vehículos `libre` |
| "mostrar en ruta" | Filtra vehículos `en_ruta` |
| "limpiar pantalla" | Oculta marcadores y ruta |

> La capa de "tráfico" es **simulada** (incidencias propias), ya que OpenStreetMap no ofrece tráfico en tiempo real en tiles gratuitos.

## Despacho

1. Haz clic en cualquier punto del mapa.
2. El backend busca el vehículo `libre` más cercano (distancia haversine).
3. Consulta OSRM para obtener distancia, ETA y la geometría de la ruta.
4. Guarda el despacho, marca el vehículo `en_ruta` y el frontend dibuja la ruta.
5. Desde el panel de despacho puedes **completar** el servicio (libera el vehículo).

## API principal

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register/options` | Genera opciones WebAuthn de registro (`method`: `device`, `phone`, `securityKey`) |
| POST | `/api/auth/register/verify` | Verifica registro y emite JWT |
| POST | `/api/auth/login/options` | Opciones de autenticación (con o sin correo) |
| POST | `/api/auth/login/verify` | Verifica firma biométrica y emite JWT |
| GET | `/api/auth/config` | Indica si el acceso demo está habilitado |
| POST | `/api/auth/dev/login` | Login por correo solo en desarrollo |
| GET | `/api/auth/me` | Usuario de la sesión (JWT) |
| GET | `/api/vehicles?status=libre` | Lista / filtra flota |
| GET | `/api/vehicles?format=jsonld` | Flota serializada en JSON-LD |
| POST | `/api/vehicles` | Crea vehículo |
| PATCH | `/api/vehicles/:id` | Actualiza vehículo |
| POST | `/api/dispatch` | Asigna el vehículo más cercano y traza ruta |
| GET | `/api/dispatch` | Historial de despachos |
| GET | `/api/dispatch/:id/jsonld` | Despacho en JSON-LD |
| POST | `/api/dispatch/:id/complete` | Completa y libera el vehículo |

## Estructura

```
EcoSpatialWeb/
├─ client/
│  └─ src/
│     ├─ components/          # Header, ThemeToggle
│     ├─ lib/                 # api, webauthn
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
      │  ├─ routing/          # Cliente OSRM
      │  └─ simulator/        # Cron de telemetría simulada
      └─ semantic/            # JSON-LD
```

## Seguridad y sesión

- **Passwordless:** no se almacenan contraseñas; solo la clave pública WebAuthn.
- El contador de firma se actualiza en cada login para mitigar replay.
- JWT con expiración (`JWT_EXPIRES_IN`, por defecto `8h`).
- Cierre automático de sesión tras **5 minutos de inactividad** en el frontend.

## Despliegue en Render (plan gratuito)

El repositorio incluye `render.yaml`, un Blueprint que aprovisiona **de una sola vez** la base de datos PostgreSQL, la API NestJS y el frontend Vite como Static Site.

1. En [Render](https://render.com) elige **New → Blueprint** y conecta este repositorio.
2. Render leerá `render.yaml` y creará:
   - `ecospatial-db` (PostgreSQL free).
   - `ecospatial-api` (Web Service free) en `https://ecospatial-api.onrender.com`.
   - `ecospatial-web` (Static Site free) en `https://ecospatial-web.onrender.com`.
3. Confirma y espera el primer despliegue.

Después del primer deploy, verifica que `WEBAUTHN_RP_ID` y `WEBAUTHN_ORIGIN` de `ecospatial-api` coincidan con el dominio real del Static Site (Render añade sufijos si el nombre está ocupado).

Notas del plan gratuito:

- El Web Service **se suspende** tras ~15 min de inactividad (el primer request tarda en despertar). El Static Site no se suspende.
- La base de datos free **expira a los 90 días**.
- `DB_SYNCHRONIZE=true` crea las tablas al arrancar; para producción real conviene usar migraciones TypeORM.
- Mantén **una sola instancia** del Web Service: los challenges de WebAuthn viven en memoria.
- `WEBAUTHN_RP_ID` debe ser el subdominio del frontend (`onrender.com` está en la Public Suffix List, no puede usarse como RP ID).

## Notas y limitaciones (MVP)

- La telemetría es **simulada** (no hay app móvil de conductores).
- OSRM público es un servidor demo con límites de uso; para producción conviene auto-alojarlo.
- El tráfico es simulado.
- `synchronize: true` está activo fuera de producción; para producción usa migraciones.
- La biometría depende del hardware del operador; el PIN del sistema operativo sirve como contingencia.

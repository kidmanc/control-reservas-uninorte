# Casos Especiales — Tesorería Uninorte

Sistema de gestión de casos de reserva de matrícula y devolución del área de Tesorería.

## Estructura del proyecto

```
control-reservas-uninorte/
├── frontend/          ← React + Vite (puerto 5173)
├── backend/           ← FastAPI + SQLAlchemy + SQLite en dev (puerto 8000)
│   ├── casos/ auth/ usuarios/ comentarios/ archivos/
│   ├── historial/ catalogos/ reportes/
│   └── docker-compose.yml ← PostgreSQL + backend (producción)
├── docs/              ← roles-y-permisos.md (recorrido y reglas del flujo)
└── README.md
```

## Arrancar el backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # opcional: sobrescribir SECRET_KEY
uvicorn main:app --reload --port 8000
```

O con Docker:

```bash
cd backend
docker-compose up -d
```

> Nota: en desarrollo la base es **SQLite** (`backend/casos_especiales.db`), se crea al iniciar y **no se sube al repo** (está en `.gitignore`). Para producción se migra a PostgreSQL (ver Docker).

La API estará en `http://localhost:8000/docs` (Swagger UI).

### Usuario semilla

```bash
cd backend
python seed.py
```

Todas con contraseña `password123` (solo desarrollo, la tesorera las reemplaza en Gestión de usuarios):

| Correo | Rol |
|--------|-----|
| `carolina.mejia@uninorte.edu.co` | Tesorera (admin) |
| `monica@uninorte.edu.co` | Asistente de Tesorería (liquida) |
| `robin@uninorte.edu.co` | Revisor y ejecutor |
| `diana@uninorte.edu.co` | Revisora y ejecutora |
| `jg@uninorte.edu.co` | Aprobador final |
| `carlos@uninorte.edu.co` | Aprobador final |
| `centro.medico@uninorte.edu.co` | Centro Médico |

## Arrancar el frontend

```bash
cd frontend  # o la raíz si no existe frontend/
npm install
npm run dev
```

Rutas:

- `/` — formulario público (estudiante o tercero)
- `/seguimiento` — consulta pública por número + código
- `/seguimiento/:id` — seguimiento público (pide el código en cada acceso)
- `/login` — login del panel interno
- `/panel` — lista de casos (requiere login)
- `/panel/casos/nueva` — crear caso desde el panel
- `/panel/casos/:id` — detalle de caso
- `/panel/usuarios` — gestión de usuarios (solo admin)
- `/panel/reportes` — resumen y estancados (Tesorería)
- `/panel/configuracion` — catálogos (admin)
- Cualquier otra — página 404

## Flujo del caso (resumen)

1. **Asistente** recibe, revisa y **liquida** (porcentaje y destino) → remite a Centro Médico o a Revisión y ejecución.
2. **Centro Médico** aprueba o rechaza documentos → vuelve a Tesorería.
3. **Revisión y ejecución** confirma con OK (ejecutó en otra plataforma) → envía a Aprobación final, o devuelve con correcciones.
4. **Aprobador** solo **aprueba o rechaza** (no edita la liquidación), o devuelve a quien se lo envió.

Detalle completo en `docs/roles-y-permisos.md`.

## API Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/me` | Usuario actual | Sí |
| POST | `/api/casos/` | Crear caso (multipart `datos` + `archivos`) | No |
| GET | `/api/casos/` | Listar casos (restringidos: solo asignados) | Sí |
| GET | `/api/casos/participados` | Historial del operador | Sí |
| GET | `/api/casos/seguimiento/buscar?numero&codigo` | Buscar caso público | No (código) |
| GET | `/api/casos/numero/{numero}?codigo=` | Caso por número | Código si anónimo |
| GET | `/api/casos/{id}?codigo=` | Detalle caso | Código si anónimo |
| PATCH | `/api/casos/{id}/estado` | Cambiar estado (aprobador: solo finales) | Sí |
| PATCH | `/api/casos/{id}/decision` | Liquidación: la registra el asistente | Sí |
| PATCH | `/api/casos/{id}/remitir` | Mover al siguiente paso del flujo | Sí |
| POST | `/api/casos/{id}/comentarios/` | Agregar comentario (autor lo fija el servidor) | Código si anónimo |
| GET | `/api/casos/{id}/comentarios/` | Listar (anónimo: solo visibles) | Código si anónimo |
| POST | `/api/casos/{id}/archivos/` | Subir archivo (solo en `falta_documentacion`) | Código |
| GET | `/api/casos/{id}/archivos/` | Listar archivos | Código si anónimo |
| GET | `/api/casos/{id}/archivos/{aid}/descargar` | Descargar soporte | Sí |
| GET | `/api/casos/{id}/historial/` | Historial de estados | Código si anónimo |
| GET | `/api/usuarios/destinatarios` | Posibles tenedores del flujo | Sí |
| GET | `/api/usuarios/` | Listar usuarios | Admin |
| POST | `/api/usuarios/` | Crear usuario | Admin |
| PATCH | `/api/usuarios/yo/contrasena` | Cambiar mi contraseña | Sí |
| PATCH | `/api/usuarios/{id}` | Rol / activar-desactivar | Admin |
| GET | `/api/catalogos/` | Catálogos (programas) | No |
| POST | `/api/catalogos/` | Crear valor | Admin |
| PATCH | `/api/catalogos/{id}` | Editar / activar-desactivar | Admin |
| DELETE | `/api/catalogos/{id}` | Eliminar valor | Admin |
| GET | `/api/reportes/resumen` | Totales, tasas, estancados | Tesorería |
| GET | `/health` | Estado del servicio | No |

## Arquitectura del backend

Capas por dominio (`casos/`, `auth/`, `usuarios/`, `comentarios/`, `archivos/`, `historial/`, `catalogos/`, `reportes/`):

```
backend/<dominio>/
├── *_routes.py       ← Endpoints y autenticación (quién puede llamar)
├── *_controller.py   ← Orquesta actions y controles de acceso al caso
├── create_*_action.py / *_action.py ← Reglas de negocio (flujo, permisos)
├── *_model.py        ← SQLAlchemy model
└── *_schema.py       ← Pydantic schemas (validación 422)
```

El flujo usa **tenedor único** (`revisor_asignado_id`): el caso siempre está en
manos de una sola persona y `PASOS_FLUJO` define los movimientos válidos.

## Conectar frontend con backend

Todo el acceso a datos pasa por `fetch('/api/...')` en `src/features/*/api/*.js`
(resuelto por el proxy de `vite.config.js` en desarrollo). Las llamadas del
panel envían el token (`Authorization: Bearer`); las del canal público usan
`{ publica: true }` y número + código, sin token.

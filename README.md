# Casos Especiales — Tesorería Uninorte

Sistema de gestión de casos de reserva de matrícula y devolución del área de Tesorería.

## Estructura del proyecto

```
control-reservas-uninorte/
├── frontend/          ← React + Vite (puerto 5173)
├── backend/           ← FastAPI + SQLAlchemy + PostgreSQL (puerto 8000)
├── docker-compose.yml ← PostgreSQL + backend
└── README.md
```

## Arrancar el backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

O con Docker:

```bash
cd backend
docker-compose up -d
```

La API estará en `http://localhost:8000/docs` (Swagger UI).

### Usuario semilla

```bash
cd backend
python seed.py
```

- Correo: `carolina.mejia@uninorte.edu.co`
- Contraseña: `password123`

## Arrancar el frontend

```bash
cd frontend  # o la raíz si no existe frontend/
npm install
npm run dev
```

Rutas:

- `/` — formulario público (estudiante o tercero)
- `/login` — login del panel interno
- `/panel` — lista de casos (requiere login)
- `/panel/casos/:id` — detalle de caso
- `/seguimiento/:id` — seguimiento público

## API Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/me` | Usuario actual | Sí |
| POST | `/api/casos/` | Crear caso | No |
| GET | `/api/casos/` | Listar casos | Sí |
| GET | `/api/casos/{id}` | Detalle caso | No |
| PATCH | `/api/casos/{id}/estado` | Cambiar estado | Sí |
| POST | `/api/casos/{id}/comentarios/` | Agregar comentario | No |
| GET | `/api/casos/{id}/comentarios/` | Listar comentarios | No |
| POST | `/api/casos/{id}/archivos/` | Subir archivo | No |
| GET | `/api/casos/{id}/archivos/` | Listar archivos | No |
| GET | `/api/casos/{id}/historial/` | Historial de estados | No |

## Arquitectura del backend

Clean Architecture con 5 capas, agrupadas por modelo:

```
backend/
├── casos/
│   ├── casos_routes.py        ← Capa 2: Define endpoints
│   ├── casos_controller.py    ← Capa 3: Orquesta acciones
│   ├── casos_model.py         ← Capa 5: SQLAlchemy model
│   ├── casos_schema.py        ← Pydantic schemas
│   ├── create_caso_action.py  ← Capa 4: Lógica de negocio
│   └� ...
├── auth/
├── comentarios/
├── archivos/
├── historial/
└── usuarios/
```

## Conectar frontend con backend

Todo el acceso a datos pasa por `src/features/casos/api/casosApi.js`. Para conectar:

1. Configurar proxy en `vite.config.js`:
```js
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

2. Reemplazar mocks en `casosApi.js` por `fetch('/api/...')`.

# Estándares Uninorte — estado y plan

Decisión vigente: se continúa con el stack actual; la migración al estándar
institucional (NestJS + Prisma + PostgreSQL + Entra ID + TypeScript) queda
**diferida** a una fase posterior. Este documento registra la brecha para
retomarla sin tener que redescubrirla.

## Brechas actuales (verificadas contra el código)

| Tema | Estándar | Proyecto actual |
|---|---|---|
| Backend | NestJS + TypeScript | Python + FastAPI |
| ORM / migraciones | Prisma + `prisma migrate` | SQLAlchemy + `create_all` y ALTER manuales |
| Base de datos | PostgreSQL | SQLite en dev (Postgres solo previsto) |
| Auth | Solo Entra ID por JWKS; prohibido login propio | Login propio (bcrypt) + JWT HS256 propios |
| Frontend | React + TypeScript + MSAL.js | React + JavaScript, AuthContext propio |
| Tokens en front | Prohibido `localStorage` | Token en `localStorage` |
| Design system | `uninorte_design.md` + librería UI | CSS propio, sin documento de diseño |
| Seguridad | helmet/CSP, CORS restrictivo, deny-by-default, SAST | CORS `*` en dev, sin CSP, sin SAST |
| Tests | Suite por proyecto | Sin tests |

## Plan de migración futura (orden sugerido)

1. **Auth a Entra ID** (lo más exigente y lo único explícitamente prohibido
   hoy): validar JWKS en backend + MSAL en frontend + mapear claims a los
   roles actuales (`admin`, `asistente_tesoreria`, `revisor`,
   `centro_medico`, `aprobador`). Eliminar login propio y JWT HS256.
2. **Endurecimiento compatible**: `SECRET_KEY` por entorno, CORS
   restrictivo, cabeceras de seguridad, sacar el token de `localStorage`,
   SAST/dependency scanning. No exige reescribir.
3. **Stack completo** (solo si se exige): reescribir backend a NestJS +
   Prisma + PostgreSQL y frontend a TypeScript.

## Referencia

Plantilla institucional recibida como `CLAUDE.md` (no aplica tal cual a
este repo: describe otro stack). Si se usa con un asistente de IA, aclarar
primero el stack real de este proyecto.

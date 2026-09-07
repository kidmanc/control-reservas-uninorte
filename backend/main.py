from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from contextlib import asynccontextmanager
import asyncio
import logging
import os

from config import settings

logger = logging.getLogger("uvicorn.error")

# --- Database ---

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


# Columnas nuevas que `create_all` no agrega a una base SQLite existente.
NUEVAS_COLUMNAS_CASOS = {
    "nivel_academico": "VARCHAR(50)",
    "porcentaje_aplicado": "FLOAT",
    "destino_devolucion": "VARCHAR(50)",
    "revisor_asignado_id": "INTEGER",
}


async def asegurar_columnas_casos(conn) -> None:
    """Migración ligera: agrega con ALTER TABLE las columnas que falten."""

    def _ejecutar(conn_sync) -> None:
        existentes = {fila[1] for fila in conn_sync.exec_driver_sql("PRAGMA table_info(casos)")}
        for nombre, tipo in NUEVAS_COLUMNAS_CASOS.items():
            if nombre not in existentes:
                conn_sync.exec_driver_sql(f"ALTER TABLE casos ADD COLUMN {nombre} {tipo}")

    await conn.run_sync(_ejecutar)


async def procesar_transiciones_automaticas() -> None:
    from casos.auto_transiciones import transicionar_automatica_action

    async with async_session() as db:
        cantidad = await transicionar_automatica_action(db)
        if cantidad:
            logger.info("Transición automática: %d caso(s) pasaron a revisión.", cantidad)


async def tarea_transiciones_automaticas() -> None:
    while True:
        await asyncio.sleep(settings.CHECK_INTERVAL_SECONDS)
        try:
            await procesar_transiciones_automaticas()
        except Exception as error:  # noqa: BLE001 — el ciclo no puede morir
            logger.warning("Fallo en transición automática: %s", error)


_tarea_transiciones: asyncio.Task | None = None


# --- App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Crear tablas al iniciar y migrar columnas nuevas en una BD existente.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await asegurar_columnas_casos(conn)

    global _tarea_transiciones
    _tarea_transiciones = asyncio.create_task(tarea_transiciones_automaticas())

    yield

    _tarea_transiciones.cancel()


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# TODO(prod): restringir allow_origins a dominios reales (ej. https://app.uninorte.edu.co)
# y quitar allow_credentials=True con origen "*". Esto es solo para desarrollo.

# --- Routes ---

from auth.auth_routes import router as auth_router
from usuarios.usuarios_routes import router as usuarios_router
from casos.casos_routes import router as casos_router
from comentarios.comentarios_routes import router as comentarios_router
from archivos.archivos_routes import router as archivos_router
from historial.historial_routes import router as historial_router

app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(casos_router)
app.include_router(comentarios_router)
app.include_router(archivos_router)
app.include_router(historial_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

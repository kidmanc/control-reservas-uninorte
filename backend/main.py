from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from contextlib import asynccontextmanager
import logging
import os
import re

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
    "remitido_por_id": "INTEGER",
}


async def asegurar_columnas_casos(conn) -> None:
    """Migración ligera: agrega con ALTER TABLE las columnas que falten."""

    def _ejecutar(conn_sync) -> None:
        existentes = {fila[1] for fila in conn_sync.exec_driver_sql("PRAGMA table_info(casos)")}
        for nombre, tipo in NUEVAS_COLUMNAS_CASOS.items():
            if nombre not in existentes:
                conn_sync.exec_driver_sql(f"ALTER TABLE casos ADD COLUMN {nombre} {tipo}")

    await conn.run_sync(_ejecutar)


async def retirar_estado_en_revision(conn) -> int:
    """Migración única: los casos en revisión vuelven a recibido.

    El estado `en_revision` se eliminó del flujo (nadie lo usa); los
    existentes se devuelven a `recibido`. Idempotente.
    """

    def _ejecutar(conn_sync) -> int:
        resultado = conn_sync.exec_driver_sql(
            "UPDATE casos SET estado = 'recibido' WHERE estado = 'en_revision'"
        )
        return resultado.rowcount or 0

    return await conn.run_sync(_ejecutar)


async def registrar_participaciones_existentes() -> int:
    """Backfill idempotente: casos asignados antes de existir el historial."""
    from casos.casos_model import Caso, EstadoCaso, ParticipacionCaso

    agregados = 0
    async with async_session() as db:
        # Casos cerrados antes de la liberación automática: soltar tenedor.
        finalizados = await db.execute(
            select(Caso).where(
                Caso.estado.in_([EstadoCaso.APROBADO, EstadoCaso.RECHAZADO]),
                Caso.revisor_asignado_id.is_not(None),
            )
        )
        for caso in finalizados.scalars().all():
            caso.revisor_asignado_id = None
            caso.remitido_por_id = None
        result = await db.execute(
            select(Caso).where(
                (Caso.revisor_asignado_id.is_not(None)) | (Caso.remitido_por_id.is_not(None))
            )
        )
        for caso in result.scalars().all():
            for uid in {caso.revisor_asignado_id, caso.remitido_por_id}:
                if uid is None:
                    continue
                existe = await db.execute(
                    select(ParticipacionCaso).where(
                        ParticipacionCaso.caso_id == caso.id,
                        ParticipacionCaso.usuario_id == uid,
                    )
                )
                if not existe.scalar_one_or_none():
                    db.add(ParticipacionCaso(caso_id=caso.id, usuario_id=uid))
                    agregados += 1
        await db.commit()
    return agregados


_RE_DESTINO = re.compile(r"(?:remitido|devuelto|devuelta) a (.+?)(?: para revisión| —|:|$)", re.IGNORECASE)


def _resolver_usuario_por_nombre(usuarios, texto):
    """Localiza un usuario por nombre exacto, paréntesis o primer nombre.

    Tolera que los nombres hayan cambiado (ej. "Mónica" -> "Mónica Correa").
    Devuelve None si no hay coincidencia (ej. "sistema", "Tesorería").
    """
    nombre = (texto or "").strip()
    if not nombre:
        return None
    for usuario in usuarios:
        if usuario.nombre.lower() == nombre.lower():
            return usuario
    parentesis = re.search(r"\(([^)]+)\)", nombre)
    candidatos = [parentesis.group(1).strip()] if parentesis else []
    candidatos.append(nombre.split()[0])
    for candidato in candidatos:
        for usuario in usuarios:
            if usuario.nombre.lower().startswith(candidato.lower()):
                return usuario
    return None


async def reparar_remitido_por_faltante() -> int:
    """Backfill idempotente: deduce quién envió cada caso en aprobación.

    Sin remitente registrado, el aprobador quedaría bloqueado (solo puede
    devolver a quien se lo envió). Se deduce de la última remisión en la
    trazabilidad; si no se puede deducir, queda para override de tesorería.
    """
    from casos.casos_model import Caso
    from historial.historial_model import HistorialEstado
    from usuarios.usuarios_model import Usuario

    reparados = 0
    async with async_session() as db:
        pendientes = await db.execute(
            select(Caso).where(
                Caso.revisor_asignado_id.is_not(None),
                Caso.remitido_por_id.is_(None),
            )
        )
        usuarios = list((await db.execute(select(Usuario))).scalars().all())
        por_id = {u.id: u for u in usuarios}
        for caso in pendientes.scalars().all():
            tenedor = por_id.get(caso.revisor_asignado_id)
            if not tenedor or tenedor.rol != "aprobador":
                continue
            movimientos = await db.execute(
                select(HistorialEstado)
                .where(
                    HistorialEstado.caso_id == caso.id,
                    HistorialEstado.descripcion.ilike(f"%remitido a {tenedor.nombre}%"),
                )
                .order_by(HistorialEstado.fecha.desc(), HistorialEstado.id.desc())
            )
            ultimo = movimientos.scalars().first()
            if not ultimo:
                continue
            remitente = _resolver_usuario_por_nombre(usuarios, ultimo.cambiado_por)
            if remitente and remitente.id != tenedor.id:
                caso.remitido_por_id = remitente.id
                reparados += 1
        await db.commit()
    return reparados


async def registrar_participaciones_desde_historial() -> int:
    """Backfill idempotente: reconstruye quién participó desde la trazabilidad.

    Cura los casos movidos con versiones anteriores, cuando aún no se
    registraban participaciones. Nunca falla: ante la duda omite el registro.
    """
    from casos.casos_model import ParticipacionCaso
    from historial.historial_model import HistorialEstado
    from usuarios.usuarios_model import Usuario

    agregados = 0
    async with async_session() as db:
        usuarios = list((await db.execute(select(Usuario))).scalars().all())
        movimientos = await db.execute(select(HistorialEstado))
        for entrada in movimientos.scalars().all():
            implicados = {_resolver_usuario_por_nombre(usuarios, entrada.cambiado_por)}
            coincidencia = _RE_DESTINO.search(entrada.descripcion or "")
            if coincidencia:
                implicados.add(_resolver_usuario_por_nombre(usuarios, coincidencia.group(1)))
            for usuario in {u for u in implicados if u is not None}:
                try:
                    existe = await db.execute(
                        select(ParticipacionCaso).where(
                            ParticipacionCaso.caso_id == entrada.caso_id,
                            ParticipacionCaso.usuario_id == usuario.id,
                        )
                    )
                    if not existe.scalar_one_or_none():
                        db.add(ParticipacionCaso(caso_id=entrada.caso_id, usuario_id=usuario.id))
                        agregados += 1
                except Exception:  # noqa: BLE001 — un registro no frena el resto
                    continue
        await db.commit()
    return agregados


# --- App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Crear tablas al iniciar y migrar columnas nuevas en una BD existente.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await asegurar_columnas_casos(conn)
        retirados = await retirar_estado_en_revision(conn)
        if retirados:
            logger.info("Migración en_revision: %d caso(s) devueltos a recibido.", retirados)

    # Backfills idempotentes (nunca tumban el arranque; dejan rastro en el log).
    for tarea, nombre in (
        (registrar_participaciones_existentes, "participaciones actuales"),
        (registrar_participaciones_desde_historial, "participaciones desde historial"),
        (reparar_remitido_por_faltante, "remitente en aprobación"),
    ):
        try:
            cantidad = await tarea()
            logger.info("Backfill %s: %d registro(s).", nombre, cantidad)
        except Exception as error:  # noqa: BLE001 — arrancar es más importante
            logger.warning("Backfill %s omitido: %s", nombre, error)

    yield


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
from reportes.reportes_routes import router as reportes_router

app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(casos_router)
app.include_router(comentarios_router)
app.include_router(archivos_router)
app.include_router(historial_router)
app.include_router(reportes_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

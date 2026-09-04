from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from historial.historial_model import HistorialEstado


async def registrar_cambio_estado_action(
    db: AsyncSession,
    caso_id: int,
    estado_anterior: str | None,
    estado_nuevo: str,
    cambiado_por: str,
    descripcion: str | None = None,
) -> HistorialEstado:
    registro = HistorialEstado(
        caso_id=caso_id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        cambiado_por=cambiado_por,
        descripcion=descripcion,
    )
    db.add(registro)
    await db.commit()
    await db.refresh(registro)
    return registro


async def listar_historial_action(db: AsyncSession, caso_id: int) -> list[HistorialEstado]:
    result = await db.execute(
        select(HistorialEstado).where(HistorialEstado.caso_id == caso_id).order_by(HistorialEstado.fecha)
    )
    return list(result.scalars().all())

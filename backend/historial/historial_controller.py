from sqlalchemy.ext.asyncio import AsyncSession

from historial.create_historial_action import registrar_cambio_estado_action, listar_historial_action


async def registrar_cambio_estado_controller(
    db: AsyncSession, caso_id: int, estado_anterior: str | None, estado_nuevo: str, cambiado_por: str, descripcion: str | None = None
):
    return await registrar_cambio_estado_action(db, caso_id, estado_anterior, estado_nuevo, cambiado_por, descripcion)


async def listar_historial_controller(db: AsyncSession, caso_id: int):
    return await listar_historial_action(db, caso_id)

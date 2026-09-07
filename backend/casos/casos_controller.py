from sqlalchemy.ext.asyncio import AsyncSession

from casos.create_caso_action import (
    crear_caso_action,
    listar_casos_action,
    obtener_caso_action,
    obtener_caso_por_numero_action,
    cambiar_estado_action,
    actualizar_decision_action,
)
from casos.auto_transiciones import transicionar_automatica_action


async def crear_caso_controller(
    db: AsyncSession,
    data: dict,
    tercero: dict | None,
    archivos,
    subido_por: str,
):
    return await crear_caso_action(db, data, tercero, archivos, subido_por)


async def listar_casos_controller(db: AsyncSession):
    return await listar_casos_action(db)


async def obtener_caso_controller(db: AsyncSession, caso_id: int):
    return await obtener_caso_action(db, caso_id)


async def obtener_caso_por_numero_controller(db: AsyncSession, numero: str):
    return await obtener_caso_por_numero_action(db, numero)


async def cambiar_estado_controller(
    db: AsyncSession,
    caso_id: int,
    nuevo_estado: str,
    cambiado_por: str,
    descripcion: str | None = None,
    rol: str = "asistente_tesoreria",
):
    return await cambiar_estado_action(db, caso_id, nuevo_estado, cambiado_por, descripcion, rol)


async def actualizar_decision_controller(
    db: AsyncSession,
    caso_id: int,
    data: dict,
    cambiado_por: str,
):
    return await actualizar_decision_action(db, caso_id, data, cambiado_por)


async def transicionar_automatica_controller(db: AsyncSession) -> int:
    return await transicionar_automatica_action(db)

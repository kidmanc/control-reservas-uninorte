from sqlalchemy.ext.asyncio import AsyncSession

from casos.create_caso_action import (
    crear_caso_action,
    listar_casos_action,
    obtener_caso_action,
    obtener_caso_por_numero_action,
    cambiar_estado_action,
)


async def crear_caso_controller(db: AsyncSession, data: dict, tercero: dict | None = None):
    return await crear_caso_action(db, data, tercero)


async def listar_casos_controller(db: AsyncSession):
    return await listar_casos_action(db)


async def obtener_caso_controller(db: AsyncSession, caso_id: int):
    return await obtener_caso_action(db, caso_id)


async def obtener_caso_por_numero_controller(db: AsyncSession, numero: str):
    return await obtener_caso_por_numero_action(db, numero)


async def cambiar_estado_controller(db: AsyncSession, caso_id: int, nuevo_estado: str):
    return await cambiar_estado_action(db, caso_id, nuevo_estado)

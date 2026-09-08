from sqlalchemy.ext.asyncio import AsyncSession

from catalogos.catalogos_action import (
    listar_catalogos_action,
    crear_catalogo_action,
    actualizar_catalogo_action,
    eliminar_catalogo_action,
    sembrar_catalogos_action,
)


async def listar_catalogos_controller(db: AsyncSession, solo_activos: bool = False):
    return await listar_catalogos_action(db, solo_activos)


async def crear_catalogo_controller(db: AsyncSession, data: dict):
    return await crear_catalogo_action(db, data)


async def actualizar_catalogo_controller(db: AsyncSession, item_id: int, data: dict):
    return await actualizar_catalogo_action(db, item_id, data)


async def eliminar_catalogo_controller(db: AsyncSession, item_id: int):
    return await eliminar_catalogo_action(db, item_id)


async def sembrar_catalogos_controller(db: AsyncSession) -> int:
    return await sembrar_catalogos_action(db)

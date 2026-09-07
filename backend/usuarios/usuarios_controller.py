from sqlalchemy.ext.asyncio import AsyncSession

from usuarios.create_usuario_action import (
    crear_usuario_action,
    listar_usuarios_action,
    listar_revisores_action,
    actualizar_usuario_action,
)


async def listar_usuarios_controller(db: AsyncSession):
    return await listar_usuarios_action(db)


async def listar_revisores_controller(db: AsyncSession):
    return await listar_revisores_action(db)


async def crear_usuario_controller(db: AsyncSession, data: dict):
    return await crear_usuario_action(db, data)


async def actualizar_usuario_controller(db: AsyncSession, usuario_id: int, data: dict, actor_id: int | None = None):
    return await actualizar_usuario_action(db, usuario_id, data, actor_id)

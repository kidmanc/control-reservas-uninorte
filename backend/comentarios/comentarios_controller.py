from sqlalchemy.ext.asyncio import AsyncSession

from comentarios.create_comentario_action import crear_comentario_action, listar_comentarios_action


async def crear_comentario_controller(db: AsyncSession, caso_id: int, data: dict):
    return await crear_comentario_action(db, caso_id, data)


async def listar_comentarios_controller(db: AsyncSession, caso_id: int):
    return await listar_comentarios_action(db, caso_id)

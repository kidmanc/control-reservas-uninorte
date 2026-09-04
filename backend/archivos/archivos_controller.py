from sqlalchemy.ext.asyncio import AsyncSession

from archivos.upload_archivo_action import subir_archivo_action, listar_archivos_action


async def subir_archivo_controller(db: AsyncSession, caso_id: int, data: dict):
    return await subir_archivo_action(db, caso_id, data)


async def listar_archivos_controller(db: AsyncSession, caso_id: int):
    return await listar_archivos_action(db, caso_id)

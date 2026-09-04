from sqlalchemy.ext.asyncio import AsyncSession

from archivos.upload_archivo_action import (
    subir_archivo_action,
    listar_archivos_action,
    obtener_archivo_action,
    validar_carga_estudiante_action,
)


async def validar_carga_estudiante_controller(db: AsyncSession, caso_id: int):
    return await validar_carga_estudiante_action(db, caso_id)


async def subir_archivo_controller(db: AsyncSession, caso_id: int, data: dict):
    return await subir_archivo_action(db, caso_id, data)


async def listar_archivos_controller(db: AsyncSession, caso_id: int):
    return await listar_archivos_action(db, caso_id)


async def obtener_archivo_controller(db: AsyncSession, caso_id: int, archivo_id: int):
    return await obtener_archivo_action(db, caso_id, archivo_id)

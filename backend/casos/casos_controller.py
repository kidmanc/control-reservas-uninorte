from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from casos.create_caso_action import (
    crear_caso_action,
    listar_casos_action,
    listar_participados_action,
    obtener_caso_action,
    obtener_caso_por_numero_action,
    cambiar_estado_action,
    actualizar_decision_action,
    exigir_acceso_caso_action,
    exigir_acceso_caso_por_numero_action,
    exigir_tenedor_caso_action,
    remitir_caso_action,
)


async def crear_caso_controller(
    db: AsyncSession,
    data: dict,
    tercero: dict | None,
    archivos,
    subido_por: str,
):
    return await crear_caso_action(db, data, tercero, archivos, subido_por)


async def listar_casos_controller(db: AsyncSession, user: dict | None = None):
    return await listar_casos_action(db, user)


async def listar_participados_controller(db: AsyncSession, user: dict):
    return await listar_participados_action(db, user)


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
    actor_id: int | None = None,
):
    return await cambiar_estado_action(db, caso_id, nuevo_estado, cambiado_por, descripcion, rol, actor_id)


async def actualizar_decision_controller(
    db: AsyncSession,
    caso_id: int,
    data: dict,
    cambiado_por: str,
    rol: str = "asistente_tesoreria",
    actor_id: int | None = None,
):
    return await actualizar_decision_action(db, caso_id, data, cambiado_por, rol, actor_id)


async def exigir_acceso_caso_controller(db: AsyncSession, caso_id: int, user: dict | None):
    return await exigir_acceso_caso_action(db, caso_id, user)


async def exigir_acceso_caso_por_numero_controller(db: AsyncSession, numero: str, user: dict | None):
    return await exigir_acceso_caso_por_numero_action(db, numero, user)


async def exigir_tenedor_caso_controller(db: AsyncSession, caso_id: int, user: dict | None):
    return await exigir_tenedor_caso_action(db, caso_id, user)


def exigir_codigo_publico(caso, codigo: str | None) -> None:
    """El canal anónimo exige número + código en cada acceso."""
    if (codigo or "").strip().upper() != (caso.codigo_estudiantil or "").strip().upper():
        raise HTTPException(status_code=404, detail="No encontramos ningún caso con esos datos")


async def remitir_caso_controller(
    db: AsyncSession,
    caso_id: int,
    revisor_id: int | None,
    motivo: str | None,
    veredicto: str | None,
    actor: dict,
):
    return await remitir_caso_action(db, caso_id, revisor_id, motivo, veredicto, actor)

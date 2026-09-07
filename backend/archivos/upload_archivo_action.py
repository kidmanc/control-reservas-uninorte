from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from archivos.archivos_model import Archivo
from casos.casos_model import Caso, EstadoCaso
from historial.historial_model import HistorialEstado


async def validar_carga_estudiante_action(db: AsyncSession, caso_id: int) -> None:
    """Permite soportes posteriores solo cuando Tesorería los solicitó."""
    caso = await db.get(Caso, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    if caso.estado != EstadoCaso.FALTA_DOCUMENTACION:
        raise HTTPException(
            status_code=409,
            detail="Solo puedes adjuntar documentos cuando el caso está en 'Falta documentación'.",
        )


async def subir_archivo_action(db: AsyncSession, caso_id: int, data: dict) -> Archivo:
    caso = await db.get(Caso, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    archivo = Archivo(
        caso_id=caso_id,
        subido_por=data["subido_por"],
        nombre_archivo=data["nombre_archivo"],
        ruta_almacenamiento=data["ruta_almacenamiento"],
        descripcion=data.get("descripcion"),
    )
    db.add(archivo)

    # Al recibir la documentación solicitada, el caso vuelve a revisión automáticamente.
    if caso.estado == EstadoCaso.FALTA_DOCUMENTACION:
        caso.estado = EstadoCaso.EN_REVISION
        db.add(
            HistorialEstado(
                caso_id=caso_id,
                estado_anterior=EstadoCaso.FALTA_DOCUMENTACION.value,
                estado_nuevo=EstadoCaso.EN_REVISION.value,
                cambiado_por="sistema",
                descripcion="El estudiante adjuntó la documentación solicitada",
            )
        )

    await db.commit()
    await db.refresh(archivo)
    return archivo


async def listar_archivos_action(db: AsyncSession, caso_id: int) -> list[Archivo]:
    result = await db.execute(
        select(Archivo).where(Archivo.caso_id == caso_id).order_by(Archivo.fecha)
    )
    return list(result.scalars().all())


async def obtener_archivo_action(db: AsyncSession, caso_id: int, archivo_id: int) -> Archivo | None:
    result = await db.execute(
        select(Archivo).where(Archivo.caso_id == caso_id, Archivo.id == archivo_id)
    )
    return result.scalar_one_or_none()

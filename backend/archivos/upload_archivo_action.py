from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile

from archivos.archivos_model import Archivo
from archivos.storage import EXTENSIONES_INTERNO, guardar_archivo
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
        visible_para_estudiante=data.get("visible_para_estudiante", True),
    )
    db.add(archivo)

    # Al recibir la documentación solicitada, el caso vuelve a recibido y el
    # proceso automático lo pasa a revisión a las 24 horas.
    if caso.estado == EstadoCaso.FALTA_DOCUMENTACION:
        caso.estado = EstadoCaso.RECIBIDO
        db.add(
            HistorialEstado(
                caso_id=caso_id,
                estado_anterior=EstadoCaso.FALTA_DOCUMENTACION.value,
                estado_nuevo=EstadoCaso.RECIBIDO.value,
                cambiado_por="sistema",
                descripcion="El estudiante adjuntó la documentación solicitada",
            )
        )

    await db.commit()
    await db.refresh(archivo)
    return archivo


async def adjuntar_interno_action(
    db: AsyncSession,
    caso_id: int,
    archivo_subido: UploadFile,
    data: dict,
    actor: dict,
) -> Archivo:
    """Adjunto del equipo (ej. la planilla de liquidación para el revisor).

    Solo Tesorería; el asistente únicamente con el caso en Tesorería (igual
    que la liquidación). No mueve el estado: es un documento de trabajo, no
    una respuesta del estudiante. Queda en el historial quién lo subió y si
    es visible para el estudiante o interno.
    """
    caso = await db.get(Caso, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    rol = actor.get("rol")
    if rol not in {"admin", "asistente_tesoreria"}:
        raise HTTPException(
            status_code=403,
            detail="Solo Tesorería puede adjuntar documentos al caso.",
        )
    if caso.estado in (EstadoCaso.APROBADO, EstadoCaso.RECHAZADO) and rol != "admin":
        raise HTTPException(
            status_code=409,
            detail="El caso está cerrado. Solo la tesorera puede adjuntar documentos.",
        )
    if rol == "asistente_tesoreria" and caso.revisor_asignado_id is not None:
        raise HTTPException(
            status_code=403,
            detail="El caso está en manos de otro paso del flujo. Solo la tesorera puede actuar sobre él.",
        )

    ruta = await guardar_archivo(archivo_subido, EXTENSIONES_INTERNO)
    nombre = actor.get("nombre") or "Tesorería"
    visible = bool(data.get("visible_para_estudiante", False))
    archivo = Archivo(
        caso_id=caso_id,
        subido_por=nombre,
        nombre_archivo=archivo_subido.filename or "archivo",
        ruta_almacenamiento=ruta,
        descripcion=data.get("descripcion"),
        visible_para_estudiante=visible,
    )
    db.add(archivo)
    db.add(
        HistorialEstado(
            caso_id=caso_id,
            estado_anterior=caso.estado.value if hasattr(caso.estado, "value") else str(caso.estado),
            estado_nuevo=caso.estado.value if hasattr(caso.estado, "value") else str(caso.estado),
            cambiado_por=nombre,
            descripcion=(
                f"Documento adjuntado: {archivo.nombre_archivo} "
                f"({'visible al estudiante' if visible else 'interno'})"
            ),
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

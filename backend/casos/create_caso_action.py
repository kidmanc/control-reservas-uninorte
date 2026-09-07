from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from casos.casos_model import Caso, EstadoCaso, TipoSolicitud
from archivos.archivos_model import Archivo
from archivos.storage import eliminar_archivos, guardar_archivo
from historial.historial_model import HistorialEstado


async def crear_caso_action(
    db: AsyncSession,
    data: dict,
    tercero: dict | None,
    archivos,
    subido_por: str,
) -> Caso:
    # Una solicitud del mismo tipo para el mismo período solo puede existir una vez.
    duplicado = await db.execute(
        select(Caso).where(
            Caso.codigo_estudiantil == data["codigo_estudiantil"],
            Caso.tipo_solicitud == data["tipo_solicitud"],
            Caso.periodo_academico == data["periodo_academico"],
        )
    )
    caso_existente = duplicado.scalar_one_or_none()
    if caso_existente:
        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una solicitud de este tipo para el período indicado "
                f"(caso {caso_existente.numero_caso})."
            ),
        )

    # Generar número de caso
    result = await db.execute(select(func.count(Caso.id)))
    count = result.scalar() or 0
    numero = f"RM-2026-{count + 1:04d}"

    caso = Caso(
        numero_caso=numero,
        nombre_completo=data["nombre_completo"],
        codigo_estudiantil=data["codigo_estudiantil"],
        correo_institucional=data["correo_institucional"],
        telefono_contacto=data.get("telefono_contacto"),
        programa_academico=data["programa_academico"],
        tipo_solicitud=data["tipo_solicitud"],
        nivel_academico=data.get("nivel_academico") or "pregrado",
        periodo_academico=data["periodo_academico"],
        motivo=data["motivo"],
        estado=EstadoCaso.RECIBIDO,
    )

    if tercero:
        caso.tercero_nombre = tercero.get("nombre_completo")
        caso.tercero_parentesco = tercero.get("parentesco")
        caso.tercero_documento = tercero.get("documento_identidad")
        caso.tercero_telefono = tercero.get("telefono_contacto")
        caso.tercero_correo = tercero.get("correo_contacto")

    rutas_guardadas: list[str] = []
    try:
        db.add(caso)
        await db.flush()
        db.add(
            HistorialEstado(
                caso_id=caso.id,
                estado_anterior=None,
                estado_nuevo=EstadoCaso.RECIBIDO.value,
                cambiado_por="sistema",
                descripcion="Solicitud recibida",
            )
        )
        for archivo_subido in archivos:
            ruta = await guardar_archivo(archivo_subido)
            rutas_guardadas.append(ruta)
            db.add(
                Archivo(
                    caso_id=caso.id,
                    subido_por=subido_por,
                    nombre_archivo=archivo_subido.filename or "archivo",
                    ruta_almacenamiento=ruta,
                    descripcion=data.get("descripcion_adjuntos"),
                )
            )
        await db.commit()
    except Exception:
        await db.rollback()
        eliminar_archivos(rutas_guardadas)
        raise

    await db.refresh(caso)
    return caso


async def listar_casos_action(db: AsyncSession) -> list[Caso]:
    result = await db.execute(select(Caso).order_by(Caso.fecha_creacion.desc()))
    return list(result.scalars().all())


async def obtener_caso_action(db: AsyncSession, caso_id: int) -> Caso | None:
    result = await db.execute(select(Caso).where(Caso.id == caso_id))
    return result.scalar_one_or_none()


async def obtener_caso_por_numero_action(db: AsyncSession, numero: str) -> Caso | None:
    result = await db.execute(select(Caso).where(Caso.numero_caso == numero))
    return result.scalar_one_or_none()


async def cambiar_estado_action(
    db: AsyncSession,
    caso_id: int,
    nuevo_estado: str,
    cambiado_por: str,
    descripcion: str | None = None,
    rol: str = "asistente_tesoreria",
) -> Caso | None:
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        return None

    # Validar que el estado exista antes de persistir
    try:
        estado_valido = EstadoCaso(nuevo_estado)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {nuevo_estado}")

    es_admin = rol == "admin"
    if not es_admin:
        if caso.estado in (EstadoCaso.APROBADO, EstadoCaso.RECHAZADO):
            raise HTTPException(
                status_code=409,
                detail=(
                    "El caso está en un estado final. Solo el tesorero (admin) "
                    "puede corregir el estado de un caso aprobado o rechazado."
                ),
            )
        if caso.estado == EstadoCaso.FALTA_DOCUMENTACION and estado_valido != EstadoCaso.FALTA_DOCUMENTACION:
            raise HTTPException(
                status_code=409,
                detail=(
                    "El caso está esperando la documentación del estudiante. "
                    "Solo el tesorero (admin) puede cambiar su estado antes de recibirla."
                ),
            )

    estado_anterior = caso.estado
    caso.estado = estado_valido

    # Registrar la transición en el historial en la misma transacción
    db.add(
        HistorialEstado(
            caso_id=caso_id,
            estado_anterior=estado_anterior.value if hasattr(estado_anterior, "value") else str(estado_anterior),
            estado_nuevo=estado_valido.value,
            cambiado_por=cambiado_por,
            descripcion=descripcion,
        )
    )

    await db.commit()
    await db.refresh(caso)
    return caso


# Rangos de porcentaje aplicado según el tipo de solicitud.
PORCENTAJES_POR_TIPO = {
    TipoSolicitud.RESERVA_MATRICULA.value: {100.0, 85.0, 75.0, 0.0},
    TipoSolicitud.DEVOLUCION.value: {100.0, 50.0, 40.0, 0.0},
}

DESTINOS_DEVOLUCION = {"estudiante", "icetex"}


async def actualizar_decision_action(
    db: AsyncSession,
    caso_id: int,
    data: dict,
    cambiado_por: str,
) -> Caso | None:
    """Actualiza nivel académico, porcentaje aplicado y/o destino de devolución."""
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        return None

    tipo = caso.tipo_solicitud
    nivel_casos = []
    nivel = data.get("nivel_academico")
    if nivel is not None:
        if nivel not in {"pregrado", "posgrado"}:
            raise HTTPException(status_code=400, detail="El nivel académico debe ser 'pregrado' o 'posgrado'")
        caso.nivel_academico = nivel
        nivel_casos.append(f"Nivel académico: {nivel}")

    porcentaje = data.get("porcentaje_aplicado")
    if porcentaje is not None:
        permitidos = PORCENTAJES_POR_TIPO.get(tipo.value if hasattr(tipo, "value") else str(tipo), set())
        porcentaje_num = float(porcentaje)
        if porcentaje_num not in permitidos:
            opciones = ", ".join(f"{p:g}%" for p in sorted(permitidos, reverse=True))
            raise HTTPException(
                status_code=400,
                detail=f"Porcentaje inválido para este tipo de solicitud. Opciones: {opciones}",
            )
        caso.porcentaje_aplicado = porcentaje_num
        nivel_casos.append(f"Porcentaje aplicado: {porcentaje_num:g}%")

    destino = data.get("destino_devolucion")
    if destino is not None:
        if tipo != TipoSolicitud.DEVOLUCION:
            raise HTTPException(
                status_code=400,
                detail="El destino de la devolución solo aplica para solicitudes de devolución.",
            )
        if destino not in DESTINOS_DEVOLUCION:
            raise HTTPException(
                status_code=400,
                detail="El destino de la devolución debe ser 'estudiante' o 'icetex'.",
            )
        caso.destino_devolucion = destino
        nivel_casos.append(f"Destino de la devolución: {destino}")

    if not nivel_casos:
        raise HTTPException(status_code=400, detail="Indica al menos un dato a actualizar")

    db.add(
        HistorialEstado(
            caso_id=caso_id,
            estado_anterior=caso.estado.value if hasattr(caso.estado, "value") else str(caso.estado),
            estado_nuevo=caso.estado.value if hasattr(caso.estado, "value") else str(caso.estado),
            cambiado_por=cambiado_por,
            descripcion="Decisión actualizada: " + "; ".join(nivel_casos),
        )
    )

    await db.commit()
    await db.refresh(caso)
    return caso

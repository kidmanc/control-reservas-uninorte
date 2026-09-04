from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from casos.casos_model import Caso, EstadoCaso
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
) -> Caso | None:
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        return None

    # Validar que el estado exista antes de persistir
    try:
        estado_valido = EstadoCaso(nuevo_estado)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {nuevo_estado}")

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

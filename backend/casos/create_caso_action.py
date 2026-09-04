from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from casos.casos_model import Caso, EstadoCaso
from historial.create_historial_action import registrar_cambio_estado_action


async def crear_caso_action(db: AsyncSession, data: dict, tercero: dict | None = None) -> Caso:
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

    db.add(caso)
    await db.commit()
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


async def cambiar_estado_action(db: AsyncSession, caso_id: int, nuevo_estado: str) -> Caso | None:
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        return None

    estado_anterior = caso.estado
    caso.estado = nuevo_estado
    await db.commit()

    # Registrar la transición en el historial (después del commit del estado)
    await registrar_cambio_estado_action(
        db,
        caso_id=caso_id,
        estado_anterior=estado_anterior.value if hasattr(estado_anterior, "value") else str(estado_anterior),
        estado_nuevo=nuevo_estado,
        cambiado_por="asistente",
    )

    await db.refresh(caso)
    return caso

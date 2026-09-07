from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from casos.casos_model import Caso, EstadoCaso, TipoSolicitud, ParticipacionCaso
from usuarios.usuarios_model import Usuario
from comentarios.comentarios_model import Comentario
from archivos.archivos_model import Archivo
from archivos.storage import eliminar_archivos, guardar_archivo
from historial.historial_model import HistorialEstado

# Roles con visibilidad restringida: solo ven sus casos asignados y su historial.
ROLES_RESTRINGIDOS = {"revisor", "centro_medico", "aprobador"}

# Tabla de pasos válidos del flujo: rol del tenedor actual -> roles destino.
# None = el caso está en Tesorería.
PASOS_FLUJO = {
    None: {"revisor", "centro_medico"},
    "centro_medico": {None},
    "revisor": {"aprobador", None},
    "aprobador": {"revisor"},
}

# Resultado obligatorio al devolver, según quién devuelve.
VEREDICTOS_DEVOLUCION = {
    "centro_medico": {"documentos_validos", "documentos_no_validos"},
    "revisor": {"con_correcciones"},
    "aprobador": {"con_correcciones"},
}

VEREDICTO_LABEL = {
    "documentos_validos": "visto bueno: documentos válidos",
    "documentos_no_validos": "no validados: documentos inválidos",
    "con_correcciones": "devuelto con correcciones",
}


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


async def listar_casos_action(db: AsyncSession, user: dict | None = None) -> list[Caso]:
    query = select(Caso).order_by(Caso.fecha_creacion.desc())
    # Quien opera en el flujo solo ve los casos que tiene asignados.
    if user and user.get("rol") in ROLES_RESTRINGIDOS:
        query = query.where(Caso.revisor_asignado_id == user.get("id"))
    result = await db.execute(query)
    return list(result.scalars().all())


async def obtener_caso_action(db: AsyncSession, caso_id: int) -> Caso | None:
    result = await db.execute(select(Caso).where(Caso.id == caso_id))
    return result.scalar_one_or_none()


async def obtener_caso_por_numero_action(db: AsyncSession, numero: str) -> Caso | None:
    result = await db.execute(select(Caso).where(Caso.numero_caso == numero))
    return result.scalar_one_or_none()


def _restringido_sin_acceso(caso: Caso, user: dict | None) -> bool:
    """True si quien consulta opera en el flujo y el caso no lo tiene asignado."""
    return bool(
        user
        and user.get("rol") in ROLES_RESTRINGIDOS
        and caso.revisor_asignado_id != user.get("id")
    )


async def exigir_acceso_caso_action(db: AsyncSession, caso_id: int, user: dict | None) -> Caso:
    """Devuelve el caso o lanza 404/403.

    Quien opera en el flujo puede ver sus casos asignados y su historial
    (casos que ya tuvo en sus manos, en modo lectura).
    """
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    if _restringido_sin_acceso(caso, user):
        participa = await db.execute(
            select(ParticipacionCaso).where(
                ParticipacionCaso.caso_id == caso_id,
                ParticipacionCaso.usuario_id == user.get("id"),
            )
        )
        if not participa.scalar_one_or_none():
            raise HTTPException(
                status_code=403,
                detail="Este caso no está en tus manos ni en tu historial.",
            )
    return caso


async def exigir_tenedor_caso_action(db: AsyncSession, caso_id: int, user: dict | None) -> Caso:
    """Como exigir_acceso, pero solo el tenedor actual (para escribir)."""
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    if (
        user
        and user.get("rol") in ROLES_RESTRINGIDOS
        and caso.revisor_asignado_id != user.get("id")
    ):
        raise HTTPException(
            status_code=403,
            detail="Solo puedes actuar sobre los casos que tienes en tus manos.",
        )
    return caso


async def listar_participados_action(db: AsyncSession, user: dict) -> list[Caso]:
    """Historial del operador: casos que tuvo en sus manos y ya no tiene."""
    result = await db.execute(
        select(Caso)
        .join(ParticipacionCaso, ParticipacionCaso.caso_id == Caso.id)
        .where(
            ParticipacionCaso.usuario_id == user.get("id"),
            Caso.revisor_asignado_id != user.get("id"),
        )
        .order_by(ParticipacionCaso.fecha.desc())
    )
    return list(result.scalars().all())


async def exigir_acceso_caso_por_numero_action(db: AsyncSession, numero: str, user: dict | None) -> Caso:
    caso = await obtener_caso_por_numero_action(db, numero)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    if _restringido_sin_acceso(caso, user):
        participa = await db.execute(
            select(ParticipacionCaso).where(
                ParticipacionCaso.caso_id == caso.id,
                ParticipacionCaso.usuario_id == user.get("id"),
            )
        )
        if not participa.scalar_one_or_none():
            raise HTTPException(
                status_code=403,
                detail="Este caso no está en tus manos ni en tu historial.",
            )
    return caso


async def remitir_caso_action(
    db: AsyncSession,
    caso_id: int,
    revisor_id: int | None,
    motivo: str | None,
    veredicto: str | None,
    actor: dict,
) -> Caso | None:
    """Mueve el caso al siguiente paso del flujo (tenedor único).

    `revisor_id` None = el caso vuelve a Tesorería. Las devoluciones exigen
    `motivo` y `veredicto` (el resultado: visto bueno, no validado o con
    correcciones) y quedan como comentario interno además del historial.
    """
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        return None

    rol_actor = actor.get("rol")
    # Quien opera en el flujo solo mueve los casos que tiene en sus manos.
    if rol_actor in ROLES_RESTRINGIDOS and caso.revisor_asignado_id != actor.get("id"):
        raise HTTPException(
            status_code=403,
            detail="Solo puedes remitir los casos que tienes en tus manos.",
        )

    if revisor_id is None:
        rol_destino = None
        destino_nombre = "Tesorería"
    else:
        destino = await db.get(Usuario, revisor_id)
        if not destino or destino.rol not in ROLES_RESTRINGIDOS:
            raise HTTPException(status_code=404, detail="Destinatario no encontrado")
        if destino.activo is False:
            raise HTTPException(status_code=400, detail="El destinatario seleccionado está inactivo")
        rol_destino = destino.rol
        destino_nombre = destino.nombre
        # No tiene sentido "remitir" al mismo tenedor.
        if caso.revisor_asignado_id == destino.id:
            raise HTTPException(status_code=409, detail=f"El caso ya está en manos de {destino.nombre}")

    # Rol del tenedor actual (None = en Tesorería).
    rol_tenedor = None
    if caso.revisor_asignado_id is not None:
        tenedor = await db.get(Usuario, caso.revisor_asignado_id)
        rol_tenedor = tenedor.rol if tenedor else None

    if rol_destino not in PASOS_FLUJO.get(rol_tenedor, set()):
        raise HTTPException(
            status_code=409,
            detail="Ese paso no es válido en el flujo del caso.",
        )

    # El aprobador solo devuelve a quien se lo envió: la cadena Tesorería ->
    # revisor -> aprobador -> revisor queda garantizada aunque haya varios
    # revisores. Tesorería conserva override para casos borde.
    if rol_tenedor == "aprobador" and rol_destino == "revisor" and rol_actor == "aprobador":
        if revisor_id != caso.remitido_por_id:
            raise HTTPException(
                status_code=409,
                detail="Solo puedes devolver el caso a quien te lo envió para revisión.",
            )

    es_devolucion = rol_destino is None or (rol_tenedor == "aprobador" and rol_destino == "revisor")
    motivo_limpio = (motivo or "").strip()
    veredicto_limpio = (veredicto or "").strip()
    if es_devolucion:
        if veredicto_limpio not in VEREDICTOS_DEVOLUCION.get(rol_tenedor, set()):
            raise HTTPException(
                status_code=400,
                detail="Indica el resultado de la revisión: es obligatorio al devolver un caso.",
            )
        if not motivo_limpio:
            raise HTTPException(
                status_code=400,
                detail="Indica el motivo de la devolución: es obligatorio para devolver un caso.",
            )
    etiqueta_veredicto = VEREDICTO_LABEL.get(veredicto_limpio, "")

    caso.remitido_por_id = caso.revisor_asignado_id
    caso.revisor_asignado_id = revisor_id
    descripcion = (
        f"Caso devuelto a {destino_nombre} — {etiqueta_veredicto}: {motivo_limpio}"
        if es_devolucion
        else f"Caso remitido a {destino_nombre} para revisión"
    )

    estado_actual = caso.estado.value if hasattr(caso.estado, "value") else str(caso.estado)
    db.add(
        HistorialEstado(
            caso_id=caso_id,
            estado_anterior=estado_actual,
            estado_nuevo=estado_actual,
            cambiado_por=actor.get("nombre", "Tesorería"),
            descripcion=descripcion,
        )
    )

    # El motivo de la devolución queda además como comentario interno.
    if es_devolucion:
        db.add(
            Comentario(
                caso_id=caso_id,
                autor=actor.get("nombre", "Tesorería"),
                texto=f"{etiqueta_veredicto}: {motivo_limpio}",
                visible_para_estudiante=False,
            )
        )

    # Quien entrega y quien recibe quedan en el historial de participación.
    for uid in {actor.get("id"), revisor_id}:
        if uid is None:
            continue
        existe = await db.execute(
            select(ParticipacionCaso).where(
                ParticipacionCaso.caso_id == caso_id,
                ParticipacionCaso.usuario_id == uid,
            )
        )
        if not existe.scalar_one_or_none():
            db.add(ParticipacionCaso(caso_id=caso_id, usuario_id=uid))

    await db.commit()
    await db.refresh(caso)
    return caso


async def cambiar_estado_action(
    db: AsyncSession,
    caso_id: int,
    nuevo_estado: str,
    cambiado_por: str,
    descripcion: str | None = None,
    rol: str = "asistente_tesoreria",
    actor_id: int | None = None,
) -> Caso | None:
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        return None

    # Validar que el estado exista antes de persistir
    try:
        estado_valido = EstadoCaso(nuevo_estado)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {nuevo_estado}")

    # Quien opera en el flujo solo actúa sobre sus casos en mano.
    if rol in ROLES_RESTRINGIDOS and actor_id is not None and caso.revisor_asignado_id != actor_id:
        raise HTTPException(
            status_code=403,
            detail="Solo puedes cambiar el estado de los casos que tienes en tus manos.",
        )

    es_admin = rol == "admin"
    es_aprobador = rol == "aprobador"
    es_asistente = rol == "asistente_tesoreria"

    # Revisor y Centro Médico no cambian estados: consultan y comentan.
    if rol in ("revisor", "centro_medico"):
        raise HTTPException(
            status_code=403,
            detail="Los revisores y el Centro Médico solo pueden consultar y comentar los casos.",
        )

    # El aprobador final solo registra la aprobación o el rechazo.
    if es_aprobador and estado_valido not in (EstadoCaso.APROBADO, EstadoCaso.RECHAZADO):
        raise HTTPException(
            status_code=403,
            detail="Como aprobador final solo puedes registrar la aprobación o el rechazo del caso.",
        )

    # La asistente no fija estados finales: la aprobación la registra el aprobador final.
    if es_asistente and estado_valido in (EstadoCaso.APROBADO, EstadoCaso.RECHAZADO):
        raise HTTPException(
            status_code=403,
            detail="La aprobación o el rechazo final los registra el aprobador final. Remite el caso para continuar el flujo.",
        )

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
    rol: str = "asistente_tesoreria",
    actor_id: int | None = None,
) -> Caso | None:
    """Actualiza nivel académico, porcentaje aplicado y/o destino de devolución."""
    caso = await obtener_caso_action(db, caso_id)
    if not caso:
        return None

    if rol in ROLES_RESTRINGIDOS and actor_id is not None and caso.revisor_asignado_id != actor_id:
        raise HTTPException(
            status_code=403,
            detail="Solo puedes registrar decisiones en los casos que tienes en tus manos.",
        )

    if rol in ("revisor", "centro_medico"):
        raise HTTPException(
            status_code=403,
            detail="Los revisores y el Centro Médico solo pueden consultar y comentar los casos.",
        )

    porcentaje = data.get("porcentaje_aplicado")
    destino = data.get("destino_devolucion")
    if rol == "asistente_tesoreria" and (porcentaje is not None or destino is not None):
        raise HTTPException(
            status_code=403,
            detail="Los porcentajes y el destino los confirma el aprobador final.",
        )

    tipo = caso.tipo_solicitud
    nivel_casos = []
    nivel = data.get("nivel_academico")
    if nivel is not None:
        if nivel not in {"pregrado", "posgrado"}:
            raise HTTPException(status_code=400, detail="El nivel académico debe ser 'pregrado' o 'posgrado'")
        caso.nivel_academico = nivel
        nivel_casos.append(f"Nivel académico: {nivel}")

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

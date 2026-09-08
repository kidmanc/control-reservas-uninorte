from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from casos.casos_model import Caso, EstadoCaso, TipoSolicitud
from usuarios.usuarios_model import Usuario

ESTADOS_FINALES = (EstadoCaso.APROBADO, EstadoCaso.RECHAZADO)


def _aplicar_filtros(query, periodo: str | None, tipo: str | None, desde, hasta):
    if periodo:
        query = query.where(Caso.periodo_academico == periodo)
    if tipo:
        query = query.where(Caso.tipo_solicitud == tipo)
    if desde:
        query = query.where(Caso.fecha_creacion >= desde)
    if hasta:
        query = query.where(Caso.fecha_creacion <= hasta)
    return query


async def resumen_reportes_action(
    db: AsyncSession,
    periodo: str | None = None,
    tipo: str | None = None,
    desde: datetime | None = None,
    hasta: datetime | None = None,
) -> dict:
    base = _aplicar_filtros(select(Caso), periodo, tipo, desde, hasta)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

    por_estado: dict[str, int] = {}
    for estado in EstadoCaso:
        cantidad = (
            await db.execute(select(func.count()).select_from(base.where(Caso.estado == estado).subquery()))
        ).scalar() or 0
        por_estado[estado.value] = cantidad

    por_tipo: dict[str, int] = {}
    for tipo_solicitud in TipoSolicitud:
        cantidad = (
            await db.execute(
                select(func.count()).select_from(base.where(Caso.tipo_solicitud == tipo_solicitud).subquery())
            )
        ).scalar() or 0
        por_tipo[tipo_solicitud.value] = cantidad

    cerrados = por_estado.get(EstadoCaso.APROBADO.value, 0) + por_estado.get(EstadoCaso.RECHAZADO.value, 0)
    aprobados = por_estado.get(EstadoCaso.APROBADO.value, 0)
    tasa_aprobacion = round(aprobados / cerrados, 3) if cerrados else None

    promedio_porcentaje = await db.execute(
        select(func.avg(Caso.porcentaje_aplicado)).select_from(
            base.where(Caso.porcentaje_aplicado.is_not(None)).subquery()
        )
    )
    promedio_valor = promedio_porcentaje.scalar()
    promedio_porcentaje = round(float(promedio_valor), 1) if promedio_valor is not None else None

    por_tipo_detalle: dict[str, dict[str, float | int | None]] = {}
    for tipo_solicitud in TipoSolicitud:
        sub = base.where(Caso.tipo_solicitud == tipo_solicitud)
        total_tipo = (await db.execute(select(func.count()).select_from(sub.subquery()))).scalar() or 0
        aprobados_tipo = (
            await db.execute(
                select(func.count()).select_from(sub.where(Caso.estado == EstadoCaso.APROBADO).subquery())
            )
        ).scalar() or 0
        promedio_tipo = (
            await db.execute(
                select(func.avg(Caso.porcentaje_aplicado)).select_from(
                    sub.where(Caso.porcentaje_aplicado.is_not(None)).subquery()
                )
            )
        ).scalar()
        por_tipo_detalle[tipo_solicitud.value] = {
            "total": total_tipo,
            "aprobados": aprobados_tipo,
            "promedio_porcentaje": round(float(promedio_tipo), 1) if promedio_tipo is not None else None,
        }

    destinos = await db.execute(
        select(Caso.destino_devolucion, func.count(Caso.id))
        .select_from(base.where(Caso.destino_devolucion.is_not(None)).subquery())
        .group_by(Caso.destino_devolucion)
    )
    devoluciones_por_destino = {destino: cantidad for destino, cantidad in destinos.all()}

    casos = (
        await db.execute(
            base.options(selectinload(Caso.historial_estados)).order_by(Caso.fecha_creacion.desc())
        )
    ).scalars().all()

    usuarios = {u.id: u.nombre for u in (await db.execute(select(Usuario))).scalars().all()}

    ahora = datetime.utcnow()
    dias_cierre: list[float] = []
    estancados: list[dict] = []
    for caso in casos:
        if caso.estado in ESTADOS_FINALES:
            cierres = [
                h.fecha for h in caso.historial_estados if h.estado_nuevo in ("aprobado", "rechazado") and h.fecha
            ]
            cierre = max(cierres) if cierres else caso.fecha_ultima_actualizacion
            if cierre and caso.fecha_creacion:
                dias_cierre.append((cierre - caso.fecha_creacion).total_seconds() / 86400)
        else:
            referencia = caso.fecha_ultima_actualizacion or caso.fecha_creacion
            if referencia:
                estancados.append(
                    {
                        "id": caso.id,
                        "numero_caso": caso.numero_caso,
                        "nombre_completo": caso.nombre_completo,
                        "estado": caso.estado.value if hasattr(caso.estado, "value") else str(caso.estado),
                        "tipo_solicitud": (
                            caso.tipo_solicitud.value
                            if hasattr(caso.tipo_solicitud, "value")
                            else str(caso.tipo_solicitud)
                        ),
                        "tenedor_nombre": usuarios.get(caso.revisor_asignado_id),
                        "dias_quieto": max(int((ahora - referencia).total_seconds() // 86400), 0),
                        "fecha_ultima_actualizacion": caso.fecha_ultima_actualizacion,
                    }
                )

    estancados.sort(key=lambda c: c["dias_quieto"], reverse=True)

    periodos = [
        fila[0]
        for fila in (
            await db.execute(select(Caso.periodo_academico).distinct().order_by(Caso.periodo_academico.desc()))
        ).all()
        if fila[0]
    ]

    return {
        "total": total,
        "por_estado": por_estado,
        "por_tipo": por_tipo,
        "tasa_aprobacion": tasa_aprobacion,
        "promedio_porcentaje": promedio_porcentaje,
        "por_tipo_detalle": por_tipo_detalle,
        "devoluciones_por_destino": devoluciones_por_destino,
        "casos_cerrados": cerrados,
        "promedio_dias_cierre": round(sum(dias_cierre) / len(dias_cierre), 1) if dias_cierre else None,
        "estancados": estancados,
        "periodos": periodos,
    }

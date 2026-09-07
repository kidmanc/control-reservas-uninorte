from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from casos.casos_model import Caso, EstadoCaso
from historial.historial_model import HistorialEstado


async def transicionar_automatica_action(db: AsyncSession, ahora: datetime | None = None) -> int:
    """Mueve de `recibido` a `en_revision` los casos con más de 24 horas sin revisión.

    Solo aplica a casos que siguen en `recibido`; los que están en
    `falta_documentacion` o en estados finales se respetan.
    """
    momento = ahora or datetime.utcnow()
    corte = momento - timedelta(hours=settings.HORAS_CAMBIO_AUTOMATICO)

    result = await db.execute(
        select(Caso).where(
            Caso.estado == EstadoCaso.RECIBIDO,
            Caso.fecha_creacion <= corte,
        )
    )
    candidatos = list(result.scalars().all())

    for caso in candidatos:
        estado_anterior = caso.estado
        caso.estado = EstadoCaso.EN_REVISION
        db.add(
            HistorialEstado(
                caso_id=caso.id,
                estado_anterior=estado_anterior.value if hasattr(estado_anterior, "value") else str(estado_anterior),
                estado_nuevo=EstadoCaso.EN_REVISION.value,
                cambiado_por="sistema",
                descripcion=(
                    f"Cambio automático a revisión luego de superar "
                    f"las {settings.HORAS_CAMBIO_AUTOMATICO} horas."
                ),
            )
        )

    if candidatos:
        await db.commit()

    return len(candidatos)
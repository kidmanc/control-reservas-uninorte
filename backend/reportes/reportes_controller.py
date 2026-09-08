from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from reportes.reportes_action import resumen_reportes_action


async def resumen_reportes_controller(
    db: AsyncSession,
    periodo: str | None = None,
    tipo: str | None = None,
    desde: datetime | None = None,
    hasta: datetime | None = None,
):
    return await resumen_reportes_action(db, periodo, tipo, desde, hasta)

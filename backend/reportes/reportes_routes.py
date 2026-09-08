from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user
from reportes.reportes_schema import ResumenReportes
from reportes.reportes_controller import resumen_reportes_controller

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


def _exigir_tesoreria(user: dict):
    if user.get("rol") not in {"admin", "asistente_tesoreria"}:
        raise HTTPException(status_code=403, detail="Solo Tesorería puede ver los reportes")


def _parse_fecha(valor: str | None, campo: str):
    if not valor:
        return None
    try:
        return datetime.fromisoformat(valor)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Fecha inválida en {campo}: usa AAAA-MM-DD") from None


@router.get("/resumen", response_model=ResumenReportes)
async def resumen_reportes(
    periodo: str | None = None,
    tipo_solicitud: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Agregados de casos para Tesorería (totales, tiempos y estancados)."""
    _exigir_tesoreria(user)
    return await resumen_reportes_controller(
        db,
        periodo=periodo,
        tipo=tipo_solicitud,
        desde=_parse_fecha(desde, "desde"),
        hasta=_parse_fecha(hasta, "hasta"),
    )

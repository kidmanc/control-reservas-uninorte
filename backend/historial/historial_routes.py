from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user_optional
from casos.casos_controller import exigir_acceso_caso_controller, exigir_codigo_publico
from historial.historial_schema import HistorialResponse
from historial.historial_controller import listar_historial_controller

router = APIRouter(prefix="/api/casos/{caso_id}/historial", tags=["historial"])


@router.get("/", response_model=list[HistorialResponse])
async def listar_historial(
    caso_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
    codigo: str | None = None,
):
    # Antes era público sin control y exponía remisiones y operadores:
    # ahora exige login con acceso al caso, o número + código.
    caso = await exigir_acceso_caso_controller(db, caso_id, user)
    if user is None:
        exigir_codigo_publico(caso, codigo)
    return await listar_historial_controller(db, caso_id)

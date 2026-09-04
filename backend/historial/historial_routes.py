from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from historial.historial_schema import HistorialResponse
from historial.historial_controller import listar_historial_controller

router = APIRouter(prefix="/api/casos/{caso_id}/historial", tags=["historial"])


@router.get("/", response_model=list[HistorialResponse])
async def listar_historial(caso_id: int, db: AsyncSession = Depends(get_db)):
    return await listar_historial_controller(db, caso_id)

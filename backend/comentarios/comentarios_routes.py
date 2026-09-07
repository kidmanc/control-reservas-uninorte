from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user_optional
from casos.casos_controller import exigir_tenedor_caso_controller
from comentarios.comentarios_schema import ComentarioCreate, ComentarioResponse
from comentarios.comentarios_controller import crear_comentario_controller, listar_comentarios_controller

router = APIRouter(prefix="/api/casos/{caso_id}/comentarios", tags=["comentarios"])


@router.post("/", response_model=ComentarioResponse)
async def crear_comentario(
    caso_id: int,
    request: ComentarioCreate,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    # Público para el estudiante; quien opera en el flujo solo comenta
    # los casos que tiene en sus manos (el historial es de lectura).
    await exigir_tenedor_caso_controller(db, caso_id, user)
    comentario = await crear_comentario_controller(db, caso_id, request.model_dump())
    return comentario


@router.get("/", response_model=list[ComentarioResponse])
async def listar_comentarios(caso_id: int, db: AsyncSession = Depends(get_db)):
    comentarios = await listar_comentarios_controller(db, caso_id)
    return comentarios

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user_optional
from casos.casos_controller import exigir_tenedor_caso_controller, exigir_acceso_caso_controller, exigir_codigo_publico
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
    # Público para el estudiante (con código); quien opera en el flujo solo
    # comenta los casos que tiene en sus manos (el historial es de lectura).
    caso = await exigir_tenedor_caso_controller(db, caso_id, user)
    texto = (request.texto or "").strip()
    if not texto:
        raise HTTPException(status_code=400, detail="El comentario no puede estar vacío")
    if user is None:
        exigir_codigo_publico(caso, request.codigo)
        # El autor anónimo siempre es el titular: no se acepta el que mande el cliente.
        autor = caso.tercero_nombre or caso.nombre_completo
        visible = True
    else:
        autor = user.get("nombre") or "Tesorería"
        visible = request.visible_para_estudiante
    comentario = await crear_comentario_controller(
        db, caso_id, {"texto": texto, "autor": autor, "visible_para_estudiante": visible}
    )
    return comentario


@router.get("/", response_model=list[ComentarioResponse])
async def listar_comentarios(
    caso_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
    codigo: str | None = None,
):
    # Antes era público sin control y exponía los internos: ahora exige
    # login con acceso al caso, o número + código (que solo ve visibles).
    caso = await exigir_acceso_caso_controller(db, caso_id, user)
    comentarios = await listar_comentarios_controller(db, caso_id)
    if user is None:
        exigir_codigo_publico(caso, codigo)
        comentarios = [c for c in comentarios if c.visible_para_estudiante]
    return comentarios

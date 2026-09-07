from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user
from usuarios.usuarios_schema import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from usuarios.usuarios_controller import (
    crear_usuario_controller,
    listar_usuarios_controller,
    listar_destinatarios_controller,
    actualizar_usuario_controller,
)

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


def _exigir_admin(user: dict):
    if user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Solo el tesorero (admin) puede gestionar usuarios")


@router.get("/destinatarios", response_model=list[UsuarioResponse])
async def listar_destinatarios(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    """Usuarios activos que pueden recibir un caso (revisores, Centro Médico, aprobador).

    Lo consulta quien opera el flujo: Tesorería y quien tiene el caso en sus manos.
    """
    return await listar_destinatarios_controller(db)


@router.get("/", response_model=list[UsuarioResponse])
async def listar_usuarios(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    _exigir_admin(user)
    return await listar_usuarios_controller(db)


@router.post("/", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(request: UsuarioCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    _exigir_admin(user)
    return await crear_usuario_controller(db, request.model_dump())


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario_id: int,
    request: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _exigir_admin(user)
    resultado = await actualizar_usuario_controller(
        db,
        usuario_id,
        request.model_dump(exclude_none=True),
        actor_id=user["id"],
    )
    if not resultado:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return resultado

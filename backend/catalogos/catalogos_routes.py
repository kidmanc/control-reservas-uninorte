from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user
from catalogos.catalogos_schema import CatalogoCreate, CatalogoUpdate, CatalogoResponse
from catalogos.catalogos_controller import (
    listar_catalogos_controller,
    crear_catalogo_controller,
    actualizar_catalogo_controller,
    eliminar_catalogo_controller,
)

router = APIRouter(prefix="/api/catalogos", tags=["catalogos"])


def _exigir_admin(user: dict):
    if user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Solo la tesorera puede gestionar los catálogos")


@router.get("/", response_model=list[CatalogoResponse])
async def listar_catalogos(db: AsyncSession = Depends(get_db)):
    """Catálogo público: lo consume el formulario sin login."""
    return await listar_catalogos_controller(db, solo_activos=True)


@router.post("/", response_model=CatalogoResponse, status_code=201)
async def crear_catalogo(
    request: CatalogoCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _exigir_admin(user)
    return await crear_catalogo_controller(db, request.model_dump())


@router.patch("/{item_id}", response_model=CatalogoResponse)
async def actualizar_catalogo(
    item_id: int,
    request: CatalogoUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _exigir_admin(user)
    resultado = await actualizar_catalogo_controller(db, item_id, request.model_dump(exclude_none=True))
    if not resultado:
        raise HTTPException(status_code=404, detail="Elemento no encontrado")
    return resultado


@router.delete("/{item_id}", status_code=204)
async def eliminar_catalogo(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _exigir_admin(user)
    eliminado = await eliminar_catalogo_controller(db, item_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Elemento no encontrado")
    return None

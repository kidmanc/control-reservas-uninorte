from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user
from casos.casos_schema import CasoCreate, CasoResponse, CasoDetalle, CambiarEstadoRequest
from casos.casos_controller import (
    crear_caso_controller,
    listar_casos_controller,
    obtener_caso_controller,
    obtener_caso_por_numero_controller,
    cambiar_estado_controller,
)

router = APIRouter(prefix="/api/casos", tags=["casos"])


@router.post("/", response_model=CasoResponse)
async def crear_caso(
    datos: str = Form(...),
    archivos: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Crea el caso y sus soportes iniciales como una sola operación."""
    try:
        request = CasoCreate.model_validate_json(datos)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors()) from error

    if not archivos:
        raise HTTPException(status_code=422, detail="Debes adjuntar al menos un documento de soporte")

    subido_por = "tercero" if request.tercero else "estudiante"
    caso = await crear_caso_controller(
        db,
        request.model_dump(),
        request.tercero,
        archivos,
        subido_por,
    )
    return caso


@router.get("/", response_model=list[CasoResponse])
async def listar_casos(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    casos = await listar_casos_controller(db)
    return casos


@router.get("/{caso_id}", response_model=CasoDetalle)
async def obtener_caso(caso_id: int, db: AsyncSession = Depends(get_db)):
    caso = await obtener_caso_controller(db, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@router.get("/numero/{numero}", response_model=CasoDetalle)
async def obtener_caso_por_numero(numero: str, db: AsyncSession = Depends(get_db)):
    caso = await obtener_caso_por_numero_controller(db, numero)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@router.patch("/{caso_id}/estado", response_model=CasoResponse)
async def cambiar_estado(caso_id: int, request: CambiarEstadoRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    caso = await cambiar_estado_controller(
        db,
        caso_id,
        request.nuevo_estado,
        cambiado_por=user["nombre"],
        descripcion=request.descripcion,
    )
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso

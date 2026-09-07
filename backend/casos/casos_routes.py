from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user, get_current_user_optional
from casos.casos_schema import (
    CasoCreate,
    CasoResponse,
    CasoDetalle,
    CambiarEstadoRequest,
    ActualizarDecisionRequest,
    RemitirCasoRequest,
)
from casos.casos_controller import (
    crear_caso_controller,
    listar_casos_controller,
    obtener_caso_controller,
    obtener_caso_por_numero_controller,
    cambiar_estado_controller,
    actualizar_decision_controller,
    exigir_acceso_caso_controller,
    exigir_acceso_caso_por_numero_controller,
    remitir_caso_controller,
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
    casos = await listar_casos_controller(db, user)
    return casos


def _bloquear_revisor_escritura(user: dict, accion: str):
    """El revisor consulta y comenta; no cambia estados ni decisiones."""
    if user.get("rol") == "revisor":
        raise HTTPException(
            status_code=403,
            detail=f"Los revisores solo pueden consultar y comentar los casos. {accion} corresponde a Tesorería.",
        )


@router.get("/{caso_id}", response_model=CasoDetalle)
async def obtener_caso(
    caso_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    return await exigir_acceso_caso_controller(db, caso_id, user)


@router.get("/numero/{numero}", response_model=CasoDetalle)
async def obtener_caso_por_numero(
    numero: str,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    return await exigir_acceso_caso_por_numero_controller(db, numero, user)


@router.patch("/{caso_id}/estado", response_model=CasoResponse)
async def cambiar_estado(caso_id: int, request: CambiarEstadoRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    _bloquear_revisor_escritura(user, "Cambiar el estado")
    caso = await cambiar_estado_controller(
        db,
        caso_id,
        request.nuevo_estado,
        cambiado_por=user["nombre"],
        descripcion=request.descripcion,
        rol=user["rol"],
    )
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@router.patch("/{caso_id}/decision", response_model=CasoResponse)
async def actualizar_decision(
    caso_id: int,
    request: ActualizarDecisionRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Actualiza nivel académico, porcentaje aplicado y/o destino de la devolución."""
    _bloquear_revisor_escritura(user, "Registrar la decisión")
    caso = await actualizar_decision_controller(
        db,
        caso_id,
        request.model_dump(exclude_none=True),
        cambiado_por=user["nombre"],
    )
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@router.patch("/{caso_id}/remitir", response_model=CasoResponse)
async def remitir_caso(
    caso_id: int,
    request: RemitirCasoRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Remite el caso a un revisor (solo Tesorería: asistente o admin)."""
    if user.get("rol") not in {"admin", "asistente_tesoreria"}:
        raise HTTPException(status_code=403, detail="Solo Tesorería puede remitir casos a un revisor")
    caso = await remitir_caso_controller(
        db,
        caso_id,
        request.revisor_id,
        cambiado_por=user["nombre"],
    )
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso

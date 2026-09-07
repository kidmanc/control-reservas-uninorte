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
    listar_participados_controller,
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


@router.get("/participados", response_model=list[CasoResponse])
async def listar_participados(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    """Historial del operador: casos que tuvo en sus manos y ya no tiene."""
    casos = await listar_participados_controller(db, user)
    return casos


def _bloquear_operador_escritura(user: dict, accion: str):
    """Revisor y Centro Médico consultan y comentan; no cambian estados ni decisiones."""
    if user.get("rol") in {"revisor", "centro_medico"}:
        raise HTTPException(
            status_code=403,
            detail=f"Los revisores y el Centro Médico solo pueden consultar y comentar los casos. {accion} no les corresponde.",
        )


@router.get("/{caso_id}", response_model=CasoDetalle)
async def obtener_caso(
    caso_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    caso = await exigir_acceso_caso_controller(db, caso_id, user)
    return _vista_publica(db, caso, user)


@router.get("/numero/{numero}", response_model=CasoDetalle)
async def obtener_caso_por_numero(
    numero: str,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    caso = await exigir_acceso_caso_por_numero_controller(db, numero, user)
    return _vista_publica(db, caso, user)


def _vista_publica(db: AsyncSession, caso, user: dict | None):
    """El canal público (estudiante sin login) no ve comentarios internos.

    Se separa el objeto de la sesión antes de filtrar para que ningún flush
    accidental persista el recorte.
    """
    if user is None:
        db.expunge(caso)
        caso.comentarios = [c for c in caso.comentarios if c.visible_para_estudiante]
    return caso


@router.patch("/{caso_id}/estado", response_model=CasoResponse)
async def cambiar_estado(caso_id: int, request: CambiarEstadoRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    _bloquear_operador_escritura(user, "Cambiar el estado")
    caso = await cambiar_estado_controller(
        db,
        caso_id,
        request.nuevo_estado,
        cambiado_por=user["nombre"],
        descripcion=request.descripcion,
        rol=user["rol"],
        actor_id=user["id"],
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
    _bloquear_operador_escritura(user, "Registrar la decisión")
    caso = await actualizar_decision_controller(
        db,
        caso_id,
        request.model_dump(exclude_none=True),
        cambiado_por=user["nombre"],
        rol=user["rol"],
        actor_id=user["id"],
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
    """Mueve el caso al siguiente paso del flujo (tenedor único).

    Tesorería (asistente o admin) opera cualquier paso válido; quien tiene el
    caso en sus manos solo puede dar sus pasos permitidos. El backend impone
    la tabla del flujo y exige motivo y veredicto en las devoluciones.
    """
    caso = await remitir_caso_controller(
        db,
        caso_id,
        request.revisor_id,
        request.motivo,
        request.veredicto,
        actor=user,
    )
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso

import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user, get_current_user_optional
from config import settings
from casos.casos_controller import exigir_acceso_caso_controller, obtener_caso_controller, exigir_codigo_publico
from archivos.storage import guardar_archivo
from archivos.archivos_schema import ArchivoResponse
from archivos.archivos_controller import (
    subir_archivo_controller,
    adjuntar_interno_controller,
    listar_archivos_controller,
    obtener_archivo_controller,
    validar_carga_estudiante_controller,
)

router = APIRouter(prefix="/api/casos/{caso_id}/archivos", tags=["archivos"])


@router.post("/", response_model=ArchivoResponse)
async def subir_archivo(
    caso_id: int,
    archivo: UploadFile = File(...),
    subido_por: str = Form("estudiante"),
    descripcion: str | None = Form(None),
    codigo: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    if subido_por not in {"estudiante", "tercero"}:
        raise HTTPException(status_code=400, detail="Origen de archivo inválido")

    await validar_carga_estudiante_controller(db, caso_id)
    caso = await obtener_caso_controller(db, caso_id)
    exigir_codigo_publico(caso, codigo)
    ruta = await guardar_archivo(archivo)

    data = {
        "subido_por": subido_por,
        "nombre_archivo": archivo.filename,
        "ruta_almacenamiento": ruta,
        "descripcion": descripcion,
    }

    return await subir_archivo_controller(db, caso_id, data)


@router.post("/adjuntar", response_model=ArchivoResponse)
async def adjuntar_interno(
    caso_id: int,
    archivo: UploadFile = File(...),
    descripcion: str | None = Form(None),
    visible: str = Form("false"),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Adjunto del equipo con visibilidad (interno o para el estudiante).

    Solo Tesorería. El asistente únicamente con el caso en Tesorería.
    Acepta planillas (XLS, XLSX, CSV) además de PDF e imágenes.
    """
    visible_flag = visible.strip().lower() in {"true", "1", "si", "sí"}
    return await adjuntar_interno_controller(
        db,
        caso_id,
        archivo,
        {"descripcion": descripcion, "visible_para_estudiante": visible_flag},
        user,
    )


@router.get("/", response_model=list[ArchivoResponse])
async def listar_archivos(
    caso_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
    codigo: str | None = None,
):
    # Antes era público sin control: ahora exige login con acceso al caso,
    # o número + código en el canal del estudiante (que solo ve visibles).
    caso = await exigir_acceso_caso_controller(db, caso_id, user)
    archivos = await listar_archivos_controller(db, caso_id)
    if user is None:
        exigir_codigo_publico(caso, codigo)
        archivos = [a for a in archivos if a.visible_para_estudiante]
    return archivos


@router.get("/{archivo_id}/descargar")
async def descargar_archivo(
    caso_id: int,
    archivo_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
    codigo: str | None = None,
):
    """Entrega un archivo al panel interno o al titular (solo visibles)."""
    archivo = await obtener_archivo_controller(db, caso_id, archivo_id)
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    if user is None:
        # Canal del estudiante: número + código y solo adjuntos visibles.
        caso = await obtener_caso_controller(db, caso_id)
        exigir_codigo_publico(caso, codigo)
        if not archivo.visible_para_estudiante:
            raise HTTPException(status_code=404, detail="No encontramos ningún caso con esos datos")
    # Quien opera en el flujo solo descarga soportes de sus casos asignados.
    elif user.get("rol") in {"revisor", "centro_medico", "aprobador"}:
        await exigir_acceso_caso_controller(db, caso_id, user)

    directorio = os.path.abspath(settings.UPLOAD_DIR)
    ruta = os.path.abspath(archivo.ruta_almacenamiento)
    if os.path.commonpath([directorio, ruta]) != directorio or not os.path.isfile(ruta):
        raise HTTPException(status_code=404, detail="El archivo no está disponible")

    return FileResponse(ruta, filename=archivo.nombre_archivo)

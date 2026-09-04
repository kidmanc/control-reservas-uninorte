import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user
from config import settings
from archivos.storage import guardar_archivo
from archivos.archivos_schema import ArchivoResponse
from archivos.archivos_controller import (
    subir_archivo_controller,
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
    db: AsyncSession = Depends(get_db),
):
    if subido_por not in {"estudiante", "tercero"}:
        raise HTTPException(status_code=400, detail="Origen de archivo inválido")

    await validar_carga_estudiante_controller(db, caso_id)
    ruta = await guardar_archivo(archivo)

    data = {
        "subido_por": subido_por,
        "nombre_archivo": archivo.filename,
        "ruta_almacenamiento": ruta,
        "descripcion": descripcion,
    }

    return await subir_archivo_controller(db, caso_id, data)


@router.get("/", response_model=list[ArchivoResponse])
async def listar_archivos(caso_id: int, db: AsyncSession = Depends(get_db)):
    return await listar_archivos_controller(db, caso_id)


@router.get("/{archivo_id}/descargar")
async def descargar_archivo(
    caso_id: int,
    archivo_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Entrega un archivo solo a usuarios autenticados del panel interno."""
    archivo = await obtener_archivo_controller(db, caso_id, archivo_id)
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    directorio = os.path.abspath(settings.UPLOAD_DIR)
    ruta = os.path.abspath(archivo.ruta_almacenamiento)
    if os.path.commonpath([directorio, ruta]) != directorio or not os.path.isfile(ruta):
        raise HTTPException(status_code=404, detail="El archivo no está disponible")

    return FileResponse(ruta, filename=archivo.nombre_archivo)

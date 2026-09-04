from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import os
import uuid

from main import get_db
from auth.auth_routes import get_current_user
from archivos.archivos_schema import ArchivoResponse
from archivos.archivos_controller import subir_archivo_controller, listar_archivos_controller

router = APIRouter(prefix="/api/casos/{caso_id}/archivos", tags=["archivos"])

UPLOAD_DIR = "uploads"


@router.post("/", response_model=ArchivoResponse)
async def subir_archivo(
    caso_id: int,
    archivo: UploadFile = File(...),
    subido_por: str = "estudiante",
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(archivo.filename)[1]
    nombre_unico = f"{uuid.uuid4()}{ext}"
    ruta = os.path.join(UPLOAD_DIR, nombre_unico)

    contenido = await archivo.read()
    with open(ruta, "wb") as f:
        f.write(contenido)

    data = {
        "subido_por": subido_por,
        "nombre_archivo": archivo.filename,
        "ruta_almacenamiento": ruta,
    }

    return await subir_archivo_controller(db, caso_id, data)


@router.get("/", response_model=list[ArchivoResponse])
async def listar_archivos(caso_id: int, db: AsyncSession = Depends(get_db)):
    return await listar_archivos_controller(db, caso_id)

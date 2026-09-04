from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from archivos.storage import guardar_archivo
from archivos.archivos_schema import ArchivoResponse
from archivos.archivos_controller import (
    subir_archivo_controller,
    listar_archivos_controller,
    validar_carga_estudiante_controller,
)

router = APIRouter(prefix="/api/casos/{caso_id}/archivos", tags=["archivos"])


@router.post("/", response_model=ArchivoResponse)
async def subir_archivo(
    caso_id: int,
    archivo: UploadFile = File(...),
    subido_por: str = "estudiante",
    descripcion: str | None = None,
    es_soporte_inicial: bool = False,
    db: AsyncSession = Depends(get_db),
):
    if subido_por not in {"estudiante", "tercero"}:
        raise HTTPException(status_code=400, detail="Origen de archivo inválido")

    await validar_carga_estudiante_controller(db, caso_id, es_soporte_inicial)
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

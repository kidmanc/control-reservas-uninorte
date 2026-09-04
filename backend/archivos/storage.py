import os
import uuid

from fastapi import UploadFile, HTTPException

from config import settings

# Extensiones aceptadas para documentos de soporte (PDF e imágenes).
EXTENSIONES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png"}
TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024  # 10 MB


async def guardar_archivo(archivo: UploadFile) -> str:
    """Valida tipo/tamaño y persiste el archivo, devolviendo la ruta de almacenamiento."""
    ext = os.path.splitext(archivo.filename or "")[1].lower()

    if ext not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Usa PDF, JPG o PNG.",
        )

    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera el máximo de 10 MB.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    nombre_unico = f"{uuid.uuid4().hex}{ext}"
    ruta = os.path.join(settings.UPLOAD_DIR, nombre_unico)

    with open(ruta, "wb") as f:
        f.write(contenido)

    return ruta


def eliminar_archivos(rutas: list[str]) -> None:
    """Elimina archivos que no pudieron asociarse a un caso confirmado."""
    for ruta in rutas:
        try:
            if os.path.commonpath([os.path.abspath(settings.UPLOAD_DIR), os.path.abspath(ruta)]) == os.path.abspath(settings.UPLOAD_DIR):
                os.remove(ruta)
        except OSError:
            # La operación principal ya falló; no ocultar su error por una limpieza fallida.
            pass

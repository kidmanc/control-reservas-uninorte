import os
import uuid

from fastapi import UploadFile, HTTPException

from config import settings

# Extensiones aceptadas según el canal: el estudiante solo soportes (PDF e
# imágenes); el equipo interno además planillas para pasarse liquidación.
EXTENSIONES_SOPORTE = {".pdf", ".jpg", ".jpeg", ".png"}
EXTENSIONES_INTERNO = EXTENSIONES_SOPORTE | {".xls", ".xlsx", ".csv"}
EXTENSIONES_PERMITIDAS = EXTENSIONES_SOPORTE
TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024  # 10 MB
TAMANO_CHUNK = 1024 * 1024  # Se lee/escribe por bloques de 1 MB.

# Firmas reales por extensión (magic bytes): la extensión sola no basta,
# un .exe renombrado a .pdf debe rechazarse por contenido.
FIRMAS_POR_EXTENSION = {
    ".pdf": (b"%PDF",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".xls": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    ".xlsx": (b"PK\x03\x04",),
    # El CSV es texto plano: sin firma; se rechaza si trae bytes NUL (binario).
}


def _firma_valida(ext: str, primer_bloque: bytes) -> bool:
    if ext == ".csv":
        return b"\x00" not in primer_bloque
    return primer_bloque.startswith(FIRMAS_POR_EXTENSION.get(ext, ()))


async def guardar_archivo(archivo: UploadFile, permitidas: set[str] | None = None) -> str:
    """Valida extensión, firma real y tamaño leyendo por stream.

    `permitidas` limita por canal (el estudiante no puede subir planillas).
    El archivo se escribe a disco por bloques: nunca se carga completo en
    memoria y un archivo de más de 10 MB se rechaza en cuanto se detecta,
    borrando el parcial.
    """
    if permitidas is None:
        permitidas = EXTENSIONES_PERMITIDAS
    ext = os.path.splitext(archivo.filename or "")[1].lower()

    if ext not in permitidas:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Usa PDF, JPG o PNG.",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    nombre_unico = f"{uuid.uuid4().hex}{ext}"
    ruta = os.path.join(settings.UPLOAD_DIR, nombre_unico)

    total = 0
    try:
        with open(ruta, "wb") as destino:
            while True:
                bloque = await archivo.read(TAMANO_CHUNK)
                if not bloque:
                    break
                if total == 0 and not _firma_valida(ext, bloque):
                    raise HTTPException(
                        status_code=400,
                        detail=f"El contenido no corresponde a un archivo {ext[1:].upper()} válido.",
                    )
                total += len(bloque)
                if total > TAMANO_MAXIMO_BYTES:
                    raise HTTPException(status_code=400, detail="El archivo supera el máximo de 10 MB.")
                destino.write(bloque)
    except HTTPException:
        try:
            os.remove(ruta)
        except OSError:
            pass
        raise

    if total == 0:
        try:
            os.remove(ruta)
        except OSError:
            pass
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

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

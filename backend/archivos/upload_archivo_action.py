from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from archivos.archivos_model import Archivo
from casos.casos_model import Caso


async def subir_archivo_action(db: AsyncSession, caso_id: int, data: dict) -> Archivo:
    caso = await db.get(Caso, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    archivo = Archivo(
        caso_id=caso_id,
        subido_por=data["subido_por"],
        nombre_archivo=data["nombre_archivo"],
        ruta_almacenamiento=data["ruta_almacenamiento"],
        descripcion=data.get("descripcion"),
    )
    db.add(archivo)
    await db.commit()
    await db.refresh(archivo)
    return archivo


async def listar_archivos_action(db: AsyncSession, caso_id: int) -> list[Archivo]:
    result = await db.execute(
        select(Archivo).where(Archivo.caso_id == caso_id).order_by(Archivo.fecha)
    )
    return list(result.scalars().all())

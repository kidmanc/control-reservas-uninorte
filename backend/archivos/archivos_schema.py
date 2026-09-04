from datetime import datetime

from pydantic import BaseModel


class ArchivoResponse(BaseModel):
    id: int
    caso_id: int
    subido_por: str
    nombre_archivo: str
    descripcion: str | None = None
    fecha: datetime | None = None

    class Config:
        from_attributes = True

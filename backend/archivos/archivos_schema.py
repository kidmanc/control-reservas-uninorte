from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


class ArchivoResponse(BaseModel):
    id: int
    caso_id: int
    subido_por: str
    nombre_archivo: str
    descripcion: str | None = None
    visible_para_estudiante: bool = True
    fecha: datetime | None = None

    @field_validator("fecha", mode="before")
    @classmethod
    def _fecha_como_utc(cls, valor):
        if isinstance(valor, datetime) and valor.tzinfo is None:
            return valor.replace(tzinfo=timezone.utc)
        return valor

    class Config:
        from_attributes = True

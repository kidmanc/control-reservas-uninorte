from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


def _fecha_como_utc(valor):
    # SQLite guarda Naive (UTC del servidor); se emite con zona para que el
    # frontend la convierta a hora de Colombia.
    if isinstance(valor, datetime) and valor.tzinfo is None:
        return valor.replace(tzinfo=timezone.utc)
    return valor


class HistorialResponse(BaseModel):
    id: int
    caso_id: int
    estado_anterior: str | None = None
    estado_nuevo: str
    cambiado_por: str
    descripcion: str | None = None
    fecha: datetime | None = None

    @field_validator("fecha", mode="before")
    @classmethod
    def _validar_fecha(cls, valor):
        return _fecha_como_utc(valor)

    class Config:
        from_attributes = True

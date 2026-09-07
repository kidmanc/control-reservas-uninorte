from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


class ComentarioCreate(BaseModel):
    texto: str
    autor: str
    visible_para_estudiante: bool = True


class ComentarioResponse(BaseModel):
    id: int
    caso_id: int
    autor: str
    texto: str
    visible_para_estudiante: bool
    fecha: datetime | None = None

    @field_validator("fecha", mode="before")
    @classmethod
    def _fecha_como_utc(cls, valor):
        if isinstance(valor, datetime) and valor.tzinfo is None:
            return valor.replace(tzinfo=timezone.utc)
        return valor

    class Config:
        from_attributes = True

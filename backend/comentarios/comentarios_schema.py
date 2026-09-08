from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_validator


class ComentarioCreate(BaseModel):
    texto: str = Field(min_length=1, max_length=5000)
    # El autor lo fija el servidor (usuario logueado o titular del caso);
    # se conserva en el schema por compatibilidad y se ignora al guardar.
    autor: str = Field(default="", max_length=200)
    visible_para_estudiante: bool = True
    # Código estudiantil: obligatorio solo en el canal público anónimo.
    codigo: str | None = None


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

import re

from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from config import settings

from comentarios.comentarios_schema import ComentarioResponse
from archivos.archivos_schema import ArchivoResponse
from historial.historial_schema import HistorialResponse


class CasoBase(BaseModel):
    nombre_completo: str
    codigo_estudiantil: str
    correo_institucional: str
    telefono_contacto: str | None = None
    programa_academico: str
    tipo_solicitud: str
    periodo_academico: str
    motivo: str

    @field_validator("correo_institucional")
    @classmethod
    def validar_correo_institucional(cls, correo: str) -> str:
        correo_normalizado = correo.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", correo_normalizado):
            raise ValueError("Ingresa un correo electrónico válido")

        dominio = settings.INSTITUTIONAL_EMAIL_DOMAIN.lower()
        if correo_normalizado.rsplit("@", 1)[-1] != dominio:
            raise ValueError(f"El correo debe pertenecer al dominio @{dominio}")

        return correo_normalizado


class CasoCreate(CasoBase):
    descripcion_adjuntos: str | None = None
    tercero: dict | None = None


class CasoResponse(CasoBase):
    id: int
    numero_caso: str
    estado: str
    asistente_asignada_id: int | None = None
    tercero_nombre: str | None = None
    tercero_parentesco: str | None = None
    tercero_documento: str | None = None
    tercero_telefono: str | None = None
    tercero_correo: str | None = None
    fecha_creacion: datetime
    fecha_ultima_actualizacion: datetime

    class Config:
        from_attributes = True


class CasoDetalle(CasoResponse):
    comentarios: list[ComentarioResponse] = Field(default_factory=list)
    archivos: list[ArchivoResponse] = Field(default_factory=list)
    historial_estados: list[HistorialResponse] = Field(default_factory=list)


class CambiarEstadoRequest(BaseModel):
    nuevo_estado: str
    descripcion: str | None = None

import re

from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone

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
    nivel_academico: str | None = "pregrado"
    periodo_academico: str
    motivo: str

    @field_validator("periodo_academico")
    @classmethod
    def validar_periodo_academico(cls, periodo: str) -> str:
        periodo_normalizado = periodo.strip()
        if not re.fullmatch(r"\d{4}-(10|20)", periodo_normalizado):
            raise ValueError("El período académico debe tener el formato AAAA-10 o AAAA-20")
        return periodo_normalizado

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
    revisor_asignado_id: int | None = None
    remitido_por_id: int | None = None
    porcentaje_aplicado: float | None = None
    destino_devolucion: str | None = None
    tercero_nombre: str | None = None
    tercero_parentesco: str | None = None
    tercero_documento: str | None = None
    tercero_telefono: str | None = None
    tercero_correo: str | None = None
    fecha_creacion: datetime
    fecha_ultima_actualizacion: datetime

    @field_validator("fecha_creacion", "fecha_ultima_actualizacion", mode="before")
    @classmethod
    def _fechas_como_utc(cls, valor):
        if isinstance(valor, datetime) and valor.tzinfo is None:
            return valor.replace(tzinfo=timezone.utc)
        return valor

    class Config:
        from_attributes = True


class CasoDetalle(CasoResponse):
    comentarios: list[ComentarioResponse] = Field(default_factory=list)
    archivos: list[ArchivoResponse] = Field(default_factory=list)
    historial_estados: list[HistorialResponse] = Field(default_factory=list)


class CambiarEstadoRequest(BaseModel):
    nuevo_estado: str
    descripcion: str | None = None

    @field_validator("nuevo_estado")
    @classmethod
    def validar_estado(cls, valor: str) -> str:
        # Estados válidos según el enum EstadoCaso.
        if valor not in {"recibido", "falta_documentacion", "aprobado", "rechazado"}:
            raise ValueError(f"Estado inválido: {valor}")
        return valor


class ActualizarDecisionRequest(BaseModel):
    nivel_academico: str | None = None
    porcentaje_aplicado: float | None = None
    destino_devolucion: str | None = None

    @field_validator("nivel_academico")
    @classmethod
    def validar_nivel(cls, valor: str | None) -> str | None:
        if valor is not None and valor not in {"pregrado", "posgrado"}:
            raise ValueError("El nivel académico debe ser 'pregrado' o 'posgrado'")
        return valor

    @field_validator("destino_devolucion")
    @classmethod
    def validar_destino(cls, valor: str | None) -> str | None:
        if valor is not None and valor not in {"estudiante", "icetex"}:
            raise ValueError("El destino de la devolución debe ser 'estudiante' o 'icetex'")
        return valor


class RemitirCasoRequest(BaseModel):
    """Mueve el caso al siguiente paso del flujo.

    Con `revisor_id` nulo el caso vuelve a Tesorería. Las devoluciones exigen
    `motivo` y `veredicto` (quedan como comentario interno e historial).
    """

    revisor_id: int | None = None
    motivo: str | None = None
    veredicto: str | None = None

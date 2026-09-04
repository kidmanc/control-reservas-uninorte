from pydantic import BaseModel
from datetime import datetime

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
    comentarios: list[ComentarioResponse] = []
    archivos: list[ArchivoResponse] = []
    historial_estados: list[HistorialResponse] = []


class CambiarEstadoRequest(BaseModel):
    nuevo_estado: str
    descripcion: str | None = None

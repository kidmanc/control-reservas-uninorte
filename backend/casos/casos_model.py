from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
import enum

from main import Base


class EstadoCaso(str, enum.Enum):
    RECIBIDO = "recibido"
    EN_REVISION = "en_revision"
    FALTA_DOCUMENTACION = "falta_documentacion"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"


class TipoSolicitud(str, enum.Enum):
    RESERVA_MATRICULA = "reserva_matricula"
    DEVOLUCION = "devolucion"


class Caso(Base):
    __tablename__ = "casos"

    id = Column(Integer, primary_key=True, index=True)
    numero_caso = Column(String(20), unique=True, nullable=False, index=True)
    nombre_completo = Column(String(200), nullable=False)
    codigo_estudiantil = Column(String(50), nullable=False)
    correo_institucional = Column(String(200), nullable=False)
    telefono_contacto = Column(String(50))
    programa_academico = Column(String(200), nullable=False)
    tipo_solicitud = Column(SAEnum(TipoSolicitud), nullable=False)
    periodo_academico = Column(String(20), nullable=False)
    motivo = Column(Text, nullable=False)
    estado = Column(SAEnum(EstadoCaso), nullable=False, default=EstadoCaso.RECIBIDO)
    asistente_asignada_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Datos del tercero (opcional)
    tercero_nombre = Column(String(200))
    tercero_parentesco = Column(String(100))
    tercero_documento = Column(String(50))
    tercero_telefono = Column(String(50))
    tercero_correo = Column(String(200))

    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_ultima_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

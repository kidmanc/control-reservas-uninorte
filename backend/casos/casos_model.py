from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from main import Base


class EstadoCaso(str, enum.Enum):
    RECIBIDO = "recibido"
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
    nivel_academico = Column(String(50), nullable=False, default="pregrado")
    periodo_academico = Column(String(20), nullable=False)
    motivo = Column(Text, nullable=False)
    porcentaje_aplicado = Column(Float, nullable=True)
    destino_devolucion = Column(String(50), nullable=True)
    estado = Column(SAEnum(EstadoCaso), nullable=False, default=EstadoCaso.RECIBIDO)
    asistente_asignada_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    revisor_asignado_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    # Quién tenía el caso antes del tenedor actual (None = estaba en Tesorería).
    # Sirve para que el aprobador solo pueda devolver a quien se lo envió.
    remitido_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Datos del tercero (opcional)
    tercero_nombre = Column(String(200))
    tercero_parentesco = Column(String(100))
    tercero_documento = Column(String(50))
    tercero_telefono = Column(String(50))
    tercero_correo = Column(String(200))

    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_ultima_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    comentarios = relationship("Comentario", back_populates="caso", lazy="selectin")
    archivos = relationship("Archivo", back_populates="caso", lazy="selectin")
    historial_estados = relationship("HistorialEstado", back_populates="caso", lazy="selectin")


class ParticipacionCaso(Base):
    """Casos en los que un usuario participó (los tuvo en sus manos).

    Es el "historial" del operador: ya no están en su bandeja principal,
    pero puede consultarlos en modo lectura.
    """

    __tablename__ = "caso_participaciones"

    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("casos.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("caso_id", "usuario_id"),)

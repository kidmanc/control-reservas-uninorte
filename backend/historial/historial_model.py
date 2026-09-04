from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from main import Base


class HistorialEstado(Base):
    __tablename__ = "historial_estados"

    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("casos.id"), nullable=False, index=True)
    estado_anterior = Column(String(50))
    estado_nuevo = Column(String(50), nullable=False)
    cambiado_por = Column(String(200), nullable=False)
    descripcion = Column(Text)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

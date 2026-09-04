from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from main import Base


class Archivo(Base):
    __tablename__ = "archivos"

    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("casos.id"), nullable=False, index=True)
    subido_por = Column(String(100), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    ruta_almacenamiento = Column(String(500), nullable=False)
    descripcion = Column(String(255))
    fecha = Column(DateTime(timezone=True), server_default=func.now())

    caso = relationship("Caso", back_populates="archivos")

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from main import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    correo = Column(String(200), unique=True, nullable=False, index=True)
    contrasena_hash = Column(String(200), nullable=False)
    rol = Column(String(50), nullable=False, default="asistente_tesoreria")
    iniciales = Column(String(10), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

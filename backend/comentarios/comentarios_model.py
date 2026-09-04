from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from main import Base


class Comentario(Base):
    __tablename__ = "comentarios"

    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("casos.id"), nullable=False, index=True)
    autor = Column(String(200), nullable=False)
    texto = Column(Text, nullable=False)
    visible_para_estudiante = Column(Boolean, default=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

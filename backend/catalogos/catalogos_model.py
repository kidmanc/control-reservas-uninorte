from sqlalchemy import Column, Integer, String, Boolean, UniqueConstraint

from main import Base

# Tipos de catálogo administrables desde Configuración.
# El período académico NO es catálogo: se calcula por fecha (ver frontend).
TIPOS_CATALOGO = {"programa"}


class Catalogo(Base):
    __tablename__ = "catalogos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), nullable=False, index=True)
    valor = Column(String(200), nullable=False)
    activo = Column(Boolean, default=True)

    __table_args__ = (UniqueConstraint("tipo", "valor"),)

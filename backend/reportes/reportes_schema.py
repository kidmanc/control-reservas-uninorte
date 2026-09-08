from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


def _fecha_como_utc(valor):
    if isinstance(valor, datetime) and valor.tzinfo is None:
        return valor.replace(tzinfo=timezone.utc)
    return valor


class CasoEstancado(BaseModel):
    id: int
    numero_caso: str
    nombre_completo: str
    estado: str
    tipo_solicitud: str
    tenedor_nombre: str | None = None
    dias_quieto: int
    fecha_ultima_actualizacion: datetime

    @field_validator("fecha_ultima_actualizacion", mode="before")
    @classmethod
    def _validar_fecha(cls, valor):
        return _fecha_como_utc(valor)


class ResumenReportes(BaseModel):
    total: int
    por_estado: dict[str, int]
    por_tipo: dict[str, int]
    tasa_aprobacion: float | None = None
    promedio_porcentaje: float | None = None
    por_tipo_detalle: dict[str, dict[str, float | int | None]]
    devoluciones_por_destino: dict[str, int]
    casos_cerrados: int
    promedio_dias_cierre: float | None = None
    estancados: list[CasoEstancado]
    periodos: list[str]

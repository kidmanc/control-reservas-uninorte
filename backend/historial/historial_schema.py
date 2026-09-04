from pydantic import BaseModel


class HistorialResponse(BaseModel):
    id: int
    caso_id: int
    estado_anterior: str | None = None
    estado_nuevo: str
    cambiado_por: str
    descripcion: str | None = None
    fecha: str

    class Config:
        from_attributes = True

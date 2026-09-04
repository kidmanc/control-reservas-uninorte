from pydantic import BaseModel


class ArchivoResponse(BaseModel):
    id: int
    caso_id: int
    subido_por: str
    nombre_archivo: str
    ruta_almacenamiento: str
    descripcion: str | None = None
    fecha: str

    class Config:
        from_attributes = True

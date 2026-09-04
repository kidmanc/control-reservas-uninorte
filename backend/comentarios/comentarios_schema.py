from pydantic import BaseModel


class ComentarioCreate(BaseModel):
    texto: str
    autor: str
    visible_para_estudiante: bool = True


class ComentarioResponse(BaseModel):
    id: int
    caso_id: int
    autor: str
    texto: str
    visible_para_estudiante: bool
    fecha: str

    class Config:
        from_attributes = True

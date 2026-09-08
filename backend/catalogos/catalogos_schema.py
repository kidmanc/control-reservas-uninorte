from pydantic import BaseModel, Field


class CatalogoCreate(BaseModel):
    tipo: str
    valor: str = Field(min_length=1, max_length=200)


class CatalogoUpdate(BaseModel):
    valor: str | None = Field(default=None, min_length=1, max_length=200)
    activo: bool | None = None


class CatalogoResponse(BaseModel):
    id: int
    tipo: str
    valor: str
    nivel: str | None = None
    activo: bool | None = True

    class Config:
        from_attributes = True

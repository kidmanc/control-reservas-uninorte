from pydantic import BaseModel, EmailStr, Field


class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=3, max_length=200)
    correo: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)
    iniciales: str = Field(min_length=2, max_length=10)
    rol: str = "asistente_tesoreria"


class UsuarioUpdate(BaseModel):
    rol: str | None = None
    activo: bool | None = None


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str
    iniciales: str
    activo: bool | None = True

    class Config:
        from_attributes = True

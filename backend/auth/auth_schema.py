from pydantic import BaseModel


class LoginRequest(BaseModel):
    correo: str
    contrasena: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str
    iniciales: str

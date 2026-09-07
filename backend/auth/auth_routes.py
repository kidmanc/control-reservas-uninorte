from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_schema import LoginRequest
from auth.auth_controller import login_controller, me_controller
from auth.login_action import verificar_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

# HTTPBearer expone el botón "Authorize" en Swagger y envía el header automáticamente.
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="No autenticado")

    token = credentials.credentials
    payload = verificar_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    user_id = int(payload.get("sub"))
    user = await me_controller(db, user_id)

    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict | None:
    """Igual que `get_current_user`, pero devuelve None si no hay token válido.

    Sirve para rutas públicas (seguimiento del estudiante) que el panel
    también consume con token: si quien llama es revisor, se le aplica
    su restricción de casos remitidos; si es anónimo, pasa como público.
    """
    if not credentials:
        return None

    payload = verificar_token(credentials.credentials)
    if not payload:
        return None

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None

    return await me_controller(db, user_id)


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await login_controller(db, request.correo, request.contrasena)

    if not result:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    return result


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user

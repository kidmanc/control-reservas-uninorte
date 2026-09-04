from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from usuarios.usuarios_model import Usuario
from config import settings

SECRET_KEY = "cambiar-en-produccion-una-clave-segura"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_contrasena(password: str) -> str:
    return pwd_context.hash(password)


def verificar_contrasena(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def crear_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def login_action(db: AsyncSession, correo: str, contrasena: str) -> dict | None:
    result = await db.execute(select(Usuario).where(Usuario.correo == correo))
    usuario = result.scalar_one_or_none()

    if not usuario or not verificar_contrasena(contrasena, usuario.contrasena_hash):
        return None

    token = crear_token({"sub": str(usuario.id), "rol": usuario.rol})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "correo": usuario.correo,
            "rol": usuario.rol,
            "iniciales": usuario.iniciales,
        },
    }


async def me_action(db: AsyncSession, user_id: int) -> dict | None:
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    usuario = result.scalar_one_or_none()

    if not usuario:
        return None

    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "rol": usuario.rol,
        "iniciales": usuario.iniciales,
    }

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from usuarios.usuarios_model import Usuario
from auth.login_action import hash_contrasena

# Roles permitidos al crear usuarios desde el panel (rol de destino)
ROLES_PERMITIDOS = {"asistente_tesoreria", "admin"}


async def listar_usuarios_action(db: AsyncSession) -> list[Usuario]:
    result = await db.execute(select(Usuario).order_by(Usuario.nombre))
    return list(result.scalars().all())


async def crear_usuario_action(db: AsyncSession, data: dict) -> Usuario:
    rol = data.get("rol", "asistente_tesoreria")
    if rol not in ROLES_PERMITIDOS:
        raise HTTPException(status_code=400, detail=f"Rol inválido: {rol}")

    correo = data["correo"].strip().lower()

    existing = await db.execute(select(Usuario).where(Usuario.correo == correo))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    usuario = Usuario(
        nombre=data["nombre"],
        correo=correo,
        contrasena_hash=hash_contrasena(data["contrasena"]),
        rol=rol,
        iniciales=data["iniciales"].strip().upper()[:10],
        activo=True,
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    return usuario


async def actualizar_usuario_action(db: AsyncSession, usuario_id: int, data: dict) -> Usuario | None:
    usuario = await db.get(Usuario, usuario_id)
    if not usuario:
        return None

    if data.get("rol") is not None:
        if data["rol"] not in ROLES_PERMITIDOS:
            raise HTTPException(status_code=400, detail=f"Rol inválido: {data['rol']}")
        usuario.rol = data["rol"]

    if data.get("activo") is not None:
        usuario.activo = data["activo"]

    await db.commit()
    await db.refresh(usuario)
    return usuario

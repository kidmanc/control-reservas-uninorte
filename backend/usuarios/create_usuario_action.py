from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from usuarios.usuarios_model import Usuario
from auth.login_action import hash_contrasena

# Roles permitidos al crear usuarios desde el panel (rol de destino)
ROLES_PERMITIDOS = {"asistente_tesoreria", "admin", "revisor", "centro_medico", "aprobador"}

# Roles que operan en el flujo de revisión (visibilidad restringida a remitidos)
ROLES_FLUJO = {"revisor", "centro_medico", "aprobador"}


async def listar_usuarios_action(db: AsyncSession) -> list[Usuario]:
    result = await db.execute(select(Usuario).order_by(Usuario.nombre))
    return list(result.scalars().all())


async def listar_destinatarios_action(db: AsyncSession) -> list[Usuario]:
    """Usuarios activos que pueden recibir un caso (revisión, Centro Médico, aprobación)."""
    result = await db.execute(
        select(Usuario)
        .where(Usuario.rol.in_(ROLES_FLUJO), Usuario.activo.is_not(False))
        .order_by(Usuario.nombre)
    )
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


async def actualizar_usuario_action(db: AsyncSession, usuario_id: int, data: dict, actor_id: int | None = None) -> Usuario | None:
    usuario = await db.get(Usuario, usuario_id)
    if not usuario:
        return None

    rol_nuevo = data.get("rol")
    activo_nuevo = data.get("activo")

    # ¿Esta operación desactiva o degrada a un tesorero (admin)?
    quita_admin = (
        usuario.rol == "admin"
        and (activo_nuevo is False or (rol_nuevo is not None and rol_nuevo != "admin"))
    )
    if quita_admin:
        # Nadie puede desactivarse o degradarse a sí mismo.
        if actor_id is not None and usuario.id == actor_id:
            raise HTTPException(
                status_code=400,
                detail="No puedes desactivar tu propia cuenta ni quitarte el rol de tesorero.",
            )
        # Debe quedar al menos un admin activo.
        resultado = await db.execute(
            select(func.count(Usuario.id)).where(
                Usuario.rol == "admin",
                Usuario.activo.is_(True),
            )
        )
        total_admins_activos = resultado.scalar() or 0
        if total_admins_activos <= 1:
            raise HTTPException(
                status_code=400,
                detail="No puedes dejar la tesorería sin un administrador activo.",
            )

    if rol_nuevo is not None:
        if rol_nuevo not in ROLES_PERMITIDOS:
            raise HTTPException(status_code=400, detail=f"Rol inválido: {rol_nuevo}")
        usuario.rol = rol_nuevo

    if activo_nuevo is not None:
        usuario.activo = activo_nuevo

    await db.commit()
    await db.refresh(usuario)
    return usuario

from sqlalchemy.ext.asyncio import AsyncSession

from auth.login_action import login_action, me_action


async def login_controller(db: AsyncSession, correo: str, contrasena: str) -> dict | None:
    return await login_action(db, correo, contrasena)


async def me_controller(db: AsyncSession, user_id: int) -> dict | None:
    return await me_action(db, user_id)

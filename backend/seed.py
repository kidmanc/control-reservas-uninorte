import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from config import settings
from main import Base
from usuarios.usuarios_model import Usuario
from auth.login_action import hash_contrasena


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Verificar si ya existe el usuario
        result = await db.execute(select(Usuario).where(Usuario.correo == "carolina.mejia@uninorte.edu.co"))
        existing = result.scalar_one_or_none()

        if not existing:
            usuario = Usuario(
                nombre="Carolina Mejía",
                correo="carolina.mejia@uninorte.edu.co",
                contrasena_hash=hash_contrasena("password123"),
                rol="asistente_tesoreria",
                iniciales="CM",
            )
            db.add(usuario)
            await db.commit()
            print("Usuario semilla creado: carolina.mejia@uninorte.edu.co / password123")
        else:
            print("Usuario ya existe")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())

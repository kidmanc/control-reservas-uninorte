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
        # Verificar si ya existe el usuario semilla (tesorero admin)
        result = await db.execute(select(Usuario).where(Usuario.correo == "carolina.mejia@uninorte.edu.co"))
        semilla = result.scalar_one_or_none()

        if not semilla:
            usuario = Usuario(
                nombre="Carolina Mejía",
                correo="carolina.mejia@uninorte.edu.co",
                contrasena_hash=hash_contrasena("password123"),
                rol="admin",
                iniciales="CM",
                activo=True,
            )
            db.add(usuario)
            await db.commit()
            print("Tesorero (admin) semilla creado: carolina.mejia@uninorte.edu.co / password123")
        else:
            # Si el semilla ya existía como asistente, promoverlo a admin (transición)
            if semilla.rol != "admin":
                semilla.rol = "admin"
                await db.commit()
                print("Semilla promovido a admin (tesorero): carolina.mejia@uninorte.edu.co")
            else:
                print("Tesorero (admin) semilla ya existe")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())

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

        # Revisor semilla (Centro Médico) para probar la remisión de casos
        result = await db.execute(select(Usuario).where(Usuario.correo == "centro.medico@uninorte.edu.co"))
        centro = result.scalar_one_or_none()

        if not centro:
            db.add(
                Usuario(
                    nombre="Centro Médico",
                    correo="centro.medico@uninorte.edu.co",
                    contrasena_hash=hash_contrasena("password123"),
                    rol="centro_medico",
                    iniciales="CEM",
                    activo=True,
                )
            )
            await db.commit()
            print("Centro Médico semilla creado: centro.medico@uninorte.edu.co / password123")
        elif centro.rol != "centro_medico":
            # Transición: antes existía como revisor genérico.
            centro.rol = "centro_medico"
            await db.commit()
            print("Centro Médico semilla actualizado al rol centro_medico")

        # Cuentas del flujo (misma contraseña para todas: password123).
        # Son datos de ejemplo para desarrollo: la tesorera los reemplaza
        # con las cuentas reales desde Gestión de usuarios.
        semillas_flujo = [
            ("Mónica Correa", "monica@uninorte.edu.co", "asistente_tesoreria", "MC"),
            ("Robin Pérez", "robin@uninorte.edu.co", "revisor", "RP"),
            ("JG Gómez", "jg@uninorte.edu.co", "aprobador", "JG"),
        ]
        for nombre, correo, rol, iniciales in semillas_flujo:
            result = await db.execute(select(Usuario).where(Usuario.correo == correo))
            existente = result.scalar_one_or_none()
            if not existente:
                db.add(
                    Usuario(
                        nombre=nombre,
                        correo=correo,
                        contrasena_hash=hash_contrasena("password123"),
                        rol=rol,
                        iniciales=iniciales,
                        activo=True,
                    )
                )
                print(f"Semilla creado: {correo} / password123 ({rol})")
            elif existente.rol != rol or existente.nombre != nombre or existente.iniciales != iniciales:
                existente.nombre = nombre
                existente.rol = rol
                existente.iniciales = iniciales
                print(f"Semilla actualizado: {correo} ({rol})")
        await db.commit()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())

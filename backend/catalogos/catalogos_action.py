from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from catalogos.catalogos_model import Catalogo, TIPOS_CATALOGO


async def listar_catalogos_action(db: AsyncSession, solo_activos: bool = False) -> list[Catalogo]:
    query = select(Catalogo).order_by(Catalogo.tipo, Catalogo.valor)
    if solo_activos:
        query = query.where(Catalogo.activo.is_not(False))
    result = await db.execute(query)
    return list(result.scalars().all())


async def crear_catalogo_action(db: AsyncSession, data: dict) -> Catalogo:
    tipo = (data.get("tipo") or "").strip()
    valor = (data.get("valor") or "").strip()

    if tipo not in TIPOS_CATALOGO:
        raise HTTPException(status_code=400, detail=f"Tipo inválido: {tipo}")
    if not valor:
        raise HTTPException(status_code=400, detail="El valor no puede estar vacío")

    duplicado = await db.execute(
        select(Catalogo).where(
            Catalogo.tipo == tipo,
            func.lower(Catalogo.valor) == valor.lower(),
        )
    )
    if duplicado.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ese valor ya existe en el catálogo")

    item = Catalogo(tipo=tipo, valor=valor, activo=True)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def actualizar_catalogo_action(db: AsyncSession, item_id: int, data: dict) -> Catalogo | None:
    item = await db.get(Catalogo, item_id)
    if not item:
        return None

    if data.get("valor") is not None:
        valor = data["valor"].strip()
        if not valor:
            raise HTTPException(status_code=400, detail="El valor no puede estar vacío")
        duplicado = await db.execute(
            select(Catalogo).where(
                Catalogo.tipo == item.tipo,
                func.lower(Catalogo.valor) == valor.lower(),
                Catalogo.id != item.id,
            )
        )
        if duplicado.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ese valor ya existe en el catálogo")
        item.valor = valor

    if data.get("activo") is not None:
        item.activo = data["activo"]

    await db.commit()
    await db.refresh(item)
    return item


async def eliminar_catalogo_action(db: AsyncSession, item_id: int) -> bool:
    item = await db.get(Catalogo, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True


async def sembrar_catalogos_action(db: AsyncSession) -> int:
    """Valores iniciales (programas y períodos del formulario actual)."""
    iniciales = {
        "programa": [
            "Ingeniería de Sistemas",
            "Administración de Empresas",
            "Derecho",
            "Ingeniería Industrial",
            "Psicología",
            "Ingeniería Electrónica",
        ],
        "periodo": ["2026-10", "2026-20"],
    }
    creados = 0
    for tipo, valores in iniciales.items():
        existentes = await db.execute(select(func.count(Catalogo.id)).where(Catalogo.tipo == tipo))
        if (existentes.scalar() or 0) > 0:
            continue
        for valor in valores:
            db.add(Catalogo(tipo=tipo, valor=valor, activo=True))
            creados += 1
    if creados:
        await db.commit()
    return creados

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from comentarios.comentarios_model import Comentario


async def crear_comentario_action(db: AsyncSession, caso_id: int, data: dict) -> Comentario:
    comentario = Comentario(
        caso_id=caso_id,
        autor=data["autor"],
        texto=data["texto"],
        visible_para_estudiante=data.get("visible_para_estudiante", True),
    )
    db.add(comentario)
    await db.commit()
    await db.refresh(comentario)
    return comentario


async def listar_comentarios_action(db: AsyncSession, caso_id: int) -> list[Comentario]:
    result = await db.execute(
        select(Comentario).where(Comentario.caso_id == caso_id).order_by(Comentario.fecha)
    )
    return list(result.scalars().all())

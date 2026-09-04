from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from main import get_db
from auth.auth_routes import get_current_user

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


@router.get("/")
async def listar_usuarios(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    return {"message": "Endpoint de usuarios"}

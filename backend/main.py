from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from contextlib import asynccontextmanager
import os

from config import settings

# --- Database ---

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


# --- App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Crear tablas al iniciar
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# TODO(prod): restringir allow_origins a dominios reales (ej. https://app.uninorte.edu.co)
# y quitar allow_credentials=True con origen "*". Esto es solo para desarrollo.

# --- Routes ---

from auth.auth_routes import router as auth_router
from usuarios.usuarios_routes import router as usuarios_router
from casos.casos_routes import router as casos_router
from comentarios.comentarios_routes import router as comentarios_router
from archivos.archivos_routes import router as archivos_router
from historial.historial_routes import router as historial_router

app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(casos_router)
app.include_router(comentarios_router)
app.include_router(archivos_router)
app.include_router(historial_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

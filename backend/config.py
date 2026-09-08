from pydantic_settings import BaseSettings
from pydantic import model_validator
import os


DEFAULT_SECRET_KEY = "dev-solo-no-usar-en-produccion-cambiar"


class Settings(BaseSettings):
    APP_NAME: str = "Casos Especiales - Tesorería Uninorte"
    DEBUG: bool = True

    # SQLite (desarrollo)
    DB_PATH: str = os.path.join(os.path.dirname(__file__), "casos_especiales.db")

    # Directorio de archivos subidos
    UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "uploads")

    # JWT — usar variable de entorno SECRET_KEY en producción
    SECRET_KEY: str = DEFAULT_SECRET_KEY

    # Orígenes permitidos para el frontend (coma-separados).
    # En producción: ej. CORS_ORIGINS=https://app.uninorte.edu.co
    CORS_ORIGINS: str = "http://localhost:5173"

    # Dominio permitido para los correos institucionales de estudiantes.
    # Puede sobreescribirse desde .env sin cambiar el código.
    INSTITUTIONAL_EMAIL_DOMAIN: str = "uninorte.edu.co"

    @model_validator(mode="after")
    def _exigir_secret_en_produccion(self):
        if not self.DEBUG and (not self.SECRET_KEY or self.SECRET_KEY == DEFAULT_SECRET_KEY):
            raise ValueError("SECRET_KEY debe definirse en el entorno cuando DEBUG=false")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def DATABASE_URL(self) -> str:
        return f"sqlite+aiosqlite:///{self.DB_PATH}"

    class Config:
        env_file = ".env"


settings = Settings()

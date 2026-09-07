from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    APP_NAME: str = "Casos Especiales - Tesorería Uninorte"
    DEBUG: bool = True

    # SQLite (desarrollo)
    DB_PATH: str = os.path.join(os.path.dirname(__file__), "casos_especiales.db")

    # Directorio de archivos subidos
    UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "uploads")

    # JWT — usar variable de entorno SECRET_KEY en producción
    SECRET_KEY: str = "dev-solo-no-usar-en-produccion-cambiar"

    # Dominio permitido para los correos institucionales de estudiantes.
    # Puede sobreescribirse desde .env sin cambiar el código.
    INSTITUTIONAL_EMAIL_DOMAIN: str = "uninorte.edu.co"

    @property
    def DATABASE_URL(self) -> str:
        return f"sqlite+aiosqlite:///{self.DB_PATH}"

    class Config:
        env_file = ".env"


settings = Settings()

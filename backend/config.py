from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    APP_NAME: str = "Casos Especiales - Tesorería Uninorte"
    DEBUG: bool = True

    # SQLite (desarrollo)
    DB_PATH: str = os.path.join(os.path.dirname(__file__), "casos_especiales.db")

    @property
    def DATABASE_URL(self) -> str:
        return f"sqlite+aiosqlite:///{self.DB_PATH}"

    class Config:
        env_file = ".env"


settings = Settings()

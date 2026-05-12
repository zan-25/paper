from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Question Paper Generator API"
    app_env: str = "development"
    database_url: str = "sqlite:///./qpgen.db"
    jwt_secret_key: str = "change-this-in-production-please-use-32-plus-chars"
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 60 * 24 * 3
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    storage_root: str = "./storage"
    allow_demo_seed: bool = True

    @property
    def storage_path(self) -> Path:
        path = Path(self.storage_root).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()

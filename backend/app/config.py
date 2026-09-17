"""
Application Configuration — reads from .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "AI Medical Symptom Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # MongoDB Database Configuration
    MONGODB_URI: str = "mongodb://127.0.0.1:27017"
    DATABASE_NAME: str = "ai_health_checker"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production-super-secret-key-32chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI
    GEMINI_API_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8005",
        "http://127.0.0.1:8005"
    ]

    # Paths
    REPORTS_DIR: str = "../reports"
    ML_MODELS_DIR: str = "../ml/saved_models"


settings = Settings()

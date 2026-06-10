"""Centralised, environment-driven application settings.

Pydantic-settings reads from environment / .env and validates at startup so the
service fails fast on misconfiguration (critical for a regulated workload).
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "PMS Onboarding Service"
    environment: str = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    api_base_url: str = ""  # https://api.aurum.pms (for webhooks)

    # Database
    database_url: str = Field(..., alias="DATABASE_URL")

    @property
    def db_url(self) -> str:
        """Normalize DB URL for psycopg2 driver."""
        url = self.database_url
        if url.startswith("postgresql+psycopg://"):
            url = url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    # Security
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_alg: str = "HS256"
    jwt_access_ttl_minutes: int = 30
    jwt_refresh_ttl_days: int = 30
    pii_encryption_key: str = Field(..., alias="PII_ENCRYPTION_KEY")

    # CORS
    cors_origins: str = "http://localhost:5173"  # comma-separated

    # External regulated integrations
    kra_base_url: str = ""
    kra_api_key: str = ""
    ckyc_base_url: str = ""
    ckyc_api_key: str = ""
    esign_base_url: str = ""
    esign_api_key: str = ""
    bank_verify_base_url: str = ""
    bank_verify_api_key: str = ""

    # Message bus (for event publishing)
    redis_url: str = ""  # redis://localhost:6379/0 (optional, uses noop if not set)

    # Business rules
    min_investment_inr: int = 5_000_000  # SEBI minimum ticket: Rs 50 lakh

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

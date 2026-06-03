from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "MacroScope Intelligence"
    database_url: str = "postgresql://macro:macro@localhost:5432/macro"
    redis_url: str = "redis://localhost:6379/0"
    world_bank_base_url: str = "https://api.worldbank.org/v2"
    fred_api_key: str | None = None
    trading_economics_key: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

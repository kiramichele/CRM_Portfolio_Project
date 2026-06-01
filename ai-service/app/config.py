from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"

    # Model selection. Cheap/structured tasks → Haiku; nuanced reasoning → Sonnet.
    model_fast: str = "claude-haiku-4-5"
    model_smart: str = "claude-sonnet-4-6"

    @property
    def origins(self) -> list[str]:
        # Strip trailing slashes — a CORS Origin header never has one, so
        # "https://app.vercel.app/" would never match the real origin.
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()

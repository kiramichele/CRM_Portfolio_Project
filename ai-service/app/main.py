from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import router

app = FastAPI(
    title="ServiceHub AI",
    description="Anthropic-powered marketplace features: matching, ranking, NL search/analytics, assistants.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {
        "status": "ok",
        "configured": bool(settings.anthropic_api_key),
        "models": {"fast": settings.model_fast, "smart": settings.model_smart},
    }

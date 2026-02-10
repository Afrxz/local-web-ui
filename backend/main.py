"""FastAPI entry point for Local AI WebUI backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import chat, sessions, models, providers
from backend.config import settings

app = FastAPI(
    title="Local AI WebUI",
    description="A private, local-first chat interface for LLMs",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(models.router)
app.include_router(providers.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "default_provider": settings.default_provider}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )

"""Providers router — configuration, presets, and connection testing."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.providers.base import ProviderConfig
from backend.providers.ollama import OllamaProvider
from backend.providers.openai_compat import OpenAICompatProvider
from backend.config import settings, PROVIDER_PRESETS

router = APIRouter(prefix="/api/providers", tags=["providers"])


class TestConnectionRequest(BaseModel):
    provider: str
    base_url: Optional[str] = None
    api_key: Optional[str] = None


@router.get("/presets")
async def get_provider_presets():
    """Return available provider presets for the UI dropdown."""
    return {"presets": PROVIDER_PRESETS}


@router.get("/config")
async def get_current_config():
    """Return current provider configuration."""
    return {
        "default_provider": settings.default_provider,
        "ollama_base_url": settings.ollama_base_url,
        "openai_compat_base_url": settings.openai_compat_base_url,
        "has_api_key": bool(settings.openai_compat_api_key),
    }


@router.post("/test")
async def test_connection(request: TestConnectionRequest):
    """Test connectivity to a provider.

    Validates that the provider is reachable and properly configured
    before the user starts chatting.
    """
    try:
        if request.provider == "ollama":
            provider = OllamaProvider(
                ProviderConfig(
                    base_url=request.base_url or settings.ollama_base_url,
                )
            )
        else:
            base_url = (
                request.base_url
                or settings.openai_compat_base_url
                or "https://api.openai.com/v1"
            )
            api_key = request.api_key or settings.openai_compat_api_key
            provider = OpenAICompatProvider(
                ProviderConfig(base_url=base_url, api_key=api_key)
            )

        connected = await provider.validate_connection()
        if connected:
            return {"status": "connected", "message": "Connection successful"}
        else:
            return {"status": "failed", "message": "Could not connect to provider"}
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Connection test failed: {e}",
        )

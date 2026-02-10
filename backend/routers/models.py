"""Models router — list models and get metadata from the active provider."""

from fastapi import APIRouter, HTTPException, Query

from backend.providers.base import ProviderConfig
from backend.providers.ollama import OllamaProvider
from backend.providers.openai_compat import OpenAICompatProvider
from backend.config import settings

router = APIRouter(prefix="/api/models", tags=["models"])


def _get_provider(provider_type: str, base_url: str = None, api_key: str = None):
    """Instantiate a provider for model operations."""
    if provider_type == "ollama":
        return OllamaProvider(
            ProviderConfig(base_url=base_url or settings.ollama_base_url)
        )
    else:
        return OpenAICompatProvider(
            ProviderConfig(
                base_url=base_url or settings.openai_compat_base_url or "https://api.openai.com/v1",
                api_key=api_key or settings.openai_compat_api_key,
            )
        )


@router.get("")
async def list_models(
    provider: str = Query(default="ollama"),
    base_url: str = Query(default=None),
    api_key: str = Query(default=None),
):
    """List available models from the specified provider."""
    try:
        p = _get_provider(provider, base_url, api_key)
        models = await p.list_models()
        return {"models": [m.model_dump() for m in models]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to list models: {e}")


@router.get("/{model_id:path}/info")
async def get_model_info(
    model_id: str,
    provider: str = Query(default="ollama"),
    base_url: str = Query(default=None),
    api_key: str = Query(default=None),
):
    """Get detailed metadata for a specific model."""
    try:
        p = _get_provider(provider, base_url, api_key)
        info = await p.get_model_info(model_id)
        if not info:
            raise HTTPException(status_code=404, detail="Model not found")
        return info.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get model info: {e}")

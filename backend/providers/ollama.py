"""Ollama provider implementation.

Connects to a local Ollama instance at localhost:11434.
Supports streaming chat completions and model metadata.
"""

import json
from typing import AsyncGenerator, Optional

import httpx

from .base import BaseProvider, ModelInfo, ProviderConfig


class OllamaProvider(BaseProvider):
    """Provider for local Ollama inference."""

    def __init__(self, config: ProviderConfig | None = None):
        if config is None:
            config = ProviderConfig(base_url="http://localhost:11434")
        super().__init__(config)

    async def send_message(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 800,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from Ollama."""
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            },
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
            async with client.stream(
                "POST",
                f"{self.config.base_url}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            token = data["message"]["content"]
                            if token:
                                yield token
                        if data.get("done", False):
                            return
                    except json.JSONDecodeError:
                        continue

    async def list_models(self) -> list[ModelInfo]:
        """List locally available Ollama models."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.config.base_url}/api/tags")
            response.raise_for_status()
            data = response.json()

        models = []
        for m in data.get("models", []):
            name = m.get("name", "")
            details = m.get("details", {})
            models.append(
                ModelInfo(
                    id=name,
                    name=name,
                    parameter_count=details.get("parameter_size"),
                    quantization=details.get("quantization_level"),
                    context_length=None,
                    provider="ollama",
                )
            )
        return models

    async def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """Get detailed metadata for an Ollama model using /api/show."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.config.base_url}/api/show",
                    json={"name": model_id},
                )
                response.raise_for_status()
                data = response.json()

            details = data.get("details", {})
            model_info = data.get("model_info", {})

            # Try to extract context length from model_info
            context_length = None
            for key, value in model_info.items():
                if "context_length" in key:
                    context_length = value
                    break

            return ModelInfo(
                id=model_id,
                name=model_id,
                parameter_count=details.get("parameter_size"),
                quantization=details.get("quantization_level"),
                context_length=context_length,
                provider="ollama",
            )
        except httpx.HTTPError:
            return None

    async def validate_connection(self) -> bool:
        """Check if Ollama is running and reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(self.config.base_url)
                return response.status_code == 200
        except httpx.HTTPError:
            return False

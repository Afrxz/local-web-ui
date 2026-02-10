"""OpenAI-compatible provider implementation.

Supports any service that implements the OpenAI chat completions API:
OpenAI, DeepSeek, Groq, Together, OpenRouter, LM Studio, vLLM, etc.
"""

import json
from typing import AsyncGenerator, Optional

import httpx

from .base import BaseProvider, ModelInfo, ProviderConfig


class OpenAICompatProvider(BaseProvider):
    """Provider for OpenAI-compatible API services."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

    def _headers(self) -> dict:
        """Build request headers with optional auth."""
        headers = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers

    async def send_message(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from an OpenAI-compatible API."""
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
            async with client.stream(
                "POST",
                f"{self.config.base_url}/chat/completions",
                json=payload,
                headers=self._headers(),
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    # SSE format: "data: {...}"
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            return
                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                token = delta.get("content")
                                if token:
                                    yield token
                        except json.JSONDecodeError:
                            continue

    async def list_models(self) -> list[ModelInfo]:
        """List models from the OpenAI-compatible API."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.config.base_url}/models",
                    headers=self._headers(),
                )
                response.raise_for_status()
                data = response.json()

            models = []
            for m in data.get("data", []):
                models.append(
                    ModelInfo(
                        id=m.get("id", ""),
                        name=m.get("id", ""),
                        provider="openai_compat",
                    )
                )
            return models
        except httpx.HTTPError:
            return []

    async def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """Get model info. OpenAI API has limited metadata, so we return basics."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.config.base_url}/models/{model_id}",
                    headers=self._headers(),
                )
                response.raise_for_status()
                data = response.json()

            return ModelInfo(
                id=data.get("id", model_id),
                name=data.get("id", model_id),
                provider="openai_compat",
            )
        except httpx.HTTPError:
            return ModelInfo(
                id=model_id,
                name=model_id,
                provider="openai_compat",
            )

    async def validate_connection(self) -> bool:
        """Test connection by listing models."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.config.base_url}/models",
                    headers=self._headers(),
                )
                return response.status_code == 200
        except httpx.HTTPError:
            return False

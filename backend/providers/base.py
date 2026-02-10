"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
from pydantic import BaseModel


class ModelInfo(BaseModel):
    """Normalized model metadata."""
    id: str
    name: str
    parameter_count: Optional[str] = None
    quantization: Optional[str] = None
    context_length: Optional[int] = None
    provider: str = ""


class ProviderConfig(BaseModel):
    """Configuration for a provider instance."""
    base_url: str
    api_key: Optional[str] = None


class BaseProvider(ABC):
    """Abstract provider interface.

    Both Ollama and OpenAI-compatible providers implement this interface.
    The rest of the app (chat, sessions, memory) does not care which
    provider is active.
    """

    def __init__(self, config: ProviderConfig):
        self.config = config

    @abstractmethod
    async def send_message(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 800,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Send messages and yield response tokens as they stream in."""
        ...

    @abstractmethod
    async def list_models(self) -> list[ModelInfo]:
        """List available models from this provider."""
        ...

    @abstractmethod
    async def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """Get detailed metadata for a specific model."""
        ...

    @abstractmethod
    async def validate_connection(self) -> bool:
        """Test that the provider is reachable and configured correctly."""
        ...

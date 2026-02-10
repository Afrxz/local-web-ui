from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # Ollama
    ollama_base_url: str = Field(default="http://localhost:11434")

    # OpenAI-compatible
    openai_compat_base_url: Optional[str] = Field(default=None)
    openai_compat_api_key: Optional[str] = Field(default=None)

    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

    # Default provider
    default_provider: str = Field(default="ollama")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# System prompt presets
SYSTEM_PROMPT_PRESETS = {
    "default": (
        "You are a helpful, friendly AI assistant. Provide clear, accurate, "
        "and well-structured responses. Use markdown formatting when appropriate."
    ),
    "concise": (
        "You are a concise AI assistant. Give short, direct answers. "
        "Avoid unnecessary elaboration. Use bullet points when listing things."
    ),
    "technical": (
        "You are a technical AI assistant specialized in software development "
        "and engineering. Provide detailed technical responses with code examples "
        "when relevant. Use proper terminology and explain complex concepts clearly."
    ),
}

# Default performance settings
DEFAULT_LOCAL_CONTEXT = 4096
DEFAULT_LOCAL_MAX_TOKENS = 800
DEFAULT_REMOTE_CONTEXT = 8192
DEFAULT_REMOTE_MAX_TOKENS = 2048
MAX_HISTORY_MESSAGES = 20

# Provider presets for OpenAI-compatible services
PROVIDER_PRESETS = {
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "requires_key": True,
    },
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com",
        "requires_key": True,
    },
    "groq": {
        "name": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "requires_key": True,
    },
    "together": {
        "name": "Together AI",
        "base_url": "https://api.together.xyz/v1",
        "requires_key": True,
    },
    "fireworks": {
        "name": "Fireworks",
        "base_url": "https://api.fireworks.ai/inference/v1",
        "requires_key": True,
    },
    "openrouter": {
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "requires_key": True,
    },
    "lmstudio": {
        "name": "LM Studio",
        "base_url": "http://localhost:1234/v1",
        "requires_key": False,
    },
    "vllm": {
        "name": "vLLM",
        "base_url": "http://localhost:8000/v1",
        "requires_key": False,
    },
}


settings = Settings()

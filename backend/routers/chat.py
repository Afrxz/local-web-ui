"""Chat router — send messages and stream responses via SSE."""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from backend.sessions.manager import session_manager
from backend.sessions.memory import build_prompt_messages
from backend.providers.base import ProviderConfig
from backend.providers.ollama import OllamaProvider
from backend.providers.openai_compat import OpenAICompatProvider
from backend.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    message: str


def _get_provider(session):
    """Instantiate the correct provider based on session settings."""
    provider_type = session.settings.provider
    if provider_type == "ollama":
        return OllamaProvider(
            ProviderConfig(base_url=settings.ollama_base_url)
        )
    else:
        base_url = settings.openai_compat_base_url or "https://api.openai.com/v1"
        api_key = settings.openai_compat_api_key
        return OpenAICompatProvider(
            ProviderConfig(base_url=base_url, api_key=api_key)
        )


@router.post("/send")
async def send_message(request: ChatRequest):
    """Send a message and stream the response as SSE.

    1. Add user message to session history
    2. Build prompt with sliding window memory
    3. Stream tokens back to client
    4. Save complete assistant response to session
    """
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.settings.model:
        raise HTTPException(status_code=400, detail="No model selected")

    # Add user message to history
    session_manager.add_message(request.session_id, "user", request.message)

    # Build prompt messages with sliding window
    prompt_messages = build_prompt_messages(
        system_prompt=session.system_prompt,
        history=session.messages,
        max_context=session.settings.max_context,
        max_response_tokens=session.settings.max_response_tokens,
    )

    provider = _get_provider(session)

    async def event_generator():
        full_response = ""
        try:
            async for token in provider.send_message(
                messages=prompt_messages,
                model=session.settings.model,
                max_tokens=session.settings.max_response_tokens,
                temperature=session.settings.temperature,
            ):
                full_response += token
                yield {"event": "token", "data": json.dumps({"token": token})}

            # Save assistant response to session
            session_manager.add_message(
                request.session_id, "assistant", full_response
            )
            yield {
                "event": "done",
                "data": json.dumps({"content": full_response}),
            }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())

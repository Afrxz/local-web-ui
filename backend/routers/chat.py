"""Chat router — send messages and stream responses via SSE."""

import base64
import io
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from PyPDF2 import PdfReader

from backend.sessions.manager import session_manager
from backend.sessions.memory import build_prompt_messages
from backend.providers.base import ProviderConfig
from backend.providers.ollama import OllamaProvider
from backend.providers.openai_compat import OpenAICompatProvider
from backend.config import settings
from backend.utils.search import web_search

router = APIRouter(prefix="/api/chat", tags=["chat"])


class FileAttachment(BaseModel):
    name: str
    type: str
    dataUrl: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    web_search: bool = False
    files: list[FileAttachment] = []


def _extract_file_text(f: "FileAttachment") -> str:
    """Extract readable text from a file attachment's base64 data URL."""
    try:
        # Strip the data URI prefix to get raw base64
        raw_b64 = f.dataUrl.split(",", 1)[1] if "," in f.dataUrl else f.dataUrl
        file_bytes = base64.b64decode(raw_b64)

        if f.type == "application/pdf" or f.name.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file_bytes))
            pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    pages.append(f"--- Page {i + 1} ---\n{text}")
            if pages:
                return f"[Content of {f.name}]\n" + "\n\n".join(pages)
            return f"[Attached PDF: {f.name} — could not extract text (scanned/image PDF?)]"
        else:
            # Text-based files: .txt, .csv, .json, .md, etc.
            text = file_bytes.decode("utf-8", errors="replace")
            return f"[Content of {f.name}]\n{text}"
    except Exception as e:
        return f"[Attached file: {f.name} — failed to read: {e}]"


def _get_provider(session):
    """Instantiate the correct provider based on session settings."""
    provider_type = session.settings.provider
    if provider_type == "ollama":
        return OllamaProvider(
            ProviderConfig(base_url=settings.ollama_base_url)
        )
    else:
        base_url = (
            session.settings.base_url
            or settings.openai_compat_base_url
            or "https://api.openai.com/v1"
        )
        api_key = session.settings.api_key or settings.openai_compat_api_key
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

    # Optionally augment with web search results
    user_content = request.message
    if request.web_search:
        now = datetime.now(timezone.utc)
        date_header = f"[Current date and time: {now.strftime('%A, %B %d, %Y, %I:%M %p UTC')}]"
        search_context = await web_search(request.message)
        if search_context:
            user_content = f"{search_context}\n---\n{request.message}"
        else:
            # Even if search fails, still inject the current date
            user_content = f"{date_header}\n---\n{request.message}"

    # Add user message to history (original text for display)
    session_manager.add_message(request.session_id, "user", request.message)

    # When web search is active, append grounding instructions to system prompt
    system_prompt = session.system_prompt
    if request.web_search:
        search_instruction = (
            "\n\nIMPORTANT: The user has enabled web search. Their message includes "
            "real-time search results with the current date and time. You MUST:"
            "\n- Base your answer ONLY on the provided search results and conversation context."
            "\n- NEVER invent facts, URLs, dates, or numbers that are not in the search results."
            "\n- If the search results do not contain enough information, say so honestly."
            "\n- Cite the source when referencing specific data from the results."
        )
        system_prompt = (system_prompt or "") + search_instruction

    # Build prompt messages with sliding window
    prompt_messages = build_prompt_messages(
        system_prompt=system_prompt,
        history=session.messages,
        max_context=session.settings.max_context,
        max_response_tokens=session.settings.max_response_tokens,
    )

    # Replace the last user message content with search-augmented version
    if request.web_search and user_content != request.message:
        for msg in reversed(prompt_messages):
            if msg["role"] == "user":
                msg["content"] = user_content
                break

    # Transform last user message to include file contents if files attached
    if request.files:
        for msg in reversed(prompt_messages):
            if msg["role"] == "user":
                has_images = any(f.type.startswith("image/") for f in request.files)
                # Use content-array format only if there are images (vision API)
                if has_images:
                    content_parts = [{"type": "text", "text": msg["content"]}]
                    for f in request.files:
                        if f.type.startswith("image/"):
                            content_parts.append({
                                "type": "image_url",
                                "image_url": {"url": f.dataUrl},
                            })
                        else:
                            extracted = _extract_file_text(f)
                            content_parts.append({
                                "type": "text",
                                "text": extracted,
                            })
                    msg["content"] = content_parts
                else:
                    # Text-only files: append extracted content as plain text
                    file_texts = []
                    for f in request.files:
                        file_texts.append(_extract_file_text(f))
                    msg["content"] = msg["content"] + "\n\n" + "\n\n".join(file_texts)
                break

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

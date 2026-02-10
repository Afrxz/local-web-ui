"""Sessions router — CRUD for chat sessions."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.sessions.manager import session_manager, SessionSettings

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    title: str = "New Chat"
    system_prompt: Optional[str] = None


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    settings: Optional[SessionSettings] = None


@router.get("")
async def list_sessions():
    """List all sessions, sorted by most recently updated."""
    sessions = session_manager.list_sessions()
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "message_count": len(s.messages),
            "model": s.settings.model,
            "provider": s.settings.provider,
        }
        for s in sessions
    ]


@router.post("")
async def create_session(request: CreateSessionRequest):
    """Create a new chat session."""
    session = session_manager.create_session(
        title=request.title,
        system_prompt=request.system_prompt,
    )
    return {
        "id": session.id,
        "title": session.title,
        "system_prompt": session.system_prompt,
        "settings": session.settings.model_dump(),
        "messages": session.messages,
        "created_at": session.created_at,
    }


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get full session state including messages and settings."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "title": session.title,
        "system_prompt": session.system_prompt,
        "settings": session.settings.model_dump(),
        "messages": session.messages,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }


@router.put("/{session_id}")
async def update_session(session_id: str, request: UpdateSessionRequest):
    """Update session title, system prompt, or settings."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if request.title is not None:
        session_manager.update_session(session_id, title=request.title)
    if request.system_prompt is not None:
        session_manager.update_session(session_id, system_prompt=request.system_prompt)
    if request.settings is not None:
        session_manager.update_session(session_id, settings=request.settings)

    updated = session_manager.get_session(session_id)
    return {
        "id": updated.id,
        "title": updated.title,
        "system_prompt": updated.system_prompt,
        "settings": updated.settings.model_dump(),
        "messages": updated.messages,
        "updated_at": updated.updated_at,
    }


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a session permanently."""
    if not session_manager.delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted"}


@router.post("/{session_id}/clear")
async def clear_session_memory(session_id: str):
    """Clear message history but keep settings and system prompt."""
    session = session_manager.clear_memory(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "title": session.title,
        "messages": session.messages,
        "status": "cleared",
    }

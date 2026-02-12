"""Session state management.

Each session holds its own system prompt, message history, model selection,
and performance settings. Sessions are fully isolated.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from backend.config import (
    SYSTEM_PROMPT_PRESETS,
    DEFAULT_LOCAL_CONTEXT,
    DEFAULT_LOCAL_MAX_TOKENS,
)


class SessionSettings(BaseModel):
    """Per-session performance and model settings."""
    model: Optional[str] = None
    provider: str = "ollama"
    max_context: int = DEFAULT_LOCAL_CONTEXT
    max_response_tokens: int = DEFAULT_LOCAL_MAX_TOKENS
    temperature: float = 0.7
    low_vram_mode: bool = True
    base_url: Optional[str] = None
    api_key: Optional[str] = None


class Session(BaseModel):
    """A single chat session with isolated state."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Chat"
    system_prompt: str = SYSTEM_PROMPT_PRESETS["default"]
    messages: list[dict] = Field(default_factory=list)
    settings: SessionSettings = Field(default_factory=SessionSettings)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class SessionManager:
    """In-memory session store.

    Manages creation, retrieval, update, and deletion of chat sessions.
    All sessions are isolated — changes in one never leak to another.
    """

    def __init__(self):
        self._sessions: dict[str, Session] = {}
        # Create a default session
        default = Session()
        self._sessions[default.id] = default

    def create_session(
        self,
        title: str = "New Chat",
        system_prompt: Optional[str] = None,
    ) -> Session:
        """Create a new isolated session."""
        session = Session(
            title=title,
            system_prompt=system_prompt or SYSTEM_PROMPT_PRESETS["default"],
        )
        self._sessions[session.id] = session
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Retrieve a session by ID."""
        return self._sessions.get(session_id)

    def list_sessions(self) -> list[Session]:
        """List all sessions, sorted by most recently updated."""
        return sorted(
            self._sessions.values(),
            key=lambda s: s.updated_at,
            reverse=True,
        )

    def update_session(self, session_id: str, **kwargs) -> Optional[Session]:
        """Update session fields."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        for key, value in kwargs.items():
            if hasattr(session, key):
                setattr(session, key, value)
        session.updated_at = datetime.now().isoformat()
        return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session permanently."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def add_message(self, session_id: str, role: str, content: str) -> Optional[Session]:
        """Append a message to a session's history."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.messages.append({"role": role, "content": content})
        session.updated_at = datetime.now().isoformat()

        # Auto-title from first user message
        if role == "user" and session.title == "New Chat":
            session.title = content[:50] + ("..." if len(content) > 50 else "")

        return session

    def clear_memory(self, session_id: str) -> Optional[Session]:
        """Clear a session's message history (keeps settings and prompt)."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.messages = []
        session.updated_at = datetime.now().isoformat()
        return session


# Global singleton
session_manager = SessionManager()

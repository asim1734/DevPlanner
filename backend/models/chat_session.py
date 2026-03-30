"""
Chat session database model.
Stores conversation history, PRD drafts, and lock/generation state.
"""
from sqlmodel import SQLModel, Field, Column, JSON
from typing import Dict, Any, Optional, List
from uuid import UUID, uuid4
from datetime import datetime


class ChatSession(SQLModel, table=True):
    """
    Represents a chat session for PRD development.

    Table: chat_sessions
    """
    __tablename__ = "chat_sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    messages: List[Dict[str, Any]] = Field(
        sa_column=Column(JSON, nullable=False),
        default_factory=list
    )
    prd_json: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSON, nullable=True),
        default=None
    )
    is_locked: bool = Field(default=False, nullable=False)
    generation_attempts: int = Field(default=0, nullable=False)
    generation_status: Optional[str] = Field(
        default=None,
        max_length=20,
        nullable=True
    )  # null | "pending" | "success" | "failed"
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow}
    )

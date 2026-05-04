"""
Parse failure logging model.
Stores LLM outputs that fail to parse, for post-mortem analysis.
"""
from sqlmodel import SQLModel, Field, Column, JSON, String
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime


class ParseFailure(SQLModel, table=True):
    """
    Stores parse failures for debugging and admin inspection.

    Table: parse_failures
    """
    __tablename__ = "parse_failures"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    schema_name: str = Field(
        sa_column=Column(String(255), nullable=False),
        description="Name of the schema that failed to parse (e.g., 'PMChatPayload')"
    )
    raw_payload: str = Field(
        sa_column=Column(String(65535), nullable=False),
        description="Raw LLM output that failed to parse"
    )
    cleaned_payload: Optional[str] = Field(
        sa_column=Column(String(65535), nullable=True),
        default=None,
        description="Cleaned payload after code-fence stripping and newline escaping"
    )
    error_message: str = Field(
        sa_column=Column(String(1024), nullable=False),
        description="Parse error message"
    )
    error_type: str = Field(
        sa_column=Column(String(64), nullable=False),
        description="Type of error (e.g., 'JSONDecodeError', 'ValidationError')"
    )
    session_id: Optional[UUID] = Field(
        default=None,
        nullable=True,
        foreign_key="chat_sessions.id",
        description="Associated chat session, if any"
    )
    context: Dict[str, Any] = Field(
        sa_column=Column(JSON, nullable=False),
        default_factory=dict,
        description="Additional context (agent name, attempt number, etc.)"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        description="Timestamp of failure"
    )

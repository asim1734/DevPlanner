"""
Project database model.
Stores project metadata and the approved PRD as JSON.
"""
from sqlmodel import SQLModel, Field, Column, JSON
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime


class Project(SQLModel, table=True):
    """
    Represents a project with its PRD.

    Table: projects
    """
    __tablename__ = "projects"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="chat_sessions.id", nullable=False)
    name: str = Field(max_length=255, nullable=False)
    description: str = Field(nullable=False)
    prd_json: Dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))
    diagrams_json: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True)
    )
    status: str = Field(default="active", max_length=50)  # "active" | "complete"
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

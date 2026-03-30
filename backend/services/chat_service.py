"""
Chat session management service.
Handles conversation history with database persistence.
"""
from typing import Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from sqlmodel import Session, select
from sqlalchemy.orm import Session as SQLAlchemySession
from sqlalchemy.orm import attributes
from pydantic import BaseModel
from schemas.prd import PRDSchema
from models.chat_session import ChatSession as ChatSessionModel


class Message(BaseModel):
    """A single message in the conversation."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime


def create_session(db_session: Session) -> ChatSessionModel:
    """
    Create a new chat session in the database.

    Args:
        db_session: Database session

    Returns:
        ChatSessionModel: New session with unique ID
    """
    session = ChatSessionModel(
        id=uuid4(),
        messages=[],
        prd_json=None,
        is_locked=False,
        generation_attempts=0,
        generation_status=None
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def get_session(session_id: UUID, db_session: Session) -> Optional[ChatSessionModel]:
    """
    Retrieve a chat session by ID from database.

    Args:
        session_id: Session UUID
        db_session: Database session

    Returns:
        ChatSessionModel if found, None otherwise
    """
    statement = select(ChatSessionModel).where(ChatSessionModel.id == session_id)
    return db_session.exec(statement).first()


def add_message(session_id: UUID, role: str, content: str, db_session: Session) -> ChatSessionModel:
    """
    Add a message to the conversation history.

    Args:
        session_id: Session UUID
        role: "user" or "assistant"
        content: Message content
        db_session: Database session

    Returns:
        Updated ChatSessionModel

    Raises:
        ValueError: If session not found
    """
    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    }
    session.messages.append(message)
    session.updated_at = datetime.utcnow()

    # Mark messages field as modified for SQLAlchemy to track changes
    attributes.flag_modified(session, "messages")

    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def update_prd_draft(session_id: UUID, prd: PRDSchema, db_session: Session) -> ChatSessionModel:
    """
    Update the PRD draft for a session.

    Args:
        session_id: Session UUID
        prd: PRD schema to save as draft
        db_session: Database session

    Returns:
        Updated ChatSessionModel

    Raises:
        ValueError: If session not found
    """
    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    session.prd_json = prd.model_dump()
    session.updated_at = datetime.utcnow()

    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def lock_session(session_id: UUID, db_session: Session) -> ChatSessionModel:
    """
    Lock a session to prevent further chat messages.
    Sets generation_status to "pending" for upcoming generation.

    Args:
        session_id: Session UUID
        db_session: Database session

    Returns:
        Updated ChatSessionModel

    Raises:
        ValueError: If session not found or session is already locked
    """
    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    if session.is_locked:
        raise ValueError(f"Session {session_id} is already locked")

    session.is_locked = True
    session.generation_status = "pending"
    session.updated_at = datetime.utcnow()

    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def unlock_session(session_id: UUID, db_session: Session) -> ChatSessionModel:
    """
    Unlock a session to allow further chat refinement.
    Called after 3 failed generation attempts.

    Args:
        session_id: Session UUID
        db_session: Database session

    Returns:
        Updated ChatSessionModel

    Raises:
        ValueError: If session not found
    """
    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    session.is_locked = False
    session.generation_status = "failed"
    session.updated_at = datetime.utcnow()

    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def increment_generation_attempts(session_id: UUID, db_session: Session) -> ChatSessionModel:
    """
    Increment generation attempt counter.

    Args:
        session_id: Session UUID
        db_session: Database session

    Returns:
        Updated ChatSessionModel

    Raises:
        ValueError: If session not found
    """
    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    session.generation_attempts += 1
    session.updated_at = datetime.utcnow()

    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def set_generation_status(session_id: UUID, status: str, db_session: Session) -> ChatSessionModel:
    """
    Update generation status.

    Args:
        session_id: Session UUID
        status: "pending" | "success" | "failed"
        db_session: Database session

    Returns:
        Updated ChatSessionModel

    Raises:
        ValueError: If session not found or invalid status
    """
    if status not in ["pending", "success", "failed"]:
        raise ValueError(f"Invalid status: {status}")

    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    session.generation_status = status
    session.updated_at = datetime.utcnow()

    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def get_conversation_history(session_id: UUID, db_session: Session) -> List[Dict[str, str]]:
    """
    Get conversation history formatted for LLM context.

    Args:
        session_id: Session UUID
        db_session: Database session

    Returns:
        List of message dicts with role and content

    Raises:
        ValueError: If session not found
    """
    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    return [
        {"role": msg["role"], "content": msg["content"]}
        for msg in session.messages
    ]

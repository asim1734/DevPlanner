"""
Chat endpoint for PM agent conversation.
Manages multi-turn conversations and PRD drafting with database persistence.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session
from crewai import Crew

from agents import create_pm_agent, create_conversational_task
from schemas.prd import PRDSchema
from services.chat_service import (
    create_session,
    get_session,
    add_message,
    update_prd_draft,
    lock_session,
    get_conversation_history
)
from database import get_session as get_db_session


router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    session_id: Optional[UUID] = Field(None, description="Session ID (creates new if not provided)")
    message: str = Field(..., description="User's message")


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    session_id: UUID = Field(..., description="Session ID for this conversation")
    message: str = Field(..., description="Agent's response")
    prd_draft: Optional[PRDSchema] = Field(None, description="PRD draft if available")
    is_final: bool = Field(False, description="Whether this is the final PRD")


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, db_session: Session = Depends(get_db_session)) -> ChatResponse:
    """
    Chat with the PM agent to iteratively build a PRD.

    This endpoint supports multi-turn conversations where the PM agent asks
    clarifying questions and builds understanding before generating a PRD.

    Args:
        request: ChatRequest with optional session_id and user message
        db_session: Database session

    Returns:
        ChatResponse with agent's response and optional PRD draft

    Raises:
        HTTPException: If conversation fails or session is locked
    """
    try:
        # Get or create session
        if request.session_id:
            session = get_session(request.session_id, db_session)
            if not session:
                raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")
        else:
            session = create_session(db_session)

        # Don't allow messages to locked sessions (PRD already confirmed)
        if session.is_locked:
            raise HTTPException(
                status_code=400,
                detail="Session is locked. PRD has been confirmed. Please create a new session to build a different project."
            )

        # Add user message to history
        add_message(session.id, "user", request.message, db_session)

        # Check if user wants to finalize
        finalize_keywords = ["finalize", "generate prd", "create prd", "looks good", "that works", "perfect"]
        wants_finalization = any(keyword in request.message.lower() for keyword in finalize_keywords)

        # Get conversation history
        history = get_conversation_history(session.id, db_session)

        # Create PM agent
        pm_agent = create_pm_agent()

        # Create appropriate task
        mode = "finalize" if wants_finalization else "discuss"
        task = create_conversational_task(pm_agent, history, mode=mode)

        # Create and run crew
        crew = Crew(
            agents=[pm_agent],
            tasks=[task],
            verbose=False
        )

        result = crew.kickoff()

        # Handle result based on mode
        if mode == "finalize":
            # Extract PRD from result
            if result and hasattr(result, 'json_dict'):
                try:
                    prd = PRDSchema.model_validate(result.json_dict)
                    update_prd_draft(session.id, prd, db_session)

                    agent_message = "I've created your Product Requirements Document. Here it is:"
                    add_message(session.id, "assistant", agent_message, db_session)

                    return ChatResponse(
                        session_id=session.id,
                        message=agent_message,
                        prd_draft=prd,
                        is_final=True
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Failed to validate PRD: {str(e)}")
            else:
                raise HTTPException(status_code=500, detail="Failed to generate PRD")
        else:
            # Conversational response
            if result and hasattr(result, 'raw'):
                agent_message = result.raw
            elif result:
                agent_message = str(result)
            else:
                raise HTTPException(status_code=500, detail="No response from agent")

            add_message(session.id, "assistant", agent_message, db_session)

            # Load latest session to get PRD if available
            session = get_session(session.id, db_session)
            prd_draft = None
            if session.prd_json:
                prd_draft = PRDSchema.model_validate(session.prd_json)

            return ChatResponse(
                session_id=session.id,
                message=agent_message,
                prd_draft=prd_draft,
                is_final=False
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chat failed: {str(e)}"
        )


@router.post("/{session_id}/lock", response_model=ChatResponse)
async def lock_prd(session_id: UUID, db_session: Session = Depends(get_db_session)) -> ChatResponse:
    """
    Lock a session to confirm the PRD and prepare for generation.

    This is the explicit user action that confirms requirements are finalized.
    Once locked, the session cannot accept new messages and is ready for the
    full generation workflow (architect, scrum master, cycle detection).

    Args:
        session_id: UUID of the session to lock
        db_session: Database session

    Returns:
        ChatResponse confirming the lock

    Raises:
        HTTPException: If session not found, already locked, or has no PRD draft
    """
    try:
        session = get_session(session_id, db_session)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        if session.is_locked:
            raise HTTPException(status_code=400, detail="Session is already locked")

        if not session.prd_json:
            raise HTTPException(
                status_code=400,
                detail="Cannot lock session without a PRD draft. Please finalize the PRD first."
            )

        # Lock the session
        session = lock_session(session_id, db_session)

        message = "✅ PRD locked and confirmed! Ready to generate your project. Click 'Generate Project' to begin."

        prd_draft = PRDSchema.model_validate(session.prd_json)

        return ChatResponse(
            session_id=session.id,
            message=message,
            prd_draft=prd_draft,
            is_final=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to lock session: {str(e)}"
        )

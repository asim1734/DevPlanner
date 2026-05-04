"""Generate endpoint with SSE status streaming."""
from __future__ import annotations

import asyncio
import json
import queue
import threading
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlmodel import Session

from database import engine, get_session as get_db_session
from services.chat_service import get_session as get_chat_session
from services.generation_service import generate_project_for_session


router = APIRouter(prefix="/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    """Request body for generation endpoint."""

    session_id: UUID = Field(..., description="Locked chat session UUID")


def _sse(payload: dict) -> str:
    """Format a Server-Sent Event payload line."""
    return f"data: {json.dumps(payload)}\n\n"


@router.post("", response_class=StreamingResponse)
async def generate_project(
    request: GenerateRequest,
    db_session: Session = Depends(get_db_session),
) -> StreamingResponse:
    """
    Generate project outputs from a locked PRD session and stream status updates.

    Validation rules:
    - Session must exist
    - Session must be locked
    - Session must not already be marked success
    """
    session = get_chat_session(request.session_id, db_session)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    if not session.is_locked:
        raise HTTPException(status_code=400, detail="Session must be locked before generation")

    if session.generation_status == "success":
        raise HTTPException(status_code=400, detail="Project was already generated for this session")

    if not session.prd_json:
        raise HTTPException(status_code=400, detail="Session does not contain finalized prd_json")

    async def event_stream():
        events: "queue.Queue[dict]" = queue.Queue()
        done = threading.Event()
        result_holder: dict = {}
        error_holder: dict = {}

        def progress(stage: str, status: str, message: str) -> None:
            events.put({"stage": stage, "status": status, "message": message})

        def worker() -> None:
            try:
                with Session(engine) as worker_session:
                    result = asyncio.run(
                        generate_project_for_session(
                            session_id=request.session_id,
                            db_session=worker_session,
                            progress_callback=progress,
                        )
                    )
                    result_holder["project_id"] = str(result.project.id)
                    result_holder["warnings_count"] = len(result.warnings)
            except Exception as exc:  # pragma: no cover - runtime path in endpoint thread
                    error_holder["error"] = exc
            finally:
                done.set()

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()

        while not done.is_set() or not events.empty():
            while not events.empty():
                yield _sse(events.get())
            await asyncio.sleep(0.1)

        if "error" in error_holder:
            # Sanitize error messages before sending to the client over SSE.
            raw = str(error_holder["error"])
            if (
                "Failed to parse JSON" in raw
                or "Expecting" in raw
                or "unterminated" in raw
                or "JSONDecodeError" in raw
            ):
                user_message = (
                    "Agent returned a malformed response during generation. "
                    "Try retrying generation or edit the PRD to simplify the inputs."
                )
                stage_name = "parse_error"
            else:
                user_message = "Project generation failed. Please retry or check server logs for details."
                stage_name = "failed"

            yield _sse(
                {
                    "stage": stage_name,
                    "status": "error",
                    "message": user_message,
                }
            )
            return

        yield _sse(
            {
                "stage": "complete",
                "status": "success",
                "project_id": result_holder["project_id"],
                "message": "Project generation complete!",
            }
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")

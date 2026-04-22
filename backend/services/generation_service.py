"""Generation service.
Orchestrates crew execution, dependency validation, and DB persistence.
"""
from dataclasses import dataclass
from typing import Callable, List, Optional
from uuid import UUID
import asyncio

from sqlmodel import Session

from agents.crew import run_crew
from models.project import Project
from models.task import Task
from models.dependency import TaskDependency
from models.chat_session import ChatSession
from schemas.prd import PRDSchema
from schemas.wbs import DiagramSchema
from services.chat_service import (
    get_session,
    increment_generation_attempts,
    set_generation_status,
    unlock_session,
)
from services.graph_service import has_cycle, validate_dependency_titles
from services.project_service import save_project_bundle, get_project_by_session, delete_project


@dataclass
class GenerationResult:
    """Result of a completed generation workflow."""

    project: Project
    diagrams: List[DiagramSchema]
    tasks: List[Task]
    dependencies: List[TaskDependency]
    warnings: List[str]


ProgressCallback = Callable[[str, str, str], None]


def _emit_progress(callback: Optional[ProgressCallback], stage: str, status: str, message: str) -> None:
    """Emit generation progress updates when callback is provided."""
    if callback:
        callback(stage, status, message)


async def generate_project_from_prd(
    session_id: UUID,
    prd: PRDSchema,
    db_session: Session,
    progress_callback: Optional[ProgressCallback] = None,
) -> GenerationResult:
    """
    Run full crew orchestration for an approved PRD and persist outputs.

    Raises:
        ValueError: If dependency graph has a cycle
    """
    crew_output = await run_crew(prd, progress_callback=progress_callback)

    warnings = validate_dependency_titles(crew_output.dependencies)

    if has_cycle(crew_output.dependencies):
        raise ValueError("Cycle detected in dependency graph")

    _emit_progress(progress_callback, "saving", "running", "Saving your project to database...")

    project, task_rows, dep_rows = save_project_bundle(
        session_id=session_id,
        prd=prd,
        tasks=crew_output.tasks,
        dependencies=crew_output.dependencies,
        db_session=db_session,
        diagrams_json={"diagrams": [d.model_dump() for d in crew_output.diagrams]},
    )

    _emit_progress(progress_callback, "saving", "completed", "Project data saved.")

    return GenerationResult(
        project=project,
        diagrams=crew_output.diagrams,
        tasks=task_rows,
        dependencies=dep_rows,
        warnings=warnings,
    )


async def generate_project_for_session(
    session_id: UUID,
    db_session: Session,
    progress_callback: Optional[ProgressCallback] = None,
) -> GenerationResult:
    """
    Generate and persist a project for a locked chat session.

    Session requirements:
    - exists
    - is_locked == True
    - prd_json present
    - no existing project already generated for the session
    """
    session = get_session(session_id, db_session)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    if not session.is_locked:
        raise ValueError("Session must be locked before generation")

    if not session.prd_json:
        raise ValueError("Session does not contain finalized prd_json")

    existing_project = get_project_by_session(session_id, db_session)
    if existing_project:
        raise ValueError(f"Project already exists for session {session_id}")

    _emit_progress(progress_callback, "prd", "confirmed", "PRD confirmed")

    increment_generation_attempts(session_id, db_session)
    set_generation_status(session_id, "pending", db_session)

    try:
        prd = PRDSchema.model_validate(session.prd_json)
        result = await generate_project_from_prd(
            session_id=session_id,
            prd=prd,
            db_session=db_session,
            progress_callback=progress_callback,
        )
        set_generation_status(session_id, "success", db_session)
        return result
    except Exception:
        failed = set_generation_status(session_id, "failed", db_session)
        if failed.generation_attempts >= 3:
            unlock_session(session_id, db_session)
        raise


if __name__ == "__main__":
    from database import engine, init_db

    init_db()

    with Session(engine) as db:
        prd = PRDSchema(
            project_name="Phase11 Smoke",
            problem_statement="Validate generation service end-to-end.",
            target_users="Developers",
            core_features=[
                "Generate architecture and ERD diagrams",
                "Generate implementation tasks",
                "Generate dependency graph",
                "Persist generated outputs",
            ],
            out_of_scope=["Billing", "Mobile apps"],
            tech_stack={
                "frontend": "Next.js 14",
                "backend": "FastAPI",
                "database": "PostgreSQL",
                "other": ["CrewAI", "React Flow"],
            },
        )

        chat_session = ChatSession(
            messages=[],
            prd_json=prd.model_dump(),
            is_locked=True,
            generation_status="pending",
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)

        result = asyncio.run(generate_project_for_session(chat_session.id, db))

        print("project_created:", result.project is not None)
        print("diagrams_count:", len(result.diagrams))
        print("tasks_count:", len(result.tasks))
        print("dependencies_count:", len(result.dependencies))
        print("warnings_count:", len(result.warnings))

        deleted = delete_project(result.project.id, db)
        print("cleanup_deleted_project:", deleted)

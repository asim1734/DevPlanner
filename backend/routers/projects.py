"""Project retrieval endpoints (Phase 13)."""
from datetime import datetime
from typing import Any, Dict, List, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session

from database import get_session as get_db_session
from schemas.api import EdgeSchema, NodeSchema, ProjectGraphSchema
from services.project_service import (
    get_project,
    get_project_dependencies,
    get_project_tasks,
    list_projects,
)


router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectSummarySchema(BaseModel):
    """Project list item."""

    id: UUID
    session_id: UUID
    name: str
    description: str
    status: str
    created_at: datetime


class ProjectDetailSchema(ProjectSummarySchema):
    """Detailed project view."""

    prd_json: Dict[str, Any]
    diagrams_json: Dict[str, Any] | None = None
    tasks_count: int = Field(..., ge=0)
    dependencies_count: int = Field(..., ge=0)


@router.get("", response_model=List[ProjectSummarySchema])
async def get_projects(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db_session: Session = Depends(get_db_session),
) -> List[ProjectSummarySchema]:
    """List projects in reverse-chronological order."""
    projects = list_projects(db_session, limit=limit, offset=offset)
    return [
        ProjectSummarySchema(
            id=project.id,
            session_id=project.session_id,
            name=project.name,
            description=project.description,
            status=project.status,
            created_at=project.created_at,
        )
        for project in projects
    ]


@router.get("/{project_id}", response_model=ProjectDetailSchema)
async def get_project_by_id(
    project_id: UUID,
    db_session: Session = Depends(get_db_session),
) -> ProjectDetailSchema:
    """Get a project by id with counts for tasks and dependencies."""
    project = get_project(project_id, db_session)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = get_project_tasks(project_id, db_session)
    dependencies = get_project_dependencies(project_id, db_session)

    return ProjectDetailSchema(
        id=project.id,
        session_id=project.session_id,
        name=project.name,
        description=project.description,
        status=project.status,
        created_at=project.created_at,
        prd_json=project.prd_json,
        diagrams_json=project.diagrams_json,
        tasks_count=len(tasks),
        dependencies_count=len(dependencies),
    )


@router.get("/{project_id}/graph", response_model=ProjectGraphSchema)
async def get_project_graph(
    project_id: UUID,
    db_session: Session = Depends(get_db_session),
) -> ProjectGraphSchema:
    """Get project DAG payload (nodes/edges) for React Flow."""
    project = get_project(project_id, db_session)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = get_project_tasks(project_id, db_session)
    dependencies = get_project_dependencies(project_id, db_session)

    task_id_set = {task.id for task in tasks}

    nodes = [
        NodeSchema(
            id=str(task.id),
            title=task.title,
            description=task.description,
            epic=task.epic,
            effort=task.effort,
            status=task.status,
        )
        for task in tasks
    ]

    edges = [
        EdgeSchema(source=str(dep.depends_on_id), target=str(dep.task_id))
        for dep in dependencies
        if dep.task_id in task_id_set and dep.depends_on_id in task_id_set
    ]

    return ProjectGraphSchema(nodes=nodes, edges=edges)


class TaskStatusUpdateRequest(BaseModel):
    """Request body to update a task's status."""

    status: Literal["todo", "in_progress", "complete"] = Field(
        ..., description="New task status: todo | in_progress | complete"
    )


@router.patch("/{project_id}/tasks/{task_id}")
async def update_task_status(
    project_id: UUID,
    task_id: UUID,
    request: TaskStatusUpdateRequest,
    db_session: Session = Depends(get_db_session),
) -> NodeSchema:
    """Update the status of a task in a project."""
    from services.project_service import update_task_status as update_task_status_service

    updated = update_task_status_service(project_id, task_id, request.status, db_session)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")

    return NodeSchema(
        id=str(updated.id),
        title=updated.title,
        description=updated.description,
        epic=updated.epic,
        effort=updated.effort,
        status=updated.status,
    )

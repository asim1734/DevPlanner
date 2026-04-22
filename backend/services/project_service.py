"""Project persistence service.
Handles storing and retrieving project plans (project, tasks, dependencies).
"""
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlmodel import Session, select

from models.project import Project
from models.task import Task
from models.dependency import TaskDependency
from schemas.prd import PRDSchema
from schemas.graph import ScrumTaskSchema, TaskDependencySchema


def create_project(session_id: UUID, prd: PRDSchema, db_session: Session, diagrams_json: Optional[Dict[str, Any]] = None) -> Project:
    """Create a project record from a finalized PRD."""
    project = Project(
        session_id=session_id,
        name=prd.project_name,
        description=prd.problem_statement,
        prd_json=prd.model_dump(),
        diagrams_json=diagrams_json,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


def get_project(project_id: UUID, db_session: Session) -> Optional[Project]:
    """Fetch a project by id."""
    statement = select(Project).where(Project.id == project_id)
    return db_session.exec(statement).first()


def get_project_by_session(session_id: UUID, db_session: Session) -> Optional[Project]:
    """Fetch a project by originating chat session id."""
    statement = select(Project).where(Project.session_id == session_id)
    return db_session.exec(statement).first()


def list_projects(db_session: Session, limit: int = 100, offset: int = 0) -> List[Project]:
    """List projects in reverse creation order."""
    statement = (
        select(Project)
        .order_by(Project.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db_session.exec(statement).all())


def get_project_tasks(project_id: UUID, db_session: Session) -> List[Task]:
    """List all tasks for a project."""
    statement = select(Task).where(Task.project_id == project_id)
    return list(db_session.exec(statement).all())


def get_project_dependencies(project_id: UUID, db_session: Session) -> List[TaskDependency]:
    """List all dependency edges where the dependent task belongs to the project."""
    tasks = get_project_tasks(project_id, db_session)
    if not tasks:
        return []

    task_ids = [task.id for task in tasks]
    statement = select(TaskDependency).where(TaskDependency.task_id.in_(task_ids))
    return list(db_session.exec(statement).all())


def save_project_bundle(
    session_id: UUID,
    prd: PRDSchema,
    tasks: List[ScrumTaskSchema],
    dependencies: List[TaskDependencySchema],
    db_session: Session,
    diagrams_json: Optional[Dict[str, Any]] = None,
) -> Tuple[Project, List[Task], List[TaskDependency]]:
    """
    Persist a full generated plan in one transaction.

    Saves:
    - Project row
    - Task rows
    - Task dependency rows

    Raises:
        ValueError: If a project already exists for the session
    """
    existing = get_project_by_session(session_id, db_session)
    if existing:
        raise ValueError(f"Project already exists for session {session_id}")

    project = Project(
        session_id=session_id,
        name=prd.project_name,
        description=prd.problem_statement,
        prd_json=prd.model_dump(),
        diagrams_json=diagrams_json,
    )
    db_session.add(project)
    db_session.flush()

    task_models: List[Task] = []
    title_to_task_id: Dict[str, UUID] = {}

    for task in tasks:
        task_model = Task(
            project_id=project.id,
            title=task.title,
            description=task.description,
            epic=task.epic,
            effort=task.effort,
            status="todo",
        )
        db_session.add(task_model)
        db_session.flush()
        task_models.append(task_model)
        title_to_task_id[task_model.title] = task_model.id

    dependency_models: List[TaskDependency] = []
    seen_edges = set()

    for dep in dependencies:
        dependent_id = title_to_task_id.get(dep.title)
        if not dependent_id:
            continue

        for prereq_title in dep.depends_on:
            prereq_id = title_to_task_id.get(prereq_title)
            if not prereq_id:
                continue

            edge = (dependent_id, prereq_id)
            if dependent_id == prereq_id or edge in seen_edges:
                continue

            seen_edges.add(edge)
            dep_model = TaskDependency(task_id=dependent_id, depends_on_id=prereq_id)
            db_session.add(dep_model)
            dependency_models.append(dep_model)

    db_session.commit()
    db_session.refresh(project)

    return project, task_models, dependency_models


def update_task_status(project_id: UUID, task_id: UUID, status: str, db_session: Session) -> Optional[Task]:
    """Update a task status for a project."""
    if status not in {"todo", "in_progress", "complete"}:
        raise ValueError(f"Invalid task status: {status}")

    statement = select(Task).where(Task.id == task_id, Task.project_id == project_id)
    task = db_session.exec(statement).first()
    if not task:
        return None

    task.status = status
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task


def delete_project(project_id: UUID, db_session: Session) -> bool:
    """Delete a project and its tasks/dependencies."""
    project = get_project(project_id, db_session)
    if not project:
        return False

    tasks = get_project_tasks(project_id, db_session)
    task_ids = [task.id for task in tasks]

    if task_ids:
        dep_statement = select(TaskDependency).where(
            TaskDependency.task_id.in_(task_ids) | TaskDependency.depends_on_id.in_(task_ids)
        )
        for dep in db_session.exec(dep_statement).all():
            db_session.delete(dep)

        for task in tasks:
            db_session.delete(task)

        # Commit child deletions first to satisfy FK constraints before deleting project.
        db_session.commit()

    db_session.delete(project)
    db_session.commit()
    return True


if __name__ == "__main__":
    # Real PostgreSQL smoke test for Phase 10 persistence service.
    from database import engine, init_db
    from models.chat_session import ChatSession

    init_db()

    with Session(engine) as db:
        chat_session = ChatSession(messages=[])
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)

        prd = PRDSchema(
            project_name="Phase10 Smoke",
            problem_statement="Validate project persistence service",
            target_users="Developers",
            core_features=["Persist project", "Persist tasks", "Persist dependencies"],
            out_of_scope=["UI"],
            tech_stack={
                "frontend": "Next.js",
                "backend": "FastAPI",
                "database": "PostgreSQL",
                "other": ["CrewAI"],
            },
        )

        tasks = [
            ScrumTaskSchema(
                title="Create project record",
                description="Insert project row from finalized PRD.",
                epic="Backend",
                effort="S",
            ),
            ScrumTaskSchema(
                title="Create task records",
                description="Insert generated tasks linked to project.",
                epic="Backend",
                effort="S",
            ),
            ScrumTaskSchema(
                title="Create dependency edges",
                description="Insert dependency rows between tasks.",
                epic="Backend",
                effort="S",
            ),
        ]

        dependencies = [
            TaskDependencySchema(
                title="Create task records",
                depends_on=["Create project record"],
            ),
            TaskDependencySchema(
                title="Create dependency edges",
                depends_on=["Create task records"],
            ),
        ]

        project, _, _ = save_project_bundle(
            session_id=chat_session.id,
            prd=prd,
            tasks=tasks,
            dependencies=dependencies,
            db_session=db,
        )

        persisted_project = get_project(project.id, db)
        persisted_tasks = get_project_tasks(project.id, db)
        persisted_deps = get_project_dependencies(project.id, db)

        print("project_created:", persisted_project is not None)
        print("tasks_count:", len(persisted_tasks))
        print("dependencies_count:", len(persisted_deps))

        deleted = delete_project(project.id, db)
        print("cleanup_deleted_project:", deleted)

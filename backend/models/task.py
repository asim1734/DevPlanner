"""
Task database model.
Represents a node in the DAG.
"""
from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4


class Task(SQLModel, table=True):
    """
    Represents a development task (DAG node).

    Table: tasks
    """
    __tablename__ = "tasks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", nullable=False)
    title: str = Field(max_length=255, nullable=False)
    description: str = Field(nullable=False)
    epic: str = Field(max_length=100, nullable=False)  # e.g., "Backend", "Frontend"
    effort: str = Field(max_length=1, nullable=False)  # "S" | "M" | "L"
    status: str = Field(default="todo", max_length=50)  # "todo" | "in_progress" | "complete"

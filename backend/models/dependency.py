"""
TaskDependency database model.
Represents edges in the DAG.
"""
from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4


class TaskDependency(SQLModel, table=True):
    """
    Represents a dependency relationship between tasks (DAG edge).

    Table: task_dependencies

    Semantics: task_id CANNOT start until depends_on_id is complete.
    """
    __tablename__ = "task_dependencies"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID = Field(foreign_key="tasks.id", nullable=False)  # the dependent task
    depends_on_id: UUID = Field(foreign_key="tasks.id", nullable=False)  # the prerequisite task

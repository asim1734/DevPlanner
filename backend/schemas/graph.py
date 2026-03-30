"""
Graph and Scrum outputs.
Scrum Master produces tasks (Phase 8) and dependencies (Phase 9).
"""
from pydantic import BaseModel, Field
from typing import List, Literal


class ScrumTaskSchema(BaseModel):
    """Single Scrum task derived from PRD + architecture/ERD diagrams."""

    title: str = Field(..., description="Specific task title mapped to PRD features")
    description: str = Field(..., description="1-2 sentence implementation detail grounded in PRD and diagrams")
    epic: str = Field(..., description="Epic grouping (e.g., Backend, Frontend, Database, Infrastructure, QA)")
    effort: Literal["S", "M", "L"] = Field(..., description="Relative effort sizing")


class ScrumTaskListSchema(BaseModel):
    """Flat list of Scrum tasks (Phase 8 output)."""

    tasks: List[ScrumTaskSchema] = Field(..., description="12-20 atomic, feature-mapped tasks")


class GraphTaskSchema(BaseModel):
    """
    A task node in the dependency graph.
    Only includes the task title and its dependencies.
    """

    title: str = Field(..., description="Task title (must match WBS task title)")
    depends_on: List[str] = Field(
        default_factory=list,
        description="List of task titles this task depends on (prerequisites)"
    )


class GraphSchema(BaseModel):
    """
    Complete dependency graph (DAG).
    Structured output from the Scrum Master agent.
    """

    tasks: List[GraphTaskSchema] = Field(..., description="All tasks with their dependencies")

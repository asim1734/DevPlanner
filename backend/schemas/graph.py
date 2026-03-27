"""
Graph schemas for DAG (Directed Acyclic Graph) representation.
Output format for the Scrum Master agent.
"""
from pydantic import BaseModel, Field
from typing import List


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

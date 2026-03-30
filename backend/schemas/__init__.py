"""
Pydantic schemas for API validation and LLM structured outputs.
Separate from SQLModel database models.
"""
from .prd import PRDSchema, TechStackSchema
from .wbs import ArchitectOutputSchema, DiagramSchema
from .graph import (
    GraphSchema,
    GraphTaskSchema,
    ScrumTaskSchema,
    ScrumTaskListSchema,
    TaskDependencySchema,
    DependencyGraphSchema,
)
from .api import NodeSchema, EdgeSchema, ProjectGraphSchema

__all__ = [
    # PM Agent Output
    "PRDSchema",
    "TechStackSchema",
    # Architect Agent Output
    "ArchitectOutputSchema",
    "DiagramSchema",
    # Scrum Agent Output
    "ScrumTaskSchema",
    "ScrumTaskListSchema",
    "GraphSchema",
    "GraphTaskSchema",
    "TaskDependencySchema",
    "DependencyGraphSchema",
    # API Responses
    "NodeSchema",
    "EdgeSchema",
    "ProjectGraphSchema",
]

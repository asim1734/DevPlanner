"""
Pydantic schemas for API validation and LLM structured outputs.
Separate from SQLModel database models.
"""
from .prd import PRDSchema, TechStackSchema
from .wbs import ArchitectOutputSchema, DiagramSchema
from .graph import GraphSchema, GraphTaskSchema
from .api import NodeSchema, EdgeSchema, ProjectGraphSchema

__all__ = [
    # PM Agent Output
    "PRDSchema",
    "TechStackSchema",
    # Architect Agent Output
    "ArchitectOutputSchema",
    "DiagramSchema",
    # Scrum Agent Output
    "GraphSchema",
    "GraphTaskSchema",
    # API Responses
    "NodeSchema",
    "EdgeSchema",
    "ProjectGraphSchema",
]

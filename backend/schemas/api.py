"""
API response schemas.
DTOs sent to the frontend for visualization.
"""
from pydantic import BaseModel, Field
from typing import List


class NodeSchema(BaseModel):
    """
    A task node in the visual DAG.
    Combines task metadata for frontend rendering.
    """

    id: str = Field(..., description="Task UUID")
    title: str = Field(..., description="Task title")
    description: str = Field(..., description="Task description")
    epic: str = Field(..., description="Epic grouping label")
    effort: str = Field(..., description="Effort estimate (S/M/L)")
    status: str = Field(..., description="Task status (todo/in_progress/complete)")


class EdgeSchema(BaseModel):
    """
    A dependency edge in the visual DAG.
    Points from prerequisite (source) to dependent (target).
    """

    source: str = Field(..., description="Source task ID (prerequisite)")
    target: str = Field(..., description="Target task ID (dependent)")


class ProjectGraphSchema(BaseModel):
    """
    Complete project graph ready for React Flow visualization.
    """

    nodes: List[NodeSchema] = Field(..., description="All task nodes")
    edges: List[EdgeSchema] = Field(..., description="All dependency edges")

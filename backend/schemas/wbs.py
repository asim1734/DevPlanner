"""
WBS (Work Breakdown Structure) schemas.
Output format for the Architect agent.
"""
from pydantic import BaseModel, Field
from typing import List, Literal


class WBSTaskSchema(BaseModel):
    """
    A single task in the Work Breakdown Structure.
    Each task is atomic and independently implementable.
    """

    title: str = Field(..., description="Concise task title")
    description: str = Field(..., description="Detailed implementation description")
    epic: str = Field(..., description="Grouping label (e.g., Backend, Frontend, Database)")
    effort: Literal["S", "M", "L"] = Field(..., description="Effort estimate (Small, Medium, Large)")


class WBSSchema(BaseModel):
    """
    Complete Work Breakdown Structure.
    Structured output from the Architect agent.
    """

    tasks: List[WBSTaskSchema] = Field(..., description="List of all development tasks")

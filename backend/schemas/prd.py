"""
PRD (Product Requirements Document) schemas.
Output format for the Product Manager agent.
"""
from pydantic import BaseModel, Field
from typing import List


class TechStackSchema(BaseModel):
    """Technology stack chosen for the project."""

    frontend: str = Field(..., description="Frontend framework (e.g., React, Next.js)")
    backend: str = Field(..., description="Backend framework (e.g., FastAPI, Django)")
    database: str = Field(..., description="Database system (e.g., PostgreSQL, MongoDB)")
    other: List[str] = Field(default_factory=list, description="Additional technologies")


class PRDSchema(BaseModel):
    """
    Product Requirements Document.
    Structured output from the Product Manager agent.
    """

    project_name: str = Field(..., description="Clear, concise project name")
    problem_statement: str = Field(..., description="What problem does this solve?")
    target_users: str = Field(..., description="Who will use this product?")
    core_features: List[str] = Field(..., description="List of core features (3-10 items)")
    out_of_scope: List[str] = Field(default_factory=list, description="What is explicitly NOT included")
    tech_stack: TechStackSchema = Field(..., description="Technology choices")

"""
Product Manager Agent.
Handles conversational requirements gathering and PRD generation.
"""
from crewai import Agent, Task
from .llm import get_llm
from schemas.prd import PRDSchema


def create_pm_agent() -> Agent:
    """
    Create the Product Manager agent.

    This agent is responsible for:
    - Gathering requirements through conversation
    - Understanding user needs and constraints
    - Generating a structured PRD

    Returns:
        Agent: Configured PM agent
    """
    return Agent(
        role="Product Manager",
        goal="Understand user requirements and create a clear, actionable Product Requirements Document",
        backstory=(
            "You are an experienced Product Manager who excels at asking the right questions "
            "to understand what users really need. You're skilled at translating vague ideas "
            "into concrete, well-structured product requirements. You focus on identifying "
            "the core problem, target users, essential features, and appropriate technology choices."
        ),
        llm=get_llm(),
        verbose=True,
        allow_delegation=False
    )


def create_prd_task(agent: Agent, user_input: str) -> Task:
    """
    Create a PRD generation task for the PM agent.

    Args:
        agent: The PM agent
        user_input: Initial user requirements/description

    Returns:
        Task: Configured task for PRD generation
    """
    return Task(
        description=(
            f"Based on this user request: '{user_input}'\n\n"
            "Generate a comprehensive Product Requirements Document that includes:\n"
            "1. A clear, concise project name\n"
            "2. The core problem being solved\n"
            "3. Target users (who will use this)\n"
            "4. Core features (3-10 essential features only)\n"
            "5. What is out of scope (things we won't build)\n"
            "6. Technology stack recommendations (frontend, backend, database)\n\n"
            "Be specific and actionable. Focus on MVP features only."
        ),
        expected_output="A complete PRD with all required fields populated",
        agent=agent,
        output_pydantic=PRDSchema
    )

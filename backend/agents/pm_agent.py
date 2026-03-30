"""
Product Manager Agent.
Handles conversational requirements gathering and PRD generation.
"""
from typing import List, Dict
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
        goal="Understand user requirements through conversation and create a clear, actionable Product Requirements Document",
        backstory=(
            "You are an experienced Product Manager who excels at asking the right questions "
            "to understand what users really need. You're skilled at having productive conversations "
            "that uncover true requirements. You know when to ask clarifying questions and when "
            "you have enough information to propose a PRD. You focus on identifying the core problem, "
            "target users, essential features, and appropriate technology choices."
        ),
        llm=get_llm(),
        verbose=True,
        allow_delegation=False
    )


def create_prd_task(agent: Agent, user_input: str) -> Task:
    """
    Create a PRD generation task for the PM agent (one-shot mode).

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
        output_json=PRDSchema
    )


def create_conversational_task(
    agent: Agent,
    conversation_history: List[Dict[str, str]],
    mode: str = "discuss"
) -> Task:
    """
    Create a conversational task for the PM agent.

    Args:
        agent: The PM agent
        conversation_history: List of {role, content} message dicts
        mode: "discuss" for conversation, "finalize" for PRD generation

    Returns:
        Task: Configured conversational task
    """
    # Format conversation history
    history_text = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in conversation_history
    ])

    if mode == "finalize":
        # User wants final PRD
        description = (
            f"Based on the following conversation:\n\n{history_text}\n\n"
            "Generate a PRD with these exact fields:\n"
            "- project_name: Short name (max 30 chars)\n"
            "- problem_statement: What problem it solves (max 150 chars)\n"
            "- target_users: Who uses it (max 100 chars)\n"
            "- core_features: List of 4-6 features (each max 50 chars)\n"
            "- out_of_scope: List of 3-4 excluded items (each max 40 chars)\n"
            "- tech_stack: {frontend, backend, database, other}\n\n"
            "Keep everything concise and focused on MVP."
        )
        return Task(
            description=description,
            expected_output="A complete PRD with all required fields populated",
            agent=agent,
            output_json=PRDSchema
        )
    else:
        # Conversational mode - ask questions or discuss
        description = (
            f"You are having a conversation with a user about their project idea. "
            f"Here's the conversation so far:\n\n{history_text}\n\n"
            "Your goal is to understand their requirements better. You should:\n"
            "- Ask clarifying questions about unclear aspects\n"
            "- Probe for more details on core features, target users, and constraints\n"
            "- Help them think through their idea\n"
            "- When you feel you have enough information, you can suggest creating a PRD\n"
            "- Be conversational and helpful\n\n"
            "Respond to the user's latest message."
        )
        return Task(
            description=description,
            expected_output="A helpful, conversational response that moves the discussion forward",
            agent=agent
        )


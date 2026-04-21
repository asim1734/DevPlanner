"""
Architect Agent.
Generates Work Breakdown Structures (WBS) from approved PRDs.
"""
from crewai import Agent, Task
from schemas.prd import PRDSchema
from schemas.wbs import ArchitectOutputSchema
from .llm import get_llm
from utils import parse_agent_output


def create_architect_agent() -> Agent:
    """
    Create the Architect agent responsible for generating
    system diagrams from approved PRDs.
    """
    return Agent(
        role="Senior Software Architect",
        goal=(
            "Generate accurate system and data diagrams directly from approved PRDs."
        ),
        backstory=(
            "You are a Senior Software Architect. Given a PRD, you produce exactly two Mermaid.js diagrams "
            "that accurately reflect the system described. You derive everything from the PRD — you never "
            "invent components or entities that are not implied by the features and tech stack. Your Mermaid "
            "syntax is always valid and renderable."
        ),
        llm=get_llm(),
        verbose=True,
        allow_delegation=False,
    )


def create_architect_task(agent: Agent, prd: PRDSchema) -> Task:
    """Create a diagram-only generation task for the Architect agent."""

    description = (
        "Generate exactly 2 diagrams from the PRD:\n\n"
        "Diagram 1 — System Architecture (type: architecture):\n"
        "- Use Mermaid graph TD syntax\n"
        "- Show all major system components and connections\n"
        "- Derive components from the PRD tech stack and features\n"
        "- Include: browser/client, frontend framework, backend framework, database, and any external services mentioned (e.g. Groq API, CrewAI, Stripe, Firebase)\n"
        "- Use descriptive node labels, not generic ones\n"
        "- Example (derive from PRD, never hardcode this):\n"
        "  graph TD\n"
        "    Browser-->|HTTP|NextJS\n"
        "    NextJS-->|REST API|FastAPI\n"
        "    FastAPI-->|SQL|PostgreSQL\n"
        "    FastAPI-->|LLM calls|GroqAPI\n"
        "    FastAPI-->|orchestration|CrewAI\n\n"
        "Diagram 2 — ERD (type: erd):\n"
        "- Use Mermaid erDiagram syntax\n"
        "- Derive tables and relationships from PRD features only\n"
        "- Include primary keys, foreign keys, and cardinality\n"
        "- Never include entities not implied by the PRD\n"
        "- The PRD is stored as a JSONB column in CHAT_SESSIONS, not as a separate table. Never generate a PRD_DRAFTS entity in the ERD.\n"
        "- Example (derive from PRD, never hardcode this):\n"
        "  erDiagram\n"
        "    CHAT_SESSIONS ||--o{ PROJECTS : generates\n"
        "    PROJECTS ||--o{ TASKS : contains\n"
        "    TASKS ||--o{ TASK_DEPENDENCIES : has\n\n"
        "Output only the two diagrams. Nothing else.\n"
        "Output format (JSON only): {\n"
        "  \"diagrams\": [\n"
        "    { \"title\": \"System Architecture\", \"type\": \"architecture\", \"mermaid\": \"<graph TD mermaid>\" },\n"
        "    { \"title\": \"Entity Relationship Diagram\", \"type\": \"erd\", \"mermaid\": \"<erDiagram mermaid>\" }\n"
        "  ]\n"
        "}\n"
        "Use keys 'title' and 'mermaid' only (never 'syntax'). Titles must be present for both diagrams.\n"
        f"\nProject Name: {prd.project_name}\n"
        f"Problem Statement: {prd.problem_statement}\n"
        f"Target Users: {prd.target_users}\n"
        f"Core Features: {', '.join(prd.core_features)}\n"
        f"Out of Scope: {', '.join(prd.out_of_scope)}\n"
        "Tech Stack:\n"
        f"- Frontend: {prd.tech_stack.frontend}\n"
        f"- Backend: {prd.tech_stack.backend}\n"
        f"- Database: {prd.tech_stack.database}\n"
        f"- Other: {', '.join(prd.tech_stack.other) if prd.tech_stack.other else 'None'}\n"
        "IMPORTANT: Your response must be raw JSON only. Do not wrap it in ```json``` or any other formatting. Do not add any text before or after the JSON object."
    )

    return Task(
        description=description,
        expected_output=(
            "Exactly two Mermaid.js diagrams derived from the PRD. Each diagram must include keys: title, type, mermaid. Return ONLY a valid JSON object. No markdown, no code fences, no explanation. Raw JSON only."
        ),
        agent=agent,
    )



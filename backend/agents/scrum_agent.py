"""
Scrum Master Agent.
Phase 8: Generates atomic development tasks grounded in PRD + diagrams.
"""
from crewai import Agent, Crew, Task
from schemas.prd import PRDSchema
from schemas.wbs import ArchitectOutputSchema
from schemas.graph import ScrumTaskListSchema
from .llm import get_llm
from utils import parse_agent_output


def create_scrum_agent() -> Agent:
    """Create the Scrum Master agent for task generation."""
    return Agent(
        role="Senior Scrum Master",
        goal=(
            "Generate a precise, non-generic task list derived from the PRD and architecture/ERD diagrams."
        ),
        backstory=(
            "You create 12-20 specific, atomic development tasks. Every task ties directly to PRD features "
            "and is grounded in both the architecture diagram components and ERD entities. You never invent "
            "features or components not implied by the inputs, and you avoid generic boilerplate like setup tasks."
        ),
        llm=get_llm(),
        verbose=True,
        allow_delegation=False,
    )


def create_scrum_task_generation_task(
    agent: Agent, prd: PRDSchema, diagrams: ArchitectOutputSchema
) -> Task:
    """Create the task generation prompt for Phase 8."""

    architecture_mermaid = diagrams.diagrams[0].mermaid if diagrams.diagrams else ""
    erd_mermaid = diagrams.diagrams[1].mermaid if len(diagrams.diagrams) > 1 else ""

    description = (
        "Generate exactly one JSON object with a `tasks` array (no prose, no extra keys). Return 12-20 atomic development tasks derived from the PRD and diagrams.\n\n"
        "Rules for every task:\n"
        "- Each task must map to a PRD feature AND be grounded in architecture components AND ERD entities/names.\n"
        "- Do not include anything out of scope.\n"
        "- If a task is out of scope, do NOT include it in the output at all. Omit it entirely. Never include a task with description 'This task is out of scope'.\n"
        "- No generic boilerplate (e.g., 'Set up CI', 'Configure FastAPI', 'Initialize Next.js').\n"
        "- Each task includes: title, description (1-2 sentences), epic (Backend, Frontend, Database, Infrastructure, QA), effort (S/M/L).\n"
        "- Titles must be specific (e.g., 'Implement POST /chat endpoint with session history and PM agent invocation').\n"
        "- Descriptions state what to build, what it connects to, and done criteria.\n"
        "- Do not invent components/entities beyond the PRD and diagrams.\n"
        "- Avoid duplicates and overlapping scope.\n\n"
        "Output format (JSON only): {\n  \"tasks\": [ { \"title\": ..., \"description\": ..., \"epic\": ..., \"effort\": ... }, ... ]\n}\n\n"
        "Inputs:\n"
        f"PRD Project Name: {prd.project_name}\n"
        f"Problem Statement: {prd.problem_statement}\n"
        f"Target Users: {prd.target_users}\n"
        f"Core Features: {', '.join(prd.core_features)}\n"
        f"Out of Scope: {', '.join(prd.out_of_scope)}\n"
        "Tech Stack:\n"
        f"- Frontend: {prd.tech_stack.frontend}\n"
        f"- Backend: {prd.tech_stack.backend}\n"
        f"- Database: {prd.tech_stack.database}\n"
        f"- Other: {', '.join(prd.tech_stack.other) if prd.tech_stack.other else 'None'}\n\n"
        "Architecture Diagram (Mermaid):\n"
        f"{architecture_mermaid}\n\n"
        "ERD Diagram (Mermaid):\n"
        f"{erd_mermaid}\n"
        "IMPORTANT: Your response must be raw JSON only. Do not wrap it in ```json``` or any other formatting. Do not add any text before or after the JSON object."
    )

    return Task(
        description=description,
        expected_output=(
            "JSON object with 12-20 tasks under `tasks`, grounded in PRD + diagrams. Return ONLY a valid JSON object. No markdown, no code fences, no explanation. Raw JSON only."
        ),
        agent=agent,
    )


# --- Smoke test ---
def _mock_prd() -> PRDSchema:
    return PRDSchema(
        project_name="TeamHub",
        problem_statement=(
            "Small dev teams need a single hub to track tasks and dependencies during early product builds."
        ),
        target_users="Early-stage software teams (3-10 engineers)",
        core_features=[
            "Chat with PM assistant to capture requirements",
            "Generate PRD drafts for review",
            "Create WBS with epics and tasks",
            "Map dependencies as a DAG",
            "View project graph in dashboard",
        ],
        out_of_scope=["User authentication", "Email notifications", "Mobile apps", "Automated scheduling"],
        tech_stack={
            "frontend": "Next.js 14",
            "backend": "FastAPI",
            "database": "PostgreSQL",
            "other": ["CrewAI", "React Flow"],
        },
    )


def _mock_architect_output() -> ArchitectOutputSchema:
    return ArchitectOutputSchema(
        diagrams=[
            {
                "title": "System Architecture",
                "type": "architecture",
                "mermaid": (
                    "graph TD\n"
                    "  Browser-->|HTTP|NextJS\n"
                    "  NextJS-->|REST API|FastAPI\n"
                    "  FastAPI-->|SQL|PostgreSQL\n"
                    "  FastAPI-->|orchestration|CrewAI\n"
                    "  NextJS-->|uses|React Flow"
                ),
            },
            {
                "title": "Entity Relationship Diagram",
                "type": "erd",
                "mermaid": (
                    "erDiagram\n"
                    "  PROJECTS ||--o{ TASKS : contains\n"
                    "  TASKS ||--o{ TASK_DEPENDENCIES : has\n"
                    "  CHAT_SESSIONS ||--o{ PROJECTS : generates\n"
                    "  PRD_DRAFTS ||--o{ PROJECTS : associated_with"
                ),
            },
        ]
    )


if __name__ == "__main__":
    prd = _mock_prd()
    diagrams = _mock_architect_output()
    scrum = create_scrum_agent()
    task = create_scrum_task_generation_task(scrum, prd, diagrams)

    crew = Crew(agents=[scrum], tasks=[task])
    print("Running Scrum Master agent (Phase 8: tasks)...\n")
    crew.kickoff()

    try:
        raw = task.output.raw  # type: ignore[attr-defined]
        validated = parse_agent_output(raw, ScrumTaskListSchema)
        print("\nValidated tasks output:\n")
        print(validated)

        print("\nTasks:\n")
        for t in validated.tasks:
            print(f"- [{t.epic}] {t.title} (effort {t.effort}): {t.description}")
    except Exception as exc:
        print(f"\nCould not pretty-print structured output: {exc}")

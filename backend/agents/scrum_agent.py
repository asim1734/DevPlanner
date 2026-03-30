"""
Scrum Master Agent.
Phase 8: Generates atomic development tasks grounded in PRD + diagrams.
"""
from collections import defaultdict, deque
from crewai import Agent, Crew, Task
from schemas.prd import PRDSchema
from schemas.wbs import ArchitectOutputSchema
from schemas.graph import ScrumTaskListSchema, DependencyGraphSchema
from .llm import get_llm
from utils import parse_agent_output
from services.graph_service import has_cycle, validate_dependency_titles


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
        "- Do NOT generate any task related to a PRD_DRAFTS table. PRD data is stored as a JSONB column inside chat_sessions, not as a separate table. Any task mentioning PRD_DRAFTS must be omitted entirely.\n"
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


def create_dependency_task(
    agent: Agent, task_list: ScrumTaskListSchema, context_tasks: list
) -> Task:
    """Create the dependency mapping task (Phase 8.5)."""

    titles = [t.title for t in task_list.tasks]
    formatted_titles = "\n".join(f"- {title}" for title in titles)

    description = (
        "You are given a list of development tasks. Map the dependency relationships between them.\n\n"
        "Rules:\n"
        "- A task depends on another ONLY if it literally cannot start until the other is complete.\n"
        "- Be conservative — only add dependencies that are technically necessary, not just logically related.\n"
        "- Never create circular dependencies (A→B→A).\n"
        "- Every task title in depends_on must exactly match a title from the provided task list.\n"
        "- Tasks with no dependencies should have empty depends_on list.\n"
        "- Return ONLY raw JSON. No markdown, no explanation.\n\n"
        "Task list:\n"
        f"{formatted_titles}\n\n"
        "Output format:\n"
        "{\n"
        "  'dependencies': [\n"
        "    {'title': 'task title', 'depends_on': ['other title']},\n"
        "    {'title': 'task title 2', 'depends_on': []},\n"
        "    ...\n"
        "  ]\n"
        "}\n\n"
        "IMPORTANT: Your response must be raw JSON only. Do not wrap it in backticks or any other formatting."
    )

    return Task(
        description=description,
        expected_output="Raw JSON dependency graph",
        agent=agent,
        context=context_tasks,
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

    # Phase 8: Task generation
    phase8_task = create_scrum_task_generation_task(scrum, prd, diagrams)
    crew_phase8 = Crew(agents=[scrum], tasks=[phase8_task])
    print("Running Scrum Master agent (Phase 8: tasks)...\n")
    crew_phase8.kickoff()

    try:
        raw_tasks = phase8_task.output.raw  # type: ignore[attr-defined]
        validated_tasks = parse_agent_output(raw_tasks, ScrumTaskListSchema)
        print("\nValidated tasks output:\n")
        print(validated_tasks)

        print("\nTasks:\n")
        for t in validated_tasks.tasks:
            print(f"- [{t.epic}] {t.title} (effort {t.effort}): {t.description}")
    except Exception as exc:
        print(f"\nCould not pretty-print structured output: {exc}")
        raise

    # Phase 8.5: Dependency mapping
    dependency_task = create_dependency_task(scrum, validated_tasks, [phase8_task])
    crew_phase85 = Crew(agents=[scrum], tasks=[dependency_task])
    print("\nRunning Scrum Master agent (Phase 8.5: dependencies)...\n")
    crew_phase85.kickoff()

    try:
        raw_deps = dependency_task.output.raw  # type: ignore[attr-defined]
        validated_deps = parse_agent_output(raw_deps, DependencyGraphSchema)
        print("\nValidated dependencies output:\n")
        print(validated_deps)

        print("\nDependencies:\n")
        for dep in validated_deps.dependencies:
            depends = ", ".join(dep.depends_on) if dep.depends_on else "[]"
            print(f"- {dep.title} -> {depends}")

        unknown_refs = validate_dependency_titles(validated_deps.dependencies)
        if unknown_refs:
            print("\nUnknown dependency references:\n")
            for ref in unknown_refs:
                print(f"- {ref}")
        else:
            print("\nUnknown dependency references: []")

        cycle = has_cycle(validated_deps.dependencies)
        print(f"\nCycle detected: {cycle}")

        if cycle:
            # Compute residual in-degrees after Kahn's algorithm for debugging
            task_titles = {t.title for t in validated_deps.dependencies}
            in_degree = defaultdict(int)
            adjacency = defaultdict(list)
            for dep in validated_deps.dependencies:
                _ = in_degree[dep.title]
                for parent in dep.depends_on:
                    if parent not in task_titles:
                        continue
                    adjacency[parent].append(dep.title)
                    in_degree[dep.title] += 1

            queue = deque([title for title in task_titles if in_degree[title] == 0])
            while queue:
                node = queue.popleft()
                for neighbor in adjacency[node]:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        queue.append(neighbor)

            stuck = {title: deg for title, deg in in_degree.items() if deg > 0}
            if stuck:
                print("Tasks with unresolved in-degree (cycle suspects):")
                for title, deg in stuck.items():
                    print(f"- {title}: in_degree={deg}")
            else:
                print("No residual in-degree detected (unexpected).")
    except Exception as exc:
        print(f"\nCould not pretty-print dependency output: {exc}")
        raise

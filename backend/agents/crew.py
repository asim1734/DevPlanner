"""Phase 9: Crew orchestration to run Architect -> Scrum tasks -> Dependencies.

Note: PM agent is **not** invoked here. By the time `run_crew` is called
from /generate, the PRD is already finalized (locked) in chat_sessions.prd_json.
`run_crew` always receives a PRDSchema input.
"""
from dataclasses import dataclass
from typing import List
import asyncio

from crewai import Crew, Process

from schemas import (
    PRDSchema,
    DiagramSchema,
    ArchitectOutputSchema,
    ScrumTaskListSchema,
    ScrumTaskSchema,
    DependencyGraphSchema,
    TaskDependencySchema,
)
from agents.architect_agent import create_architect_agent, create_architect_task
from agents.scrum_agent import (
    create_scrum_agent,
    create_scrum_task_generation_task,
    create_dependency_task,
)
from services.graph_service import has_cycle, validate_dependency_titles
from utils import parse_agent_output


@dataclass
class CrewOutput:
    prd: PRDSchema
    diagrams: List[DiagramSchema]
    tasks: List[ScrumTaskSchema]
    dependencies: List[TaskDependencySchema]


def _mock_prd() -> PRDSchema:
    """Local-only smoke PRD; swap contents to see different outputs."""

    return PRDSchema(
        project_name="FeatureFlags Pro",
        problem_statement=(
            "Teams need an easy way to manage feature flags and rollout rules without redeploying services."
        ),
        target_users="Backend and frontend engineers at SaaS companies",
        core_features=[
            "Create and manage boolean and multivariate feature flags",
            "Target rollouts by environment, user segment, and percentage",
            "Audit log of flag changes",
            "SDK exposure for Next.js frontend and FastAPI backend",
            "Dependency graph of flags and services",
        ],
        out_of_scope=[
            "Billing and payments",
            "SSO integration",
            "Mobile SDKs",
            "Email notifications",
        ],
        tech_stack={
            "frontend": "Next.js 14",
            "backend": "FastAPI",
            "database": "PostgreSQL",
            "other": ["CrewAI", "React Flow"],
        },
    )


async def run_crew(prd: PRDSchema) -> CrewOutput:
    # Step 1: Architect
    architect = create_architect_agent()
    architect_task = create_architect_task(architect, prd)
    crew_arch = Crew(agents=[architect], tasks=[architect_task], process=Process.sequential, verbose=True)
    crew_arch.kickoff()
    arch_output = parse_agent_output(architect_task.output.raw, ArchitectOutputSchema)

    # Step 2: Scrum tasks (Phase 8)
    scrum = create_scrum_agent()
    task_gen_task = create_scrum_task_generation_task(scrum, prd, arch_output)
    crew_tasks = Crew(agents=[scrum], tasks=[task_gen_task], process=Process.sequential, verbose=True)
    crew_tasks.kickoff()
    task_list = parse_agent_output(task_gen_task.output.raw, ScrumTaskListSchema)

    # Step 3: Dependencies (Phase 8.5)
    dep_task = create_dependency_task(scrum, task_list, [task_gen_task])
    crew_deps = Crew(agents=[scrum], tasks=[dep_task], process=Process.sequential, verbose=True)
    crew_deps.kickoff()
    dep_list = parse_agent_output(dep_task.output.raw, DependencyGraphSchema)

    # Step 4: Validate
    unknown_refs = validate_dependency_titles(dep_list.dependencies)
    if unknown_refs:
        print("Unknown dependency references:")
        for ref in unknown_refs:
            print(f"- {ref}")

    if has_cycle(dep_list.dependencies):
        raise ValueError("Cycle detected in dependency graph")

    return CrewOutput(
        prd=prd,
        diagrams=arch_output.diagrams,
        tasks=task_list.tasks,
        dependencies=dep_list.dependencies,
    )


if __name__ == "__main__":
    mock_prd = _mock_prd()
    result = asyncio.run(run_crew(mock_prd))

    print("\nSummary:\n")
    print(f"Diagrams: {len(result.diagrams)}")
    print(f"Tasks: {len(result.tasks)}")
    print(f"Dependencies: {len(result.dependencies)}")
    has_cycles = has_cycle(result.dependencies)
    print(f"Has cycle: {has_cycles}")

    print("\nTask titles:\n")
    for t in result.tasks:
        print(f"- {t.title}")

    print("\nDependencies:\n")
    for dep in result.dependencies:
        deps = ", ".join(dep.depends_on) if dep.depends_on else "[]"
        print(f"- {dep.title} -> {deps}")
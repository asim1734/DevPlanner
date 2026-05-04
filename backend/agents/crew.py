"""Phase 9: Crew orchestration to run Architect -> Scrum tasks -> Dependencies.

Note: PM agent is **not** invoked here. By the time `run_crew` is called
from /generate, the PRD is already finalized (locked) in chat_sessions.prd_json.
`run_crew` always receives a PRDSchema input.
"""
from dataclasses import dataclass
from typing import Callable, List, Optional
import asyncio

from crewai import Crew, Process, Task
import logging

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


ProgressCallback = Callable[[str, str, str], None]


def _emit_progress(callback: Optional[ProgressCallback], stage: str, status: str, message: str) -> None:
    """Emit progress updates when a callback is provided."""
    if callback:
        callback(stage, status, message)


def _attempt_repair(agent, raw_text: str, schema, label: str, attempts: int = 2):
    """
    Try to repair malformed agent output by asking the same agent to correct it.
    Returns parsed object on success or raises the last exception.
    """
    logger = logging.getLogger("devplanner")
    last_raw = raw_text
    for attempt in range(1, attempts + 1):
        try:
            logger.info("Attempting repair #%d for %s", attempt, label)
            repair_prompt = (
                "The previous response was intended to be a JSON object but appears malformed.\n"
                "Your task: fix the malformed JSON and return ONLY the corrected JSON object that conforms to the expected schema.\n"
                "Do NOT add any explanation or markdown.\n\n"
                f"Previous output:\n{last_raw}\n\n"
                "Return only the corrected JSON object."
            )

            repair_task = Task(description=repair_prompt, agent=agent)
            repair_crew = Crew(agents=[agent], tasks=[repair_task], process=Process.sequential, verbose=False)
            repair_crew.kickoff()

            repaired_raw = repair_task.output.raw
            logger.debug("Repaired raw (attempt %d): %s", attempt, repaired_raw)
            parsed = parse_agent_output(repaired_raw, schema)
            logger.info("Repair succeeded on attempt %d for %s", attempt, label)
            return parsed
        except Exception:
            logger.exception("Repair attempt %d failed for %s", attempt, label)
            # prepare for next attempt
            last_raw = repair_task.output.raw if hasattr(repair_task, "output") and repair_task.output and getattr(repair_task.output, "raw", None) else last_raw
            continue
    # If we reach here, all attempts failed — re-raise
    raise RuntimeError(f"All repair attempts failed for {label}")


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


async def run_crew(prd: PRDSchema, progress_callback: Optional[ProgressCallback] = None) -> CrewOutput:
    # Step 1: Architect
    _emit_progress(progress_callback, "architect", "running", "Architect is designing your task breakdown...")
    architect = create_architect_agent()
    architect_task = create_architect_task(architect, prd)
    crew_arch = Crew(agents=[architect], tasks=[architect_task], process=Process.sequential, verbose=True)
    crew_arch.kickoff()
    try:
        arch_output = parse_agent_output(architect_task.output.raw, ArchitectOutputSchema)
    except Exception:
        logging.getLogger("devplanner").exception(
            "Failed to parse architect output; attempting repair"
        )
        # Attempt agent-driven repair
        arch_output = _attempt_repair(architect, architect_task.output.raw, ArchitectOutputSchema, "architect output")
    _emit_progress(progress_callback, "architect", "completed", "Architecture and ERD diagrams generated.")

    # Step 2: Scrum tasks (Phase 8)
    _emit_progress(progress_callback, "scrum", "running", "Scrum Master is generating tasks and dependencies...")
    scrum = create_scrum_agent()
    task_gen_task = create_scrum_task_generation_task(scrum, prd, arch_output)
    crew_tasks = Crew(agents=[scrum], tasks=[task_gen_task], process=Process.sequential, verbose=True)
    crew_tasks.kickoff()
    try:
        task_list = parse_agent_output(task_gen_task.output.raw, ScrumTaskListSchema)
    except Exception:
        logging.getLogger("devplanner").exception(
            "Failed to parse scrum task list output; attempting repair"
        )
        task_list = _attempt_repair(scrum, task_gen_task.output.raw, ScrumTaskListSchema, "scrum task list")

    # Step 3: Dependencies (Phase 8.5)
    dep_task = create_dependency_task(scrum, task_list, [task_gen_task])
    crew_deps = Crew(agents=[scrum], tasks=[dep_task], process=Process.sequential, verbose=True)
    crew_deps.kickoff()
    try:
        dep_list = parse_agent_output(dep_task.output.raw, DependencyGraphSchema)
    except Exception:
        logging.getLogger("devplanner").exception(
            "Failed to parse dependencies output; attempting repair"
        )
        dep_list = _attempt_repair(scrum, dep_task.output.raw, DependencyGraphSchema, "dependencies output")
    _emit_progress(progress_callback, "scrum", "completed", "Tasks and dependency mapping generated.")

    # Step 4: Validate
    _emit_progress(progress_callback, "dag_validation", "running", "Validating DAG for cycles...")
    unknown_refs = validate_dependency_titles(dep_list.dependencies)
    if unknown_refs:
        print("Unknown dependency references:")
        for ref in unknown_refs:
            print(f"- {ref}")

    if has_cycle(dep_list.dependencies):
        raise ValueError("Cycle detected in dependency graph")
    _emit_progress(progress_callback, "dag_validation", "completed", "Dependency graph is valid.")

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
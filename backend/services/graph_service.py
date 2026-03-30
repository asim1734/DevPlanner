"""
DAG validation and topological sort service.
Uses Kahn's algorithm for cycle detection.
"""
from collections import defaultdict, deque
from typing import List
from schemas.graph import GraphTaskSchema, TaskDependencySchema


def has_cycle(tasks: List[TaskDependencySchema]) -> bool:
    """
    Detect if the task dependency graph contains a cycle (skips unknown references).

    Args:
        tasks: List of dependency entries (title + depends_on)

    Returns:
        True if a cycle exists (invalid DAG)
        False if the graph is a valid DAG
    """
    if not tasks:
        return False

    task_titles = {task.title for task in tasks}
    in_degree = defaultdict(int)
    adjacency = defaultdict(list)

    for task in tasks:
        _ = in_degree[task.title]  # ensure key exists
        for dep in task.depends_on:
            if dep not in task_titles:
                continue  # skip unknown references
            adjacency[dep].append(task.title)
            in_degree[task.title] += 1

    queue = deque([t.title for t in tasks if in_degree[t.title] == 0])
    visited = 0

    while queue:
        node = queue.popleft()
        visited += 1
        for neighbor in adjacency[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return visited != len(tasks)


def validate_dependency_titles(tasks: List[TaskDependencySchema]) -> List[str]:
    """
    Returns list of depends_on references that do not match any known task title.
    Empty list => all references are valid.
    """

    task_titles = {t.title for t in tasks}
    unknown = []
    for task in tasks:
        for dep in task.depends_on:
            if dep not in task_titles:
                unknown.append(f"{task.title} -> {dep}")
    return unknown


def topological_sort(tasks: List[GraphTaskSchema]) -> List[str]:
    """
    Perform topological sort on the task dependency graph.

    Returns tasks in an order where all dependencies come before
    dependent tasks.

    Args:
        tasks: List of tasks with their dependencies

    Returns:
        List of task titles in topological order

    Raises:
        ValueError: If the graph contains a cycle
    """
    if not tasks:
        return []

    # Check for cycles first
    if has_cycle(tasks):
        raise ValueError("Cannot perform topological sort: dependency graph contains a cycle")

    # Build adjacency list and in-degree map
    in_degree = defaultdict(int)
    adjacency = defaultdict(list)
    task_titles = {task.title for task in tasks}

    # Initialize in-degree for all tasks
    for task in tasks:
        if task.title not in in_degree:
            in_degree[task.title] = 0

    # Build the graph
    for task in tasks:
        for dep in task.depends_on:
            if dep in task_titles:
                adjacency[dep].append(task.title)
                in_degree[task.title] += 1

    # Start with nodes that have no dependencies
    queue = deque([task.title for task in tasks if in_degree[task.title] == 0])
    sorted_tasks = []

    # Process nodes in topological order
    while queue:
        node = queue.popleft()
        sorted_tasks.append(node)

        # Reduce in-degree for neighbors
        for neighbor in adjacency[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return sorted_tasks

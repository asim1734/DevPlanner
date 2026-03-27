"""
DAG validation and topological sort service.
Uses Kahn's algorithm for cycle detection.
"""
from collections import defaultdict, deque
from typing import List
from schemas.graph import GraphTaskSchema


def has_cycle(tasks: List[GraphTaskSchema]) -> bool:
    """
    Detect if the task dependency graph contains a cycle.

    Uses Kahn's algorithm for topological sort. If the algorithm
    cannot process all nodes, a cycle exists.

    Args:
        tasks: List of tasks with their dependencies

    Returns:
        True if a cycle exists (invalid DAG)
        False if the graph is a valid DAG
    """
    if not tasks:
        return False

    # Build adjacency list and in-degree map
    in_degree = defaultdict(int)
    adjacency = defaultdict(list)
    task_titles = {task.title for task in tasks}

    # Initialize in-degree for all tasks
    for task in tasks:
        if task.title not in in_degree:
            in_degree[task.title] = 0

    # Build the graph: edge from dependency -> dependent task
    for task in tasks:
        for dep in task.depends_on:
            if dep in task_titles:
                adjacency[dep].append(task.title)
                in_degree[task.title] += 1

    # Start with nodes that have no dependencies
    queue = deque([task.title for task in tasks if in_degree[task.title] == 0])
    visited = 0

    # Process nodes in topological order
    while queue:
        node = queue.popleft()
        visited += 1

        # Reduce in-degree for neighbors
        for neighbor in adjacency[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # If we couldn't visit all nodes, a cycle exists
    return visited != len(tasks)


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

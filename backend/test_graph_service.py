"""
Test script for Phase 3: Graph Service
Tests DAG cycle detection and topological sort.
"""
import sys
sys.path.insert(0, '/home/asim/DevPlanner/backend')

from schemas.graph import GraphTaskSchema
from services import has_cycle, topological_sort


def test_valid_dag():
    """Test with a valid DAG (no cycles)."""
    print("Testing valid DAG...")

    tasks = [
        GraphTaskSchema(title="Setup database", depends_on=[]),
        GraphTaskSchema(title="Create API", depends_on=["Setup database"]),
        GraphTaskSchema(title="Build frontend", depends_on=["Create API"]),
        GraphTaskSchema(title="Write tests", depends_on=["Create API", "Build frontend"]),
    ]

    cycle_exists = has_cycle(tasks)
    assert not cycle_exists, "Valid DAG incorrectly detected as having a cycle"
    print(f"✅ Valid DAG: has_cycle() = {cycle_exists}")

    sorted_tasks = topological_sort(tasks)
    print(f"✅ Topological sort: {sorted_tasks}")

    # Verify order is correct
    assert sorted_tasks.index("Setup database") < sorted_tasks.index("Create API")
    assert sorted_tasks.index("Create API") < sorted_tasks.index("Build frontend")
    assert sorted_tasks.index("Build frontend") < sorted_tasks.index("Write tests")
    print("✅ Dependencies are correctly ordered")


def test_circular_dag():
    """Test with a circular dependency (invalid DAG)."""
    print("\nTesting circular dependency...")

    tasks = [
        GraphTaskSchema(title="Task A", depends_on=["Task C"]),
        GraphTaskSchema(title="Task B", depends_on=["Task A"]),
        GraphTaskSchema(title="Task C", depends_on=["Task B"]),  # Creates cycle: A -> B -> C -> A
    ]

    cycle_exists = has_cycle(tasks)
    assert cycle_exists, "Circular dependency not detected"
    print(f"✅ Circular DAG: has_cycle() = {cycle_exists}")

    try:
        topological_sort(tasks)
        assert False, "topological_sort should raise ValueError for circular DAG"
    except ValueError as e:
        print(f"✅ topological_sort correctly raised ValueError: {e}")


def test_complex_dag():
    """Test with a more complex valid DAG."""
    print("\nTesting complex DAG...")

    tasks = [
        GraphTaskSchema(title="A", depends_on=[]),
        GraphTaskSchema(title="B", depends_on=[]),
        GraphTaskSchema(title="C", depends_on=["A"]),
        GraphTaskSchema(title="D", depends_on=["B"]),
        GraphTaskSchema(title="E", depends_on=["A", "B"]),
        GraphTaskSchema(title="F", depends_on=["C", "D", "E"]),
    ]

    cycle_exists = has_cycle(tasks)
    assert not cycle_exists, "Complex DAG incorrectly detected as having a cycle"
    print(f"✅ Complex DAG: has_cycle() = {cycle_exists}")

    sorted_tasks = topological_sort(tasks)
    print(f"✅ Topological sort: {sorted_tasks}")

    # Verify F comes after all its dependencies
    f_index = sorted_tasks.index("F")
    assert sorted_tasks.index("C") < f_index
    assert sorted_tasks.index("D") < f_index
    assert sorted_tasks.index("E") < f_index
    print("✅ Complex dependencies are correctly ordered")


def test_edge_cases():
    """Test edge cases."""
    print("\nTesting edge cases...")

    # Empty list
    assert not has_cycle([]), "Empty list should not have cycle"
    assert topological_sort([]) == [], "Empty list should return empty sort"
    print("✅ Empty list handled correctly")

    # Single task
    single_task = [GraphTaskSchema(title="Solo", depends_on=[])]
    assert not has_cycle(single_task), "Single task should not have cycle"
    assert topological_sort(single_task) == ["Solo"], "Single task sort incorrect"
    print("✅ Single task handled correctly")

    # Self-dependency (cycle)
    self_dep = [GraphTaskSchema(title="Self", depends_on=["Self"])]
    assert has_cycle(self_dep), "Self-dependency should be detected as cycle"
    print("✅ Self-dependency detected as cycle")


if __name__ == "__main__":
    print("=" * 60)
    print("Phase 3 Graph Service Tests")
    print("=" * 60)

    try:
        test_valid_dag()
        test_circular_dag()
        test_complex_dag()
        test_edge_cases()

        print("\n" + "=" * 60)
        print("✅ ALL GRAPH SERVICE TESTS PASSED!")
        print("=" * 60)
        print("\nPhase 3 is complete and ready for commit.")

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

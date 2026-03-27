#!/usr/bin/env python3
"""
Test the Product Manager agent standalone.
"""
import sys
from crewai import Crew
from agents import create_pm_agent, create_prd_task


def test_pm_agent():
    """Test PM agent with a minimal crew."""
    print("🧪 Testing Product Manager Agent...")
    print("-" * 50)

    # Create the PM agent
    pm_agent = create_pm_agent()
    print(f"✅ PM Agent Created: {pm_agent.role}")

    # Create a test task with sample user input
    user_input = "I want to build a simple todo app where users can create, edit, and delete tasks"
    task = create_prd_task(pm_agent, user_input)
    print(f"✅ Task Created: PRD generation")

    # Create a minimal crew with just the PM agent
    crew = Crew(
        agents=[pm_agent],
        tasks=[task],
        verbose=True
    )
    print(f"✅ Crew Created with {len(crew.agents)} agent(s)")

    # Run the crew
    print("\n🚀 Running PM Agent...")
    print("-" * 50)
    result = crew.kickoff()

    # Verify the result
    print("\n" + "=" * 50)
    print("📋 PM AGENT OUTPUT:")
    print("=" * 50)

    if result and result.pydantic:
        prd = result.pydantic
        print(f"\n✅ PRD Generated Successfully!")
        print(f"\nProject Name: {prd.project_name}")
        print(f"Problem: {prd.problem_statement}")
        print(f"Users: {prd.target_users}")
        print(f"\nCore Features ({len(prd.core_features)}):")
        for i, feature in enumerate(prd.core_features, 1):
            print(f"  {i}. {feature}")
        print(f"\nOut of Scope ({len(prd.out_of_scope)}):")
        for i, item in enumerate(prd.out_of_scope, 1):
            print(f"  {i}. {item}")
        print(f"\nTech Stack:")
        print(f"  Frontend: {prd.tech_stack.frontend}")
        print(f"  Backend: {prd.tech_stack.backend}")
        print(f"  Database: {prd.tech_stack.database}")
        if prd.tech_stack.other:
            print(f"  Other: {', '.join(prd.tech_stack.other)}")

        print("\n✅ ALL PM AGENT TESTS PASSED!")
        print("   PM agent is working correctly")
        return True
    else:
        print("❌ No result returned from PM agent")
        return False


if __name__ == "__main__":
    success = test_pm_agent()
    sys.exit(0 if success else 1)

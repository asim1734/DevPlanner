/**
 * Test page for DAG components
 * Renders ProjectDAG with mock data for visual testing and component verification
 * This page can be deleted after testing is complete
 * Route: /test-dag
 */

"use client";

import React, { useMemo, useState } from "react";
import ProjectDAG from "@/components/dag/ProjectDAG";
import { transformAPIGraphToFlowGraph, type APIGraph } from "@/lib/graphUtils";

/**
 * Mock DAG: A realistic project structure with multiple epics and dependencies
 * Example: Building a Todo App with frontend, backend, and database components
 */
const mockAPIGraph: APIGraph = {
  nodes: [
    {
      id: "task-001",
      title: "Setup Development Environment",
      description: "Configure Node.js, Python, and database tools",
      epic: "Infrastructure",
      effort: "S",
      status: "complete",
    },
    {
      id: "task-002",
      title: "Design Database Schema",
      description: "Create ERD and define core tables (users, todos, projects)",
      epic: "Backend",
      effort: "M",
      status: "complete",
    },
    {
      id: "task-003",
      title: "Setup Backend API",
      description: "Initialize FastAPI project with CORS and middleware",
      epic: "Backend",
      effort: "S",
      status: "complete",
    },
    {
      id: "task-004",
      title: "Implement Authentication",
      description: "JWT tokens, password hashing, login/signup endpoints",
      epic: "Backend",
      effort: "L",
      status: "in_progress",
    },
    {
      id: "task-005",
      title: "Create Todo CRUD Endpoints",
      description: "Create, read, update, delete operations for todos",
      epic: "Backend",
      effort: "M",
      status: "todo",
    },
    {
      id: "task-006",
      title: "Setup Frontend Project",
      description: "Initialize Next.js with Tailwind CSS",
      epic: "Frontend",
      effort: "S",
      status: "complete",
    },
    {
      id: "task-007",
      title: "Create UI Components",
      description: "Button, Input, Card, Modal, Form components",
      epic: "Frontend",
      effort: "M",
      status: "in_progress",
    },
    {
      id: "task-008",
      title: "Build Auth UI",
      description: "Login and signup pages with form validation",
      epic: "Frontend",
      effort: "M",
      status: "todo",
    },
    {
      id: "task-009",
      title: "Build Todo List Page",
      description: "Display todos, allow creation and deletion",
      epic: "Frontend",
      effort: "L",
      status: "todo",
    },
    {
      id: "task-010",
      title: "API Integration",
      description: "Connect frontend to backend endpoints",
      epic: "Frontend",
      effort: "M",
      status: "todo",
    },
    {
      id: "task-011",
      title: "Testing & QA",
      description: "Unit tests, integration tests, bug fixes",
      epic: "QA",
      effort: "L",
      status: "todo",
    },
    {
      id: "task-012",
      title: "Deploy to Production",
      description: "Docker setup, CI/CD pipeline, deployment",
      epic: "DevOps",
      effort: "L",
      status: "todo",
    },
  ],
  edges: [
    // Infrastructure -> Backend
    { source: "task-001", target: "task-002" },
    { source: "task-001", target: "task-003" },

    // Backend dependencies
    { source: "task-002", target: "task-003" },
    { source: "task-003", target: "task-004" },
    { source: "task-004", target: "task-005" },

    // Infrastructure -> Frontend
    { source: "task-001", target: "task-006" },

    // Frontend dependencies
    { source: "task-006", target: "task-007" },
    { source: "task-007", target: "task-008" },
    { source: "task-007", target: "task-009" },

    // API integration depends on both backend and frontend
    { source: "task-004", target: "task-010" },
    { source: "task-008", target: "task-010" },
    { source: "task-009", target: "task-010" },

    // QA depends on frontend UI
    { source: "task-009", target: "task-011" },
    { source: "task-010", target: "task-011" },

    // Deployment depends on everything
    { source: "task-011", target: "task-012" },
  ],
};

/**
 * Alternative mock: Simple linear chain
 */
const mockSimpleChain: APIGraph = {
  nodes: [
    {
      id: "simple-1",
      title: "Phase 1: Design",
      description: "Create project specifications",
      epic: "Planning",
      effort: "M",
      status: "complete",
    },
    {
      id: "simple-2",
      title: "Phase 2: Development",
      description: "Implement core features",
      epic: "Development",
      effort: "L",
      status: "in_progress",
    },
    {
      id: "simple-3",
      title: "Phase 3: Testing",
      description: "QA and bug fixes",
      epic: "Testing",
      effort: "M",
      status: "todo",
    },
    {
      id: "simple-4",
      title: "Phase 4: Release",
      description: "Deploy to production",
      epic: "Release",
      effort: "S",
      status: "todo",
    },
  ],
  edges: [
    { source: "simple-1", target: "simple-2" },
    { source: "simple-2", target: "simple-3" },
    { source: "simple-3", target: "simple-4" },
  ],
};

/**
 * TestDAGPage Component
 * Allows switching between different mock DAGs and testing functionality
 */
export default function TestDAGPage() {
  const [selectedMock, setSelectedMock] = useState<"complex" | "simple">(
    "complex"
  );
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [mockData, setMockData] = useState(mockAPIGraph);

  const currentMockData = selectedMock === "complex" ? mockData : mockSimpleChain;

  const { nodes, edges } = useMemo(() => {
    return transformAPIGraphToFlowGraph(currentMockData);
  }, [currentMockData]);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    console.log(`Status updated: ${taskId} -> ${newStatus}`);
    // Update the mock data to persist status changes
    setMockData((prevData) => ({
      ...prevData,
      nodes: prevData.nodes.map((node) =>
        node.id === taskId ? { ...node, status: newStatus } : node
      ),
    }));
  };

  // Count tasks by status
  const statusCounts = {
    complete: currentMockData.nodes.filter((n) => n.status === "complete")
      .length,
    in_progress: currentMockData.nodes.filter((n) => n.status === "in_progress")
      .length,
    todo: currentMockData.nodes.filter((n) => n.status === "todo").length,
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DAG Test Page</h1>
            <p className="text-sm text-gray-600 mt-1">
              Visual testing for ProjectDAG, TaskNode, and TaskDetailPanel components
            </p>
          </div>

          {/* Status Indicators */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {statusCounts.complete}
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statusCounts.in_progress}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {statusCounts.todo}
              </div>
              <div className="text-sm text-gray-600">To Do</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Mock Data Selector */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Test Data
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedMock("complex")}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedMock === "complex"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Complex DAG (12 tasks)
                </button>
                <button
                  onClick={() => setSelectedMock("simple")}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedMock === "simple"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Simple Chain (4 tasks)
                </button>
              </div>
            </div>

            {/* Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Info
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-2">Testing:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Drag to pan the canvas</li>
                  <li>Click nodes to select</li>
                  <li>Use zoom buttons</li>
                  <li>Change status in panel</li>
                  <li>View dependencies</li>
                </ul>
              </div>
            </div>

            {/* Mock Data Stats */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tasks:</span>
                  <span className="font-semibold">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dependencies:</span>
                  <span className="font-semibold">{edges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Epics:</span>
                  <span className="font-semibold">
                    {new Set(currentMockData.nodes.map((n) => n.epic)).size}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Features to Test
              </h3>
              <ul className="text-xs space-y-2 text-gray-600">
                <li>✓ Node rendering with colors</li>
                <li>✓ Edge paths and arrows</li>
                <li>✓ Zoom controls</li>
                <li>✓ Node selection</li>
                <li>✓ Detail panel display</li>
                <li>✓ Status updates</li>
                <li>✓ Dependency tracking</li>
                <li>✓ Empty state (if needed)</li>
              </ul>
            </div>

            {/* Delete Instruction */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                This page can be deleted after testing is complete. Route:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">/test-dag</code>
              </p>
            </div>
          </div>
        </div>

        {/* Main DAG Canvas */}
        <div className="flex-1 overflow-hidden">
          <ProjectDAG
            nodes={nodes}
            edges={edges}
            apiGraph={currentMockData}
            onTaskStatusChange={handleStatusChange}
            showDetailPanel={true}
          />
        </div>
      </div>
    </div>
  );
}

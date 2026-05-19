/**
 * Project DAG Page
 * Displays the interactive DAG visualization for a specific project
 * Route: /project/[id]
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ProjectDAG from "@/components/dag/ProjectDAG";
import { transformAPIGraphToFlowGraph, type APIGraph } from "@/lib/graphUtils";

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: "generating" | "success" | "failed";
  created_at: string;
}

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [graphData, setGraphData] = useState<APIGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project metadata and graph on mount
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch project metadata
        const projectRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/projects/${projectId}`
        );

        if (!projectRes.ok) {
          throw new Error(`Failed to fetch project: ${projectRes.statusText}`);
        }

        const project = await projectRes.json();
        setProjectData(project);

        // Fetch project graph
        const graphRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/projects/${projectId}/graph`
        );

        if (!graphRes.ok) {
          throw new Error(`Failed to fetch project graph: ${graphRes.statusText}`);
        }

        const graph = await graphRes.json();
        setGraphData(graph);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        console.error("Error fetching project:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-600">Error</h3>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!projectData || !graphData) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No project data available</p>
      </div>
    );
  }

  const { nodes, edges } = transformAPIGraphToFlowGraph(graphData);

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/projects/${projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      console.log(`Task ${taskId} status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating task:", err);
      // Optionally show error to user
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition font-medium"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  projectData.status === "success"
                    ? "bg-green-100 text-green-800"
                    : projectData.status === "generating"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {projectData.status === "success"
                  ? "Complete"
                  : projectData.status === "generating"
                    ? "Generating"
                    : "Failed"}
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {projectData.name}
              </h1>
              {projectData.description && (
                <p className="text-gray-600 mt-1">{projectData.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Created {new Date(projectData.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* DAG Visualization */}
        <div className="flex-1 overflow-hidden">
          <ProjectDAG
            nodes={nodes}
            edges={edges}
            apiGraph={graphData}
            isLoading={false}
            onTaskStatusChange={handleTaskStatusChange}
            showDetailPanel={true}
          />
        </div>
      </div>
    </div>
  );
}

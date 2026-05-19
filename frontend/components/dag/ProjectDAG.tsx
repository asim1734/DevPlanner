/**
 * ProjectDAG Component
 * Main DAG visualization component for displaying project structure.
 * Renders nodes and edges with interactive selection and detail panel.
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import TaskNode from "./TaskNode";
import TaskDetailPanel from "./TaskDetailPanel";
import type { FlowNode, FlowEdge, APIGraph } from "@/lib/graphUtils";

export interface ProjectDAGProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  apiGraph?: APIGraph;
  isLoading?: boolean;
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  showDetailPanel?: boolean;
}

/**
 * Determine which tasks are blocked based on their dependencies
 * A task is blocked if any of its required dependencies are not complete
 */
function getBlockedTasks(
  nodes: FlowNode[],
  edges: FlowEdge[],
  nodeUpdates: Map<string, Partial<FlowNode["data"]>>
): Set<string> {
  const blocked = new Set<string>();
  const nodeMap = new Map<string, FlowNode>();
  
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // For each node, check if all its dependencies are complete
  for (const node of nodes) {
    const dependencies = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source);

    for (const depId of dependencies) {
      const depNode = nodeMap.get(depId);
      if (!depNode) continue;

      // Check the current status (considering updates)
      const depUpdates = nodeUpdates.get(depId);
      const depStatus = depUpdates?.status ?? depNode.data.status;

      if (depStatus !== "complete") {
        blocked.add(node.id);
        break;
      }
    }
  }

  return blocked;
}

/**
 * Get tasks that depend on a specific task
 */
function getDependentTasks(taskId: string, edges: FlowEdge[]): string[] {
  return edges
    .filter((edge) => edge.source === taskId)
    .map((edge) => edge.target);
}

/**
 * Calculate bounds of all nodes
 */
function calculateBounds(nodes: FlowNode[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 800, minY: 0, maxY: 600, width: 800, height: 600 };
  }

  const nodeWidth = 250;
  const nodeHeight = 200;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  }

  // Add padding
  const padding = 100;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * ProjectDAG Component
 *
 * Features:
 * - Displays DAG with automatic layout
 * - Interactive node selection
 * - Side detail panel with task information
 * - Edge rendering showing dependencies
 * - Zoom/pan support (via SVG viewBox)
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * import { transformAPIGraphToFlowGraph } from '@/lib/graphUtils';
 *
 * const { nodes, edges } = transformAPIGraphToFlowGraph(apiGraph);
 * <ProjectDAG nodes={nodes} edges={edges} />
 * ```
 */
export const ProjectDAG: React.FC<ProjectDAGProps> = ({
  nodes,
  edges,
  apiGraph,
  isLoading = false,
  onTaskStatusChange,
  showDetailPanel = true,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);  // Start at 250% for better default legibility
  const [nodeUpdates, setNodeUpdates] = useState<Map<string, Partial<FlowNode["data"]>>>(new Map());

  const bounds = useMemo(() => calculateBounds(nodes), [nodes]);

  // Build node map for quick access
  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  // Determine dependencies for selected node
  const selectedNodeData = selectedNodeId
    ? nodeMap.get(selectedNodeId)
    : undefined;

  const blockedTasks = useMemo(
    () => getBlockedTasks(nodes, edges, nodeUpdates),
    [nodes, edges, nodeUpdates]
  );

  const dependsOn = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges
      .filter((edge) => edge.target === selectedNodeId)
      .map((edge) => edge.source);
  }, [selectedNodeId, edges]);

  const dependents = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges
      .filter((edge) => edge.source === selectedNodeId)
      .map((edge) => edge.target);
  }, [selectedNodeId, edges]);

  const incompleteDependencies = useMemo(() => {
    if (!selectedNodeId) return [];
    const deps = edges
      .filter((edge) => edge.target === selectedNodeId)
      .map((edge) => edge.source);
    
    return deps.filter((depId) => {
      const depNode = nodeMap.get(depId);
      if (!depNode) return false;
      const depUpdates = nodeUpdates.get(depId);
      const depStatus = depUpdates?.status ?? depNode.data.status;
      return depStatus !== "complete";
    });
  }, [selectedNodeId, edges, nodeMap, nodeUpdates]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleDetailPanelClose = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    // Check if task is blocked - blocked tasks cannot be edited
    if (blockedTasks.has(taskId)) {
      return;
    }

    // Update local state immediately for UI feedback
    setNodeUpdates((prev) => {
      const updated = new Map(prev);
      const currentNode = nodeMap.get(taskId);
      if (currentNode) {
        updated.set(taskId, {
          ...currentNode.data,
          status: newStatus,
        });

        // If task is being completed, auto-transition dependent blocked tasks to "todo"
        if (newStatus === "complete") {
          const dependentTasks = getDependentTasks(taskId, edges);
          for (const depId of dependentTasks) {
            const depNode = nodeMap.get(depId);
            if (depNode) {
              const depUpdates = updated.get(depId);
              const depStatus = depUpdates?.status ?? depNode.data.status;
              // Only auto-transition if currently blocked (was in blocked state)
              if (depStatus === "blocked") {
                updated.set(depId, {
                  ...depNode.data,
                  status: "todo",
                });
              }
            }
          }
        }
      }
      return updated;
    });

    // Notify parent component
    onTaskStatusChange?.(taskId, newStatus);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.1, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.1, 0.1));
  const handleZoomReset = () => setZoomLevel(1);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project graph...</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4"
            />
          </svg>
          <p className="text-gray-600 font-medium">No tasks in project</p>
        </div>
      </div>
    );
  }

  const svgWidth = bounds.width;
  const svgHeight = bounds.height;

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Tasks: {nodes.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              Dependencies: {edges.length}
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
              title="Zoom out"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-600 px-2">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
              title="Zoom in"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
              title="Reset zoom"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-white relative flex items-start justify-center">
          {/* Wrapper sized to the scaled SVG so container is "just large enough" */}
          <div
            style={{
              width: `${svgWidth * zoomLevel}px`,
              height: `${svgHeight * zoomLevel}px`,
              display: "inline-block",
              transformOrigin: "top left",
            }}
          >
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
              style={{
                transformOrigin: "top left",
                transform: `scale(${zoomLevel})`,
                transition: "transform 200ms ease-out",
                display: "block",
              }}
            >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
              </marker>
            </defs>

            {/* Render Edges */}
            <g>
              {edges.map((edge, idx) => {
                const sourceNode = nodeMap.get(edge.source);
                const targetNode = nodeMap.get(edge.target);

                if (!sourceNode || !targetNode) return null;

                const x1 = sourceNode.position.x + 250 / 2;
                const y1 = sourceNode.position.y + 100;
                const x2 = targetNode.position.x + 250 / 2;
                const y2 = targetNode.position.y;

                // Calculate curve path
                const controlY = (y1 + y2) / 2;

                return (
                  <path
                    key={`edge-${idx}`}
                    d={`M ${x1} ${y1} Q ${x1} ${controlY}, ${x2} ${y2}`}
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    className="hover:stroke-blue-400 transition"
                  />
                );
              })}
            </g>

            {/* Render Nodes */}
            <g>
              {nodes.map((node) => {
                // Apply any pending updates to node data
                const updates = nodeUpdates.get(node.id);
                const displayData = updates ? { ...node.data, ...updates } : node.data;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.position.x}, ${node.position.y})`}
                    onClick={() => handleNodeSelect(node.id)}
                  >
                    {/* Foreign object to render React component */}
                    <foreignObject width="250" height="200" x="0" y="0">
                      <TaskNode
                        id={node.id}
                        title={displayData.title}
                        description={displayData.description}
                        epic={displayData.epic}
                        effort={displayData.effort}
                        status={displayData.status}
                        isSelected={selectedNodeId === node.id}
                        isBlocked={blockedTasks.has(node.id)}
                        onSelect={handleNodeSelect}
                      />
                    </foreignObject>
                  </g>
                );
              })}
            </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {showDetailPanel && (
        <TaskDetailPanel
          taskId={selectedNodeId}
          taskData={selectedNodeData?.data}
          dependsOn={dependsOn}
          dependents={dependents}
          isBlocked={selectedNodeId ? blockedTasks.has(selectedNodeId) : false}
          incompleteDependencies={incompleteDependencies}
          onStatusChange={handleStatusChange}
          onClose={handleDetailPanelClose}
        />
      )}
    </div>
  );
};

export default ProjectDAG;

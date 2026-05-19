/**
 * Custom task node component for DAG visualization.
 * Displays task information with visual indicators for status and effort.
 */

import React from "react";

export interface TaskNodeProps {
  id: string;
  title: string;
  description: string;
  epic: string;
  effort: string;
  status: string;
  isSelected?: boolean;
  isBlocked?: boolean;
  onSelect?: (id: string) => void;
  x?: number;
  y?: number;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "complete":
      return "#22c55e"; // green
    case "in_progress":
      return "#3b82f6"; // blue
    case "blocked":
      return "#ef4444"; // red
    case "todo":
      return "#9ca3af"; // gray
    default:
      return "#6b7280"; // muted gray
  }
}

function getStatusBgColor(status: string, isBlocked: boolean = false): string {
  if (isBlocked) {
    return "#fee2e2"; // light red for blocked
  }
  switch (status) {
    case "complete":
      return "#f0fdf4"; // light green
    case "in_progress":
      return "#eff6ff"; // light blue
    case "blocked":
      return "#fef2f2"; // light red
    case "todo":
      return "#f9fafb"; // light gray
    default:
      return "#f3f4f6"; // default light gray
  }
}

function getStatusTextColor(status: string, isBlocked: boolean = false): string {
  if (isBlocked) {
    return "#991b1b"; // dark red for blocked
  }
  switch (status) {
    case "complete":
      return "#166534"; // dark green
    case "in_progress":
      return "#1e40af"; // dark blue
    case "blocked":
      return "#991b1b"; // dark red
    case "todo":
      return "#4b5563"; // dark gray
    default:
      return "#6b7280"; // muted gray
  }
}

function getStatusIcon(status: string, isBlocked: boolean = false): React.ReactNode {
  if (isBlocked) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M13.477 14.89A6 6 0 015.11 2.523a6 6 0 008.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  switch (status) {
    case "complete":
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "in_progress":
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

function getStatusLabel(status: string): string {
  return status.replace("_", " ").toUpperCase();
}

function getEffortColor(effort: string): string {
  switch (effort) {
    case "S":
      return "#4ade80"; // green
    case "M":
      return "#facc15"; // yellow
    case "L":
      return "#f87171"; // red
    default:
      return "#d1d5db"; // gray
  }
}

function getEffortLabel(effort: string): string {
  const labels: Record<string, string> = {
    S: "Small",
    M: "Medium",
    L: "Large",
  };
  return labels[effort] || effort;
}

/**
 * TaskNode Component
 *
 * Renders a task node with:
 * - Title and description
 * - Epic label
 * - Status and effort badges
 * - Visual border color based on status
 * - Click handler for selection
 *
 * Can be used as a standalone component or as a custom React Flow node.
 */
export const TaskNode: React.FC<TaskNodeProps> = ({
  id,
  title,
  description,
  epic,
  effort,
  status,
  isSelected = false,
  isBlocked = false,
  onSelect,
  x,
  y,
}) => {
  const displayStatus = isBlocked ? "blocked" : status;
  const statusColor = getStatusColor(displayStatus);
  const statusBgColor = getStatusBgColor(status, isBlocked);
  const statusTextColor = getStatusTextColor(status, isBlocked);
  const effortColor = getEffortColor(effort);
  const statusIcon = getStatusIcon(status, isBlocked);

  const handleClick = () => {
    onSelect?.(id);
  };

  // For React Flow integration, return just the node content
  const nodeContent = (
    <div
      className={`relative w-full h-full p-3 rounded-lg border-2 bg-white cursor-pointer transition-all overflow-hidden ${
        isSelected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
      } ${isBlocked ? "opacity-75" : ""}`}
      style={{
        borderColor: statusColor,
        borderLeftWidth: "6px",
        backgroundColor: statusBgColor,
      }}
      onClick={handleClick}
    >
      {/* Status Indicator Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: statusColor }}
      />

      {/* Blocked Overlay */}
      {isBlocked && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-red-500/10 border-2 border-dashed border-red-500 rounded w-full h-full flex items-center justify-center">
            <span className="text-red-600 font-bold text-xs">BLOCKED</span>
          </div>
        </div>
      )}

      {/* Title with Status Color */}
      <div className="flex items-start gap-2 mb-1 relative z-10">
        <h3
          className="font-semibold text-sm flex-1 line-clamp-2"
          style={{ color: statusTextColor }}
        >
          {title}
        </h3>
        <div
          className="flex-shrink-0 mt-0.5"
          style={{ color: statusColor }}
        >
          {statusIcon}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-2 line-clamp-2 relative z-10">
        {description}
      </p>

      {/* Epic Badge */}
      <div className="mb-2 relative z-10">
        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">
          {epic}
        </span>
      </div>

      {/* Status and Effort Badges */}
      <div className="flex gap-2 flex-wrap relative z-10">
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
          style={{ backgroundColor: statusColor }}
        >
          {getStatusLabel(displayStatus)}
        </span>
        <span
          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
          style={{ backgroundColor: effortColor }}
        >
          {getEffortLabel(effort)}
        </span>
      </div>

      {/* Task ID (for debugging) */}
      <div className="mt-2 pt-2 border-t" style={{ borderTopColor: `${statusColor}33` }}>
        <p className="text-xs text-gray-400">{id.slice(0, 8)}</p>
      </div>
    </div>
  );

  // If used in a React Flow context, return structured node content
  if (x !== undefined && y !== undefined) {
    return (
      <div
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: "250px",
        }}
      >
        {nodeContent}
      </div>
    );
  }

  // Standalone usage
  return (
    <div className="w-full max-w-sm">
      {nodeContent}
    </div>
  );
};

export default TaskNode;

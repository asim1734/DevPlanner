/**
 * Task detail panel component.
 * Shows detailed information about a selected task including dependencies,
 * dependents, and action buttons.
 */

import React from "react";

export interface TaskDetailPanelProps {
  taskId: string | null;
  taskData?: {
    id: string;
    title: string;
    description: string;
    epic: string;
    effort: string;
    status: string;
  } | null;
  dependsOn?: string[];
  dependents?: string[];
  isBlocked?: boolean;
  incompleteDependencies?: string[];
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

function getStatusColor(status: string): string {
  switch (status) {
    case "complete":
      return "#22c55e";
    case "in_progress":
      return "#3b82f6";
    case "todo":
      return "#9ca3af";
    default:
      return "#6b7280";
  }
}

/**
 * TaskDetailPanel Component
 *
 * Side panel showing detailed information about a selected task.
 * Features:
 * - Task title, description, epic
 * - Status and effort indicators
 * - List of tasks this depends on
 * - List of tasks that depend on this
 * - Status dropdown to update task status
 * - Close button
 */
export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  taskId,
  taskData,
  dependsOn = [],
  dependents = [],
  isBlocked = false,
  incompleteDependencies = [],
  onStatusChange,
  onClose,
  isLoading = false,
}) => {
  if (!taskId || !taskData) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex items-center justify-center h-full">
        <p className="text-gray-400">Select a task to view details</p>
      </div>
    );
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange?.(taskId, e.target.value);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 truncate">
          Task Details
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition"
          aria-label="Close panel"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {taskData.title}
              </h3>
              <p className="text-sm font-mono text-gray-500">{taskId}</p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Description
              </label>
              <p className="text-sm text-gray-600 leading-relaxed">
                {taskData.description}
              </p>
            </div>

            {/* Epic */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Epic
              </label>
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                {taskData.epic}
              </span>
            </div>

            {/* Effort */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Effort Estimate
              </label>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                {taskData.effort === "S"
                  ? "Small"
                  : taskData.effort === "M"
                    ? "Medium"
                    : "Large"}
              </span>
            </div>

            {/* Status Dropdown */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Status
              </label>
              {isBlocked && incompleteDependencies.length > 0 && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 2.523a6 6 0 008.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-red-800">Task is blocked</p>
                      <p className="text-xs text-red-700 mt-1">Complete these tasks first:</p>
                      <div className="mt-2 space-y-1">
                        {incompleteDependencies.map((depId) => (
                          <div key={depId} className="text-xs text-red-600 font-mono bg-white px-2 py-1 rounded border border-red-200">
                            {depId}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <select
                value={taskData.status}
                onChange={handleStatusChange}
                disabled={isBlocked}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition ${
                  isBlocked ? "opacity-60 cursor-not-allowed" : ""
                }`}
                style={{
                  borderColor: isBlocked ? "#fca5a5" : getStatusColor(taskData.status),
                  backgroundColor: isBlocked
                    ? "#fee2e2"
                    : taskData.status === "complete"
                      ? "#dcfce7"
                      : taskData.status === "in_progress"
                        ? "#dbeafe"
                        : "#f3f4f6",
                  color: isBlocked
                    ? "#991b1b"
                    : taskData.status === "complete"
                      ? "#166534"
                      : taskData.status === "in_progress"
                        ? "#1e40af"
                        : "#374151",
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dependencies */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Dependencies ({dependsOn.length})
              </label>
              {dependsOn.length > 0 ? (
                <div className="space-y-1">
                  {dependsOn.map((depId) => (
                    <div
                      key={depId}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 truncate hover:bg-gray-100 cursor-pointer transition"
                    >
                      {depId}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No dependencies</p>
              )}
            </div>

            {/* Dependents */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Blocked Tasks ({dependents.length})
              </label>
              {dependents.length > 0 ? (
                <div className="space-y-1">
                  {dependents.map((depId) => (
                    <div
                      key={depId}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 truncate hover:bg-gray-100 cursor-pointer transition"
                    >
                      {depId}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No blocked tasks</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default TaskDetailPanel;

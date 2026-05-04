"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import type { GenerateEvent } from "@/types";

type GenerationProgressProps = {
  events: GenerateEvent[];
  isLoading?: boolean;
  generationAttempts?: number;
  maxAttempts?: number;
  onRetry?: () => void;
  onEditPRD?: () => void;
};

const STAGE_LABELS: Record<string, string> = {
  prd_confirmed: "PRD confirmed",
  architect_start: "Architect is designing your task breakdown...",
  architect_complete: "Architecture and ERD diagrams generated",
  scrum_start: "Scrum Master is generating tasks...",
  scrum_complete: "Tasks and dependencies generated",
  validation_start: "Validating dependency graph...",
  validation_complete: "Graph validated",
  save_start: "Saving your project...",
  save_complete: "Project saved",
  complete: "Generation complete!",
};

export default function GenerationProgress({
  events,
  isLoading = false,
  generationAttempts = 0,
  maxAttempts = 3,
  onRetry,
  onEditPRD,
}: GenerationProgressProps) {
  const router = useRouter();

  const lastEvent = events[events.length - 1];
  const isComplete = lastEvent?.stage === "complete" && lastEvent?.status === "success";
  const isFailed = lastEvent?.status === "failed";
  const canRetry = isFailed && generationAttempts < maxAttempts;
  const canEdit = isFailed && generationAttempts >= maxAttempts;

  const handleViewProject = useCallback(() => {
    if (lastEvent?.project_id) {
      router.push(`/project/${lastEvent.project_id}`);
    }
  }, [lastEvent?.project_id, router]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          {isLoading ? "Generating" : "Generation"} Progress
        </p>
        {isLoading && (
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        )}
      </div>

      <div className="space-y-3">
        {events.map((event, index) => {
          const isLastEvent = index === events.length - 1;
          const isError = event.status === "failed";
          
          // Logic: 
          // - Show ❌ if this event failed
          // - Show ✅ if this is NOT the last event (we've moved past it, so it completed)
          // - Show ⏳ if this IS the last event and not failed (it's in progress)
          const isSuccess = !isLastEvent && !isError;
          const isPending = isLastEvent && !isError;

          const label = STAGE_LABELS[event.stage] || event.message || event.stage;
          const icon = isError ? "❌" : isSuccess ? "✅" : "⏳";
          const textColor = isError ? "text-rose-600" : isSuccess ? "text-emerald-600" : "text-blue-600";

          return (
            <div key={`${event.stage}-${index}`} className="flex items-start gap-3">
              <span className={`text-lg leading-none ${textColor}`}>{icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${textColor}`}>{label}</p>
                {event.warnings_count ? (
                  <p className="mt-1 text-xs text-amber-600">
                    {event.warnings_count} warning{event.warnings_count !== 1 ? "s" : ""}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {isComplete && (
        <button
          type="button"
          onClick={handleViewProject}
          className="mt-6 w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          disabled={!lastEvent?.project_id}
        >
          View Project
        </button>
      )}

      {isFailed && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-rose-600">
            {lastEvent?.message || "Generation failed. Please try again."}
          </p>
          <div className="flex gap-2">
            {canRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 rounded-full border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white"
              >
                Retry ({maxAttempts - generationAttempts} left)
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={onEditPRD}
                className="flex-1 rounded-full border border-amber-600 px-4 py-2 text-sm font-medium text-amber-600 transition hover:bg-amber-600 hover:text-white"
              >
                Edit PRD
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

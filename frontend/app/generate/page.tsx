"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import GenerationProgress from "@/components/chat/GenerationProgress";
import { streamGenerate } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";

export default function GeneratePage() {
  const router = useRouter();
  const {
    sessionId,
    generationEvents,
    generationAttempts,
    setIsLocked,
    addGenerationEvent,
    incrementGenerationAttempts,
    resetGenerationAttempts,
    setLoading,
    setError,
  } = useProjectStore();

  const lastEvent = generationEvents[generationEvents.length - 1];
  const isComplete = lastEvent?.stage === "complete" && lastEvent?.status === "success";

  const handleViewProject = useCallback(() => {
    if (lastEvent?.project_id) {
      router.push(`/project/${lastEvent.project_id}`);
    }
  }, [lastEvent?.project_id, router]);

  const handleBackToChat = useCallback(() => {
    router.push("/chat");
  }, [router]);

  const handleRetry = useCallback(async () => {
    if (!sessionId) {
      setError("Session not found");
      return;
    }

    setError(null);
    setLoading(true);
    incrementGenerationAttempts();

    try {
      await streamGenerate(
        sessionId,
        (event) => {
          addGenerationEvent(event);
          if (event.stage === "complete") {
            setLoading(false);
          }
        },
        (streamError) => {
          setError(streamError.message);
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation retried");
    } finally {
      setLoading(false);
    }
  }, [sessionId, setError, setLoading, incrementGenerationAttempts, addGenerationEvent]);

  const handleEditPRD = useCallback(() => {
    resetGenerationAttempts();
    setIsLocked(false);
    setError(null);
    router.push("/chat");
  }, [resetGenerationAttempts, setIsLocked, setError, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,transparent_40%),radial-gradient(circle_at_top_right,#bae6fd,transparent_45%),linear-gradient(180deg,#f8fafc,#ffffff)] px-6 py-10">
      <main className="mx-auto w-full max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.6em] text-slate-400">
              Generating Project
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Your plan is being created
            </h1>
          </div>
          <button
            type="button"
            onClick={handleBackToChat}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Back to Chat
          </button>
        </header>

        {generationEvents.length > 0 ? (
          <GenerationProgress
            events={generationEvents}
            isLoading={generationEvents.length > 0 && !isComplete}
            generationAttempts={generationAttempts}
            maxAttempts={3}
            onRetry={handleRetry}
            onEditPRD={handleEditPRD}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              Starting project generation...
            </p>
          </div>
        )}

        {isComplete && (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleViewProject}
              className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              disabled={!lastEvent?.project_id}
            >
              View Project
            </button>
            <button
              type="button"
              onClick={handleBackToChat}
              className="flex-1 rounded-full border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white"
            >
              Back to Chat
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

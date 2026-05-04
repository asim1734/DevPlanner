"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import ChatWindow from "@/components/chat/ChatWindow";
import { lockChat, postChat, streamGenerate } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const router = useRouter();
  const {
    sessionId,
    chatMessages,
    chatQuestions,
    prdDraft,
    isFinal,
    isLocked,
    isLoading,
    error,
    generationEvents,
    generationAttempts,
    addChatMessage,
    setChatQuestions,
    setSessionId,
    setPrdDraft,
    setIsFinal,
    setIsLocked,
    addGenerationEvent,
    incrementGenerationAttempts,
    resetGenerationAttempts,
    setLoading,
    setError,
  } = useProjectStore();

  const messages = useMemo(
    () =>
      chatMessages.map((message) => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
      })),
    [chatMessages],
  );

  const handleSend = useCallback(
    async (content: string) => {
      setError(null);
      setChatQuestions([]);
      addChatMessage({
        role: "user",
        content,
        timestamp: formatTimestamp(new Date()),
      });

      try {
        setLoading(true);
        const response = await postChat({
          session_id: sessionId ?? undefined,
          message: content,
        });

        setSessionId(response.session_id);
        setPrdDraft(response.prd_draft ?? null);
        setIsFinal(response.is_final);
        setChatQuestions(response.questions ?? []);

        addChatMessage({
          role: "assistant",
          content: response.message,
          timestamp: formatTimestamp(new Date()),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat request failed");
      } finally {
        setLoading(false);
      }
    },
    [
      addChatMessage,
      postChat,
      sessionId,
      setChatQuestions,
      setError,
      setIsFinal,
      setLoading,
      setPrdDraft,
      setSessionId,
    ],
  );

  const handleLock = useCallback(async () => {
    if (!sessionId) {
      setError("Start a chat before locking the PRD.");
      return;
    }

    try {
      setLoading(true);
      const response = await lockChat(sessionId);
      setPrdDraft(response.prd_draft ?? null);
      setIsFinal(response.is_final);
      setIsLocked(true);
      setChatQuestions(response.questions ?? []);

      addChatMessage({
        role: "assistant",
        content: response.message,
        timestamp: formatTimestamp(new Date()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lock request failed");
    } finally {
      setLoading(false);
    }
  }, [addChatMessage, lockChat, sessionId, setChatQuestions, setError, setIsFinal, setIsLocked, setLoading, setPrdDraft]);

  const handleGenerate = useCallback(async () => {
    if (!sessionId) {
      setError("Start a chat before generating a project.");
      return;
    }

    setError(null);
    setLoading(true);
    incrementGenerationAttempts();

    try {
      // Navigate to generate page to show progress
      router.push("/generate");

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
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [addGenerationEvent, sessionId, setError, setLoading, incrementGenerationAttempts, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,transparent_40%),radial-gradient(circle_at_top_right,#bae6fd,transparent_45%),linear-gradient(180deg,#f8fafc,#ffffff)] px-6 py-10">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.6em] text-slate-400">
            DevPlanner Chat
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Draft the PRD with the PM agent
          </h1>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <ChatWindow
          messages={messages}
          questions={chatQuestions}
          prdDraft={prdDraft}
          isFinal={isFinal}
          isLocked={isLocked}
          isLoading={isLoading}
          onSend={handleSend}
          onLock={handleLock}
          onGenerate={handleGenerate}
        />
      </main>
    </div>
  );
}

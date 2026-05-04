"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PRD } from "@/types";
import MessageBubble from "@/components/chat/MessageBubble";
import PRDPreview from "@/components/chat/PRDPreview";

const EMPTY_QUESTIONS: string[] = [];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

type ChatWindowProps = {
  messages: ChatMessage[];
  questions?: string[];
  prdDraft: PRD | null;
  isFinal?: boolean;
  isLocked?: boolean;
  isLoading?: boolean;
  onSend?: (message: string) => void;
  onLock?: () => void;
  onGenerate?: () => void;
};

export default function ChatWindow({
  messages,
  questions = EMPTY_QUESTIONS,
  prdDraft,
  isFinal = false,
  isLocked = false,
  isLoading = false,
  onSend,
  onLock,
  onGenerate,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<string[]>([]);
  const [extraNotes, setExtraNotes] = useState("");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hasQuestions = questions.length > 0;
  const questionsKey = questions.join("\u0001");
  const lastAssistantIndex = [...messages]
    .map((message, index) => ({
      index,
      role: message.role,
    }))
    .reverse()
    .find((message) => message.role === "assistant")?.index;

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    if (autoScrollEnabled) {
      scrollToBottom();
    }
  }, [autoScrollEnabled, messages, isLoading, scrollToBottom]);

  useEffect(() => {
    setQuestionAnswers(questions.map(() => ""));
    setExtraNotes("");
  }, [questionsKey]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setAutoScrollEnabled(distanceFromBottom < 24);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!hasQuestions && !trimmed) {
      return;
    }

    if (hasQuestions) {
      const formattedAnswers = questions
        .map((question, index) => {
          const answer = questionAnswers[index]?.trim();
          if (!answer) {
            return null;
          }
          return `${index + 1}. ${question}\n   Answer: ${answer}`;
        })
        .filter(Boolean)
        .join("\n");

      const payloadParts = [formattedAnswers];
      if (extraNotes.trim()) {
        payloadParts.push(`Extra notes:\n${extraNotes.trim()}`);
      }

      const payload = payloadParts.filter(Boolean).join("\n\n").trim();
      if (!payload) {
        return;
      }

      onSend?.(payload);
      setQuestionAnswers(questions.map(() => ""));
      setExtraNotes("");
      return;
    }

    onSend?.(trimmed);
    setInput("");
  };

  const questionForm = useMemo(() => {
    if (!hasQuestions) {
      return null;
    }

    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Quick Answers
          </p>
          <p className="text-xs text-slate-500">
            Fill what you want, leave the rest blank.
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {questions.map((question, index) => (
            <label
              key={question}
              className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <span className="text-sm font-medium text-slate-800">
                {question}
              </span>
              <textarea
                value={questionAnswers[index] ?? ""}
                onChange={(event) => {
                  const nextAnswers = [...questionAnswers];
                  nextAnswers[index] = event.target.value;
                  setQuestionAnswers(nextAnswers);
                }}
                rows={2}
                placeholder="Your answer"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>
          ))}
        </div>

        <label className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Extra notes
          </span>
          <textarea
            value={extraNotes}
            onChange={(event) => setExtraNotes(event.target.value)}
            rows={3}
            placeholder="Anything else the agent should know"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </label>
      </div>
    );
  }, [extraNotes, hasQuestions, questionAnswers, questions, questionsKey]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-[radial-gradient(1200px_circle_at_0%_0%,#fff7ed,transparent_45%),radial-gradient(900px_circle_at_100%_0%,#e0f2fe,transparent_40%),linear-gradient(180deg,#ffffff,#f8fafc)] p-6 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Shape the product scope
          </h2>
        </div>

        <div className="mt-6 h-[380px] overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-4 shadow-inner">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex h-full flex-col gap-4 overflow-y-auto pr-2"
          >
          {messages.length ? (
            messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                animate={message.role === "assistant" && index === lastAssistantIndex}
                onType={
                  message.role === "assistant" &&
                  index === lastAssistantIndex &&
                  autoScrollEnabled
                    ? scrollToBottom
                    : undefined
                }
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
              Start the conversation by describing your idea.
            </div>
          )}
          {isLoading ? (
            <div className="flex w-full justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                <span className="ml-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Agent typing
                </span>
              </div>
            </div>
          ) : null}
          </div>
        </div>

        {questionForm}

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
        >
          {!hasQuestions ? (
            <>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Your message
              </label>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={3}
                placeholder="Describe the product and key goals"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {hasQuestions
                ? "Answer only the questions you want; extra notes are optional."
                : "Keep it concise. We will iterate quickly."}
            </p>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {hasQuestions ? "Send Answers" : "Send Message"}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <PRDPreview prd={prdDraft} isFinal={isFinal} />
        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.4)]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Actions
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Lock the requirements when ready, then generate the project plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onLock}
            disabled={isLocked || !isFinal}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isLocked || !isFinal
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {isLocked ? "Locked" : "Lock PRD"}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={!isLocked}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              !isLocked
                ? "cursor-not-allowed border-slate-200 text-slate-400"
                : "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
            }`}
          >
            Generate Project
          </button>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

import type { PRD } from "@/types";
import MessageBubble from "@/components/chat/MessageBubble";
import PRDPreview from "@/components/chat/PRDPreview";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

type ChatWindowProps = {
  messages: ChatMessage[];
  prdDraft: PRD | null;
  isFinal?: boolean;
  isLocked?: boolean;
  onSend?: (message: string) => void;
  onLock?: () => void;
  onGenerate?: () => void;
};

export default function ChatWindow({
  messages,
  prdDraft,
  isFinal = false,
  isLocked = false,
  onSend,
  onLock,
  onGenerate,
}: ChatWindowProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    onSend?.(trimmed);
    setInput("");
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-[radial-gradient(1200px_circle_at_0%_0%,#fff7ed,transparent_45%),radial-gradient(900px_circle_at_100%_0%,#e0f2fe,transparent_40%),linear-gradient(180deg,#ffffff,#f8fafc)] p-6 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
              Project Chat
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Shape the product scope
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Talk with the PM agent to refine requirements and lock the PRD.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-500 sm:flex">
            Live Session
          </div>
        </div>

        <div className="mt-6 flex h-[360px] flex-col gap-4 overflow-y-auto pr-2">
          {messages.length ? (
            messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
              Start the conversation by describing your idea.
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
        >
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Keep it concise. We will iterate quickly.
            </p>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Send Message
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

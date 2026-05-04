"use client";

import { useEffect, useState } from "react";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  animate?: boolean;
  onType?: () => void;
};

export default function MessageBubble({
  role,
  content,
  timestamp,
  animate = false,
  onType,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const [visibleText, setVisibleText] = useState(animate ? "" : content);
  const [isComplete, setIsComplete] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setVisibleText(content);
      setIsComplete(true);
      return;
    }

    setVisibleText("");
    setIsComplete(false);
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setVisibleText(content.slice(0, index));
      onType?.();
      if (index >= content.length) {
        window.clearInterval(interval);
        setIsComplete(true);
        onType?.();
      }
    }, 8);

    return () => window.clearInterval(interval);
  }, [animate, content]);

  return (
    <div
      className={`flex w-full ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm md:text-base ${
          isUser
            ? "bg-slate-900 text-white shadow-slate-900/20"
            : "bg-white text-slate-900 shadow-slate-900/10"
        }`}
      >
        <p className="whitespace-pre-wrap">
          {visibleText}
          {!isComplete && !isUser ? (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-slate-300 align-middle" />
          ) : null}
        </p>
        {timestamp && isComplete ? (
          <p
            className={`mt-2 text-xs uppercase tracking-[0.2em] ${
              isUser ? "text-slate-300" : "text-slate-400"
            }`}
          >
            {timestamp}
          </p>
        ) : null}
      </div>
    </div>
  );
}

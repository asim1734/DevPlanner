type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

export default function MessageBubble({
  role,
  content,
  timestamp,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm md:text-base ${
          isUser
            ? "bg-slate-900 text-white shadow-slate-900/20"
            : "bg-white text-slate-900 shadow-slate-900/10"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {timestamp ? (
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

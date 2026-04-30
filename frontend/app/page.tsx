import ChatWindow from "@/components/chat/ChatWindow";
import type { PRD } from "@/types";

export default function Home() {
  const messages = [
    {
      role: "assistant" as const,
      content:
        "Tell me about the product you want to build. What does success look like?",
      timestamp: "09:02 AM",
    },
    {
      role: "user" as const,
      content:
        "A planner that turns rough ideas into a clear delivery roadmap with tasks and dependencies.",
      timestamp: "09:03 AM",
    },
    {
      role: "assistant" as const,
      content:
        "Great. Do you need real-time collaboration or is this single-user for now?",
      timestamp: "09:04 AM",
    },
  ];

  const prdDraft: PRD = {
    project_name: "DevPlanner",
    problem_statement:
      "Teams struggle to translate fuzzy product ideas into structured execution plans.",
    target_users: "Product leads and engineering managers at early-stage startups.",
    core_features: [
      "Conversational PRD drafting with AI guidance",
      "Automatic task breakdown with effort sizing",
      "Dependency-aware project graph visualization",
      "Exportable roadmap and milestone summary",
    ],
    out_of_scope: ["Resource allocation optimization", "Multi-team portfolio views"],
    tech_stack: {
      frontend: "Next.js + Tailwind",
      backend: "FastAPI",
      database: "PostgreSQL",
      other: ["CrewAI", "React Flow"],
    },
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,transparent_40%),radial-gradient(circle_at_top_right,#bae6fd,transparent_45%),linear-gradient(180deg,#f8fafc,#ffffff)] px-6 py-12">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.6em] text-slate-400">
            DevPlanner
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Conversation to roadmap, in one pass.
          </h1>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            Prototype view of the chat experience for Phase 18 component
            validation.
          </p>
        </header>
        <ChatWindow
          messages={messages}
          prdDraft={prdDraft}
          isFinal
          isLocked={false}
        />
      </main>
    </div>
  );
}

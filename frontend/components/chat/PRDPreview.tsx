import type { PRD } from "@/types";

type PRDPreviewProps = {
  prd: PRD | null;
  isFinal?: boolean;
};

export default function PRDPreview({ prd, isFinal }: PRDPreviewProps) {
  if (!prd) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
        Your PRD will appear here once the assistant has enough context.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Product Brief
          </p>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
            {prd.project_name}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
            isFinal
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {isFinal ? "Final" : "Draft"}
        </span>
      </div>

      <div className="mt-6 space-y-5 text-sm text-slate-700">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Problem
          </p>
          <p className="mt-1 text-base text-slate-900">
            {prd.problem_statement}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Target Users
          </p>
          <p className="mt-1 text-base text-slate-900">{prd.target_users}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Core Features
          </p>
          <ul className="mt-2 grid gap-2 text-base text-slate-900 sm:grid-cols-2">
            {prd.core_features.map((feature) => (
              <li
                key={feature}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Out of Scope
          </p>
          {prd.out_of_scope.length ? (
            <ul className="mt-2 space-y-2 text-base text-slate-900">
              {prd.out_of_scope.map((item) => (
                <li key={item} className="rounded-2xl bg-rose-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No exclusions captured yet.
            </p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Tech Stack
          </p>
          <div className="mt-2 grid gap-3 text-base text-slate-900 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Frontend
              </p>
              <p className="text-base text-slate-900">
                {prd.tech_stack.frontend}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Backend
              </p>
              <p className="text-base text-slate-900">
                {prd.tech_stack.backend}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Database
              </p>
              <p className="text-base text-slate-900">
                {prd.tech_stack.database}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Other
              </p>
              <p className="text-base text-slate-900">
                {prd.tech_stack.other.length
                  ? prd.tech_stack.other.join(", ")
                  : "None"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import type { PRD } from "@/types";

type PRDPreviewProps = {
  prd: PRD | null;
  isFinal?: boolean;
};

export default function PRDPreview({ prd, isFinal }: PRDPreviewProps) {
  if (!prd) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-gradient-to-br from-white via-white to-slate-50 p-6 text-sm text-slate-500 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
        Your PRD will appear here once the assistant has enough context.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_55%),radial-gradient(circle_at_bottom_right,#fef9c3,transparent_60%),linear-gradient(180deg,#ffffff,#f8fafc)] p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Product Brief
          </p>
          <h3 className="text-3xl font-semibold tracking-tight text-slate-900">
            {prd.project_name}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            A quick snapshot of the scope and technical direction.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
            isFinal
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {isFinal ? "Final" : "Draft"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 text-sm text-slate-700">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Problem
            </p>
            <p className="mt-2 text-base text-slate-900">
              {prd.problem_statement}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Target Users
            </p>
            <p className="mt-2 text-base text-slate-900">{prd.target_users}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Core Features
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {prd.core_features.length} items
            </p>
          </div>
          <ul className="mt-3 grid gap-2 text-base text-slate-900 sm:grid-cols-2">
            {prd.core_features.map((feature) => (
              <li
                key={feature}
                className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 shadow-sm"
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Out of Scope
            </p>
            {prd.out_of_scope.length ? (
              <ul className="mt-3 space-y-2 text-base text-slate-900">
                {prd.out_of_scope.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No exclusions captured yet.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Tech Stack
            </p>
            <div className="mt-3 grid gap-3 text-base text-slate-900">
              <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Frontend
                </p>
                <p className="text-base text-slate-900">
                  {prd.tech_stack.frontend}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Backend
                </p>
                <p className="text-base text-slate-900">
                  {prd.tech_stack.backend}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Database
                </p>
                <p className="text-base text-slate-900">
                  {prd.tech_stack.database}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2">
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
      </div>
    </section>
  );
}

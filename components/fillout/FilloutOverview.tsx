import { FilloutFormList } from "@/components/fillout/FilloutFormList";
import { formatPercent, formatScore } from "@/components/fillout/format";
import type { FilloutDashboard } from "@/lib/fillout";

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--card)] p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p
        className="mt-2 text-3xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function FilloutOverview({ data }: { data: FilloutDashboard }) {
  const isModule = data.kind === "module";
  const basePath = isModule ? "/modules" : "/mots-croises";

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">
            {isModule ? "Analytics modules" : "Analytics mots croisés"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isModule
              ? "Soumissions Fillout — complétions, % de réussite, notes et commentaires."
              : "Soumissions Fillout — complétions et note moyenne."}
          </p>
        </header>

        {!data.configured ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 text-sm">
            <p className="font-medium">Fillout non configuré</p>
            <p className="mt-2 text-[var(--muted)]">{data.error}</p>
          </div>
        ) : null}

        {data.error && data.configured ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
            {data.error}
          </div>
        ) : null}

        {data.configured && !data.error ? (
          <>
            <section className={`grid gap-4 sm:grid-cols-2 ${isModule ? "xl:grid-cols-5" : "xl:grid-cols-3"}`}>
              <KpiCard
                label={isModule ? "Modules" : "Grilles"}
                value={String(data.totals.formCount)}
                accent="var(--brand)"
              />
              <KpiCard label="Complétions" value={String(data.totals.completions)} />
              {isModule ? (
                <>
                  <KpiCard
                    label="Réussite"
                    value={formatPercent(data.totals.successRate)}
                    hint="Moyenne des quiz"
                    accent="#009251"
                  />
                  <KpiCard label="Note module" value={formatScore(data.totals.avgModuleNote)} hint="Moyenne" />
                  <KpiCard label="Note quiz" value={formatScore(data.totals.avgQuizNote)} hint="Moyenne" />
                </>
              ) : (
                <KpiCard
                  label="Note moyenne"
                  value={formatScore(data.totals.avgModuleNote)}
                  accent="#c47b17"
                />
              )}
            </section>

            <FilloutFormList forms={data.forms} kind={data.kind} basePath={basePath} />
          </>
        ) : null}
      </div>
    </div>
  );
}

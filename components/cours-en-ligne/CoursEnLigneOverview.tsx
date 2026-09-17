import { CoursEnLigneFormList } from "@/components/cours-en-ligne/CoursEnLigneFormList";
import type { CoursEnLigneDashboard } from "@/lib/cours-en-ligne";

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

function formatAverage(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export function CoursEnLigneOverview({ data }: { data: CoursEnLigneDashboard }) {
  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Inscriptions cours en ligne</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Soumissions Fillout par session — totaux, moyennes, et envoi d&apos;un mail Brevo aux
            inscrits.
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
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                label="Sessions"
                value={String(data.totals.formCount)}
                accent="var(--brand)"
              />
              <KpiCard label="Inscriptions totales" value={String(data.totals.completions)} />
              <KpiCard
                label="Moyenne par session"
                value={formatAverage(data.totals.avgCompletionsPerForm)}
                hint="Inscriptions / session"
              />
            </section>

            <CoursEnLigneFormList forms={data.forms} />
          </>
        ) : null}
      </div>
    </div>
  );
}

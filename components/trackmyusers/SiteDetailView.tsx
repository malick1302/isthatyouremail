import Link from "next/link";
import { formatDuration, formatMinutes } from "@/lib/format-duration";
import type { PeriodComparison, PeriodSliceMetrics, SiteDetailDashboard } from "@/lib/posthog-site-detail";
import { percentDelta } from "@/lib/posthog-site-detail";

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const delta = percentDelta(current, previous);
  if (delta === null) {
    return <span className="text-xs text-[var(--muted)]">nouveau</span>;
  }
  if (delta === 0) {
    return <span className="text-xs text-[var(--muted)]">= 0 %</span>;
  }
  const up = delta > 0;
  return (
    <span className={`text-xs font-medium tabular-nums ${up ? "text-emerald-700" : "text-red-700"}`}>
      {up ? "+" : ""}
      {delta.toFixed(1)} %
    </span>
  );
}

function MetricVs({
  label,
  current,
  previous,
  format = (n: number) => String(Math.round(n)),
}: {
  label: string;
  current: number;
  previous: number;
  format?: (n: number) => string;
}) {
  return (
    <div className="rounded-xl bg-[var(--paper)] px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="text-xl font-semibold tabular-nums">{format(current)}</p>
        <DeltaBadge current={current} previous={previous} />
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        vs {format(previous)} période précédente
      </p>
    </div>
  );
}

function PeriodPanel({ comparison }: { comparison: PeriodComparison }) {
  const { current, previous } = comparison;
  return (
    <section className="rounded-2xl bg-[var(--card)] p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{comparison.label}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{comparison.currentLabel}</p>
        <p className="text-xs text-[var(--muted)]">Comparé à : {comparison.previousLabel}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricVs label="Utilisateurs" current={current.users} previous={previous.users} />
        <MetricVs label="Sessions" current={current.sessions} previous={previous.sessions} />
        <MetricVs label="Pages vues" current={current.pageviews} previous={previous.pageviews} />
        <MetricVs
          label="Temps moyen / utilisateur"
          current={current.avgMinutesPerUser}
          previous={previous.avgMinutesPerUser}
          format={(n) => formatMinutes(n)}
        />
        <MetricVs
          label="Pages moyennes / utilisateur"
          current={current.avgPagesPerUser}
          previous={previous.avgPagesPerUser}
          format={(n) => (n > 0 ? n.toFixed(1) : "—")}
        />
        <MetricVs
          label="Durée moy. session"
          current={current.avgSessionSeconds}
          previous={previous.avgSessionSeconds}
          format={(n) => formatDuration(n)}
        />
      </div>
      <ComparisonTable current={current} previous={previous} />
    </section>
  );
}

function ComparisonTable({
  current,
  previous,
}: {
  current: PeriodSliceMetrics;
  previous: PeriodSliceMetrics;
}) {
  const rows: { label: string; current: number; previous: number; format: (n: number) => string }[] = [
    { label: "Utilisateurs", current: current.users, previous: previous.users, format: (n) => String(Math.round(n)) },
    { label: "Sessions", current: current.sessions, previous: previous.sessions, format: (n) => String(Math.round(n)) },
    { label: "Pages vues", current: current.pageviews, previous: previous.pageviews, format: (n) => String(Math.round(n)) },
    {
      label: "Min / utilisateur",
      current: current.avgMinutesPerUser,
      previous: previous.avgMinutesPerUser,
      format: formatMinutes,
    },
    {
      label: "Pages / utilisateur",
      current: current.avgPagesPerUser,
      previous: previous.avgPagesPerUser,
      format: (n) => (n > 0 ? n.toFixed(1) : "—"),
    },
    {
      label: "Durée session",
      current: current.avgSessionSeconds,
      previous: previous.avgSessionSeconds,
      format: formatDuration,
    },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--paper)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2">Métrique</th>
            <th className="px-3 py-2 text-right">Période</th>
            <th className="px-3 py-2 text-right">Précédente</th>
            <th className="px-3 py-2 text-right">Écart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-[var(--line)]">
              <td className="px-3 py-2">{row.label}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{row.format(row.current)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">
                {row.format(row.previous)}
              </td>
              <td className="px-3 py-2 text-right">
                <DeltaBadge current={row.current} previous={row.previous} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SiteDetailView({ data }: { data: SiteDetailDashboard }) {
  const { site } = data;

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/trackmyusers" className="text-sm text-[var(--muted)] hover:text-[#736ced]">
              ← Retour aux sites
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: site.color }}
                aria-hidden
              />
              <h1 className="text-2xl font-semibold">{site.label}</h1>
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-[var(--muted)] hover:text-[#736ced]"
            >
              {site.url.replace(/^https?:\/\//, "")}
            </a>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Analytics détaillées avec comparaison vs période précédente (semaine, mois, trimestre,
              semestre, année).
            </p>
          </div>
        </header>

        {!data.configured ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 text-sm">
            <p className="font-medium">PostHog non configuré</p>
            <p className="mt-2 text-[var(--muted)]">{data.error}</p>
          </div>
        ) : null}

        {data.error && data.configured ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
            {data.error}
          </div>
        ) : null}

        {data.configured && data.comparisons.length > 0
          ? data.comparisons.map((comparison) => (
              <PeriodPanel key={comparison.key} comparison={comparison} />
            ))
          : null}
      </div>
    </div>
  );
}

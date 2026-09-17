"use client";

import { SyncButton } from "@/components/gazette/SyncButton";
import { UnsubscribeHistory } from "@/components/gazette/UnsubscribeHistory";
import { contrastText } from "@/lib/email";
import type {
  DailyPoint,
  GazetteDashboard,
  GazetteTotals,
  PeriodCompare,
  PeriodKey,
} from "@/lib/gazette";
import { useState } from "react";

function formatDelta(delta: number, percent: number | null): string {
  const sign = delta > 0 ? "+" : "";
  if (percent === null) {
    return delta === 0 ? "stable" : `${sign}${delta} vs 0`;
  }
  const rounded = Math.round(percent);
  return `${sign}${delta} (${sign}${rounded} %)`;
}

function deltaClass(delta: number): string {
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-red-700";
  return "text-[var(--muted)]";
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

function formatShare(percent: number): string {
  return `${percent.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function TotalsPanel({ totals }: { totals: GazetteTotals }) {
  const max = Math.max(...totals.bases.map((base) => base.count), 1);

  return (
    <section className="rounded-2xl bg-[var(--card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Effectif total
          </h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCount(totals.total)}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Inscrits sur toutes les bases Airtable confondues.
          </p>
        </div>
      </div>

      {totals.total > 0 ? (
        <div
          className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--paper)]"
          role="img"
          aria-label="Répartition des inscrits par base"
        >
          {totals.bases
            .filter((base) => base.count > 0)
            .map((base) => (
              <div
                key={base.id}
                className="h-full min-w-px"
                style={{ width: `${base.percent}%`, backgroundColor: base.color }}
                title={`${base.id} : ${formatCount(base.count)} (${formatShare(base.percent)})`}
              />
            ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--paper)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">BDD</th>
              <th className="px-4 py-3 text-right">Inscrits</th>
              <th className="px-4 py-3 text-right">Part</th>
              <th className="hidden px-4 py-3 sm:table-cell">Répartition</th>
            </tr>
          </thead>
          <tbody>
            {totals.bases.map((base) => (
              <tr key={base.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: base.color }}
                      aria-hidden
                    />
                    {base.id}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {formatCount(base.count)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--brand)]">
                  {formatShare(base.percent)}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--paper)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((base.count / max) * 100, base.count > 0 ? 4 : 0)}%`,
                        backgroundColor: base.color,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t border-[var(--line)] bg-[var(--paper)]">
              <td className="px-4 py-3 font-semibold">Toutes les BDD</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">
                {formatCount(totals.total)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">100 %</td>
              <td className="hidden px-4 py-3 sm:table-cell" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KpiCard({ period }: { period: PeriodCompare }) {
  return (
    <div className="rounded-2xl bg-[var(--card)] p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        {period.label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{period.current}</p>
      <p className={`mt-1 text-sm ${deltaClass(period.delta)}`}>
        {formatDelta(period.delta, period.percent)} {period.compareHint}
      </p>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {period.currentLabel} ({period.current})
        <br />
        {period.previousLabel} ({period.previous})
      </p>
    </div>
  );
}

function GrowthChart({ points }: { points: DailyPoint[] }) {
  const max = Math.max(...points.map((point) => point.total), 1);
  const dense = points.length > 60;

  if (points.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Aucune inscription sur cette période.</p>;
  }

  return (
    <div className="flex h-48 items-end gap-px sm:gap-1">
      {points.map((point) => {
        const height = Math.max((point.total / max) * 100, point.total > 0 ? 4 : 0);
        const title = `${point.date}: ${point.total} — ${point.byBase
          .filter((item) => item.count > 0)
          .map((item) => `${item.id} ${item.count}`)
          .join(", ")}`;
        return (
          <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm"
              style={{ height: `${height}%` }}
              title={title}
            >
              {point.byBase
                .filter((item) => item.count > 0)
                .map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: item.color,
                      height: `${(item.count / point.total) * 100}%`,
                    }}
                  />
                ))}
            </div>
            {!dense ? (
              <span className="truncate text-[10px] text-[var(--muted)]">{formatDay(point.date)}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function GazetteView({ data }: { data: GazetteDashboard }) {
  const [active, setActive] = useState<PeriodKey>("7d");
  const period = data.periods.find((item) => item.key === active) ?? data.periods[0];
  const daily = data.dailyByPeriod[active] ?? [];
  const rows = data.basesByPeriod[active] ?? [];
  const maxCurrent = Math.max(...rows.map((row) => row.current), 1);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--paper)] lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Croissance des inscriptions</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Chaque bloc compare une durée à la même durée juste avant : 7j vs 7j, 30j vs
                30j, etc. Le signe + ou − est le vrai écart, pas un calendrier coupé.
              </p>
            </div>
            <SyncButton />
          </header>

          {data.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {data.error}
            </div>
          ) : null}

          {data.sync.writeDenied ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Airtable a refusé l&apos;écriture sur le token isthatyouremail. Ajoute{" "}
              <code className="font-medium">data.records:write</code> puis synchronise. Les
              adresses concernées sont dans le panneau de droite.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-[var(--card)] p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Aujourd&apos;hui
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{data.today}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.todayByBase
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: item.color, color: contrastText(item.color) }}
                    >
                      {item.id} {item.count}
                    </span>
                  ))}
                {data.today === 0 ? (
                  <span className="text-sm text-[var(--muted)]">Aucune inscription aujourd&apos;hui.</span>
                ) : null}
              </div>
            </div>
            {data.periods.map((item) => (
              <KpiCard key={item.key} period={item} />
            ))}
          </div>

          <TotalsPanel totals={data.totals} />

          <section className="rounded-2xl bg-[var(--card)] p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              {data.periods.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    active === item.key
                      ? "bg-[var(--brand)] font-medium text-white"
                      : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {period ? (
              <p className="mb-4 text-sm text-[var(--muted)]">
                <span className="font-semibold text-[var(--ink)]">{period.current}</span> inscriptions
                sur {period.currentLabel}
                <span className={`ml-2 ${deltaClass(period.delta)}`}>
                  {formatDelta(period.delta, period.percent)} {period.compareHint} ({period.previous})
                </span>
              </p>
            ) : null}
            <GrowthChart points={daily} />
          </section>

          <section className="overflow-hidden rounded-2xl bg-[var(--card)] shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[var(--paper)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">BDD</th>
                  <th className="px-4 py-3 text-right">Période</th>
                  <th className="px-4 py-3 text-right">Précédente</th>
                  <th className="px-4 py-3 text-right">Écart</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Répartition</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                          aria-hidden
                        />
                        {row.id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{row.current}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">
                      {row.previous}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${deltaClass(row.delta)}`}>
                      {formatDelta(row.delta, row.percent)}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--paper)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max((row.current / maxCurrent) * 100, row.current > 0 ? 4 : 0)}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-[var(--line)] bg-[var(--card)] lg:h-full lg:w-96 lg:border-l lg:border-t-0">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-lg font-semibold">Désabonnements</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Fillout → cases Airtable. {data.sync.checked} soumission
            {data.sync.checked > 1 ? "s" : ""} lue{data.sync.checked > 1 ? "s" : ""}
            {data.sync.applied > 0 ? ` · ${data.sync.applied} case(s) cochée(s)` : ""}
            {data.sync.failed > 0 ? ` · ${data.sync.failed} échec(s)` : ""}.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <UnsubscribeHistory items={data.history} />
        </div>
      </aside>
    </div>
  );
}

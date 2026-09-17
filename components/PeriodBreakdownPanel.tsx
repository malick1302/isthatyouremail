"use client";

import { useState } from "react";
import type { PeriodBreakdown, PeriodKey } from "@/lib/analytics";

function PeriodTable({ period }: { period: PeriodBreakdown }) {
  const max = Math.max(...period.byBdd.map((item) => item.count), 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">{period.total}</span> mails reçus sur la
          période
        </p>
        {period.truncated ? (
          <p className="text-xs text-[var(--muted)]">
            Échantillon limité — augmenter la limite si besoin.
          </p>
        ) : null}
      </div>

      {period.total === 0 ? (
        <p className="text-sm text-[var(--muted)]">Aucun mail reçu sur cette période.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--paper)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">BDD</th>
                <th className="px-4 py-3 text-right">Nombre</th>
                <th className="px-4 py-3 text-right">Part</th>
                <th className="hidden px-4 py-3 sm:table-cell">Répartition</th>
              </tr>
            </thead>
            <tbody>
              {period.byBdd.map((item) => (
                <tr key={item.label} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      {item.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{item.count}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--brand)]">
                    {item.percent}%
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--paper)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max((item.count / max) * 100, item.count > 0 ? 4 : 0)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PeriodBreakdownPanel({
  periods,
  fetchedMessages,
  historyTruncated,
}: {
  periods: PeriodBreakdown[];
  fetchedMessages: number;
  historyTruncated: boolean;
}) {
  const [active, setActive] = useState<PeriodKey>("7d");
  const current = periods.find((period) => period.key === active) ?? periods[0];

  return (
    <div className="rounded-2xl bg-[var(--card)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mails reçus par BDD</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Nombre et pourcentage par base, hors mails envoyés par toi.
            {historyTruncated
              ? ` Analyse sur ${fetchedMessages} fils récents (limite Gmail — résultats partiels).`
              : ` Analyse sur ${fetchedMessages} fils de la dernière année.`}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {periods.map((period) => (
          <button
            key={period.key}
            type="button"
            onClick={() => setActive(period.key)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              active === period.key
                ? "bg-[var(--brand)] font-medium text-white"
                : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {current ? <PeriodTable period={current} /> : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshButton } from "@/components/trackmyusers/RefreshButton";
import { SiteMetricsCard } from "@/components/trackmyusers/SiteMetricsCard";
import type { DailyActiveUsers, LiveEvent, UsageDashboard } from "@/lib/posthog";

const POLL_MS = 10_000;

function formatLiveTime(value: string | null, empty = "pas encore d'événement"): string {
  if (!value) return empty;
  return new Date(value).toLocaleString("fr-FR");
}

function formatClock(value: string): string {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function eventLabel(event: string): string {
  switch (event) {
    case "$pageview":
      return "Page vue";
    case "$pageleave":
      return "Sortie";
    case "$autocapture":
      return "Clic";
    case "$web_vitals":
      return "Web vitals";
    case "$rageclick":
      return "Rage click";
    default:
      return event.replace(/^\$/, "");
  }
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
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

function UsageChart({ data }: { data: DailyActiveUsers[] }) {
  const max = Math.max(...data.map((point) => point.count), 1);

  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Pas encore de données sur 30 jours.</p>;
  }

  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((point) => {
        const height = Math.max((point.count / max) * 100, point.count > 0 ? 4 : 0);
        const label = point.date.slice(5);
        return (
          <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-[#736ced]/80"
              style={{ height: `${height}%` }}
              title={`${point.date}: ${point.count} utilisateurs`}
            />
            <span className="truncate text-[10px] text-[var(--muted)]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LiveFeed({ events }: { events: LiveEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Aucun événement récent.</p>;
  }

  return (
    <ul className="max-h-72 divide-y divide-[var(--line)] overflow-y-auto text-sm">
      {events.map((event, index) => (
        <li key={`${event.timestamp}-${event.event}-${index}`} className="flex gap-3 py-2">
          <span className="w-20 shrink-0 tabular-nums text-[var(--muted)]">
            {event.timestamp ? formatClock(event.timestamp) : "—"}
          </span>
          <span className="w-24 shrink-0 font-medium">{eventLabel(event.event)}</span>
          <span className="w-20 shrink-0 text-[var(--muted)]">{event.siteId || "—"}</span>
          <span className="min-w-0 truncate font-mono text-xs">
            {event.path || event.host || "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function UsageOverview({ data: initial }: { data: UsageDashboard }) {
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setPending(true);
    try {
      const response = await fetch("/api/trackmyusers", { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as UsageDashboard;
      setData(next);
    } finally {
      if (manual) setPending(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const timer = window.setInterval(() => {
      void refresh(false);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Habitudes d&apos;utilisation</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Données live PostHog — rafraîchies toutes les 10 secondes.
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Dernier événement : {formatLiveTime(data.lastEventAt)}
              {" · "}
              Panel lu à {formatLiveTime(data.fetchedAt, "—")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.configured ? <RefreshButton pending={pending} onClick={() => void refresh(true)} /> : null}
            <Link
              href="/trackmyusers/setup"
              className="rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-sm hover:border-[#736ced]"
            >
              Configurer PostHog sur Softr
            </Link>
          </div>
        </header>

        {!data.configured ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 text-sm">
            <p className="font-medium">PostHog non configuré</p>
            <p className="mt-2 text-[var(--muted)]">{data.error}</p>
            <Link href="/trackmyusers/setup" className="mt-3 inline-block text-[#736ced] hover:underline">
              Voir les instructions →
            </Link>
          </div>
        ) : null}

        {data.error && data.configured ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
            {data.error}
          </div>
        ) : null}

        {data.configured ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                label="Actifs 24 h"
                value={data.totals.dau7}
                hint="Pages vues, par site"
                accent="#009251"
              />
              <KpiCard
                label="Actifs 7 j"
                value={data.totals.wau7}
                hint="Pages vues"
                accent="#736ced"
              />
              <KpiCard
                label="Sessions 7 j"
                value={data.totals.sessions7}
                accent="#439A86"
              />
              <KpiCard
                label="Pages vues 7 j"
                value={data.totals.pageviews7}
                accent="#0171b3"
              />
              <KpiCard
                label="Tous événements 7 j"
                value={data.totals.events7}
                hint="Clics, pages, vitals…"
                accent="#c2410c"
              />
            </section>

            <section className="rounded-2xl bg-[var(--card)] p-5">
              <h2 className="text-lg font-semibold">Activité en direct</h2>
              <p className="mt-1 mb-3 text-sm text-[var(--muted)]">
                Les 30 derniers événements PostHog (clics inclus), comme le live du projet.
              </p>
              <LiveFeed events={data.liveEvents ?? []} />
            </section>

            <section className="rounded-2xl bg-[var(--card)] p-5">
              <h2 className="text-lg font-semibold">Utilisateurs actifs par jour</h2>
              <p className="mt-1 mb-4 text-sm text-[var(--muted)]">30 derniers jours, pages vues, tous sites.</p>
              <UsageChart data={data.globalDailyActive} />
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Par site Softr</h2>
              {data.sites.map((site) => (
                <SiteMetricsCard key={site.siteId} site={site} />
              ))}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

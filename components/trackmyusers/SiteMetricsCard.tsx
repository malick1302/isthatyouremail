"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration, formatMinutes } from "@/lib/format-duration";
import type { SiteMetrics, VisitorDetail } from "@/lib/posthog";

function formatSeen(value: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VisitorRow({ visitor, latest }: { visitor: VisitorDetail; latest?: boolean }) {
  const [open, setOpen] = useState(Boolean(latest));

  return (
    <div className="border-b border-[var(--line)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="sticky top-0 z-10 flex w-full items-center justify-between gap-3 bg-[var(--card)] px-1 py-2.5 text-left text-sm hover:bg-[var(--paper)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-[var(--ink)]">{visitor.shortId}</span>
          {latest ? (
            <span className="rounded-full bg-[#736ced]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#736ced]">
              Dernier
            </span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-3 text-[var(--muted)]">
          <span className="tabular-nums">{formatSeen(visitor.lastSeen)}</span>
          <span>{visitor.sessions} sess.</span>
          <span>{visitor.pageviews} pages</span>
          <span className="tabular-nums font-medium text-[var(--ink)]">
            {formatDuration(visitor.totalSeconds)}
          </span>
          <span className="text-[var(--muted)]">{open ? "▾" : "▸"}</span>
        </span>
      </button>
      {open ? (
        <div className="mb-3 rounded-xl bg-[var(--paper)] px-3 py-2 text-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Pages visitées</p>
          {visitor.pages.length === 0 ? (
            <p className="mt-1 text-[var(--muted)]">Aucune page enregistrée.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {visitor.pages.map((path) => (
                <li key={path} className="truncate font-mono text-xs">
                  {path}
                </li>
              ))}
            </ul>
          )}
          {visitor.lastSeen ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Dernière activité : {new Date(visitor.lastSeen).toLocaleString("fr-FR")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SiteMetricsCard({ site }: { site: SiteMetrics }) {
  return (
    <div className="rounded-2xl bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: site.color }}
            aria-hidden
          />
          <div>
            <Link
              href={`/trackmyusers/${encodeURIComponent(site.siteId)}`}
              className="text-lg font-semibold hover:text-[#736ced] hover:underline"
            >
              {site.label}
            </Link>
            <p className="text-xs text-[var(--muted)]">Cliquer pour les analytics détaillées →</p>
            {site.lastEventAt ? (
              <p className="text-xs text-[var(--muted)]">
                Dernière activité : {new Date(site.lastEventAt).toLocaleString("fr-FR")}
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">Pas encore de page vue trackée.</p>
            )}
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--muted)] hover:text-[#736ced]"
              onClick={(event) => event.stopPropagation()}
            >
              {site.url.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>
        <Link
          href={`/trackmyusers/${encodeURIComponent(site.siteId)}`}
          className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm hover:border-[#736ced]"
        >
          Détail VS
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Actifs 24 h</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{site.dau7}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Actifs 7 j</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{site.wau7}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Sessions 7 j</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{site.sessions7}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Pages vues 7 j</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{site.pageviews7}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[var(--paper)] px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Temps moyen / utilisateur</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatMinutes(site.avgMinutesPerUser7)}
          </p>
          <p className="text-xs text-[var(--muted)]">sur 7 jours</p>
        </div>
        <div className="rounded-xl bg-[var(--paper)] px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Pages moyennes / utilisateur</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {site.avgPagesPerUser7 > 0 ? site.avgPagesPerUser7.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-[var(--muted)]">sur 7 jours</p>
        </div>
        <div className="rounded-xl bg-[var(--paper)] px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Durée moy. session</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatDuration(site.avgSessionDuration7)}
          </p>
          <p className="text-xs text-[var(--muted)]">sur 7 jours</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="border-t border-[var(--line)] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Top pages (vues, 7 j)
          </p>
          {site.topPages7.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Pas encore de données.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {site.topPages7.map((page) => (
                <li key={page.path} className="flex justify-between gap-3">
                  <span className="truncate">{page.path}</span>
                  <span className="shrink-0 tabular-nums text-[var(--muted)]">{page.views}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--line)] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Top 3 — pages où l&apos;on reste le plus longtemps
          </p>
          {site.topPagesByTime7.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Besoin de plus de navigation (durée mesurée entre deux pages).
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {site.topPagesByTime7.map((page, index) => (
                <li key={page.path} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="mr-2 text-[var(--muted)]">{index + 1}.</span>
                    {page.path}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--muted)]">
                    {formatDuration(page.avgSeconds)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Visiteurs (7 j) — détail des connexions
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Du plus récent au plus ancien. Le dernier visiteur est ouvert.
        </p>
        {site.visitors7.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Aucun visiteur sur cette période.</p>
        ) : (
          <div className="mt-2 max-h-80 overflow-y-auto">
            {site.visitors7.map((visitor, index) => (
              <VisitorRow key={visitor.visitorId} visitor={visitor} latest={index === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

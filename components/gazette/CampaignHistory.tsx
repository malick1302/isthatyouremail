"use client";

import type { CampaignBaseStat, CampaignHistoryItem, CampaignKind } from "@/lib/campaigns";
import { campaignKindLabel } from "@/lib/campaigns";
import { useCallback, useEffect, useState } from "react";

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function formatSentAt(value: string | null): string {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): string {
  if (status === "sent") return "Envoyée";
  if (status === "queued" || status === "inProcess" || status === "in_process") return "En cours";
  if (status === "draft") return "Brouillon";
  if (status === "suspended") return "Suspendue";
  if (status === "archive") return "Archivée";
  return status;
}

function BaseBreakdown({
  bases,
  opensKnown,
  approximated,
}: {
  bases: CampaignBaseStat[];
  opensKnown: boolean;
  approximated?: boolean;
}) {
  if (bases.length === 0) {
    return <p className="text-xs text-[var(--muted)]">Aucune base trouvée pour cette campagne.</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Par base</p>
      <p className="text-[11px] leading-4 text-[var(--muted)]">
        {approximated
          ? `Répartition recalculée avec les inscrits Airtable actuels${opensKnown ? "" : " — ouvertures encore indisponibles"}. `
          : ""}
        Une personne dans plusieurs bases est comptée dans chacune.
      </p>
      <ul className="flex flex-col gap-2">
        {bases.map((base) => (
          <li key={base.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: base.color }}
                  aria-hidden
                />
                <span className="truncate text-sm font-medium">{base.label}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                {formatCount(base.sent)} envoyés
              </span>
            </div>
            <p className="mt-0.5 pl-4 text-[11px] leading-4 text-[var(--muted)]">
              {opensKnown
                ? `${formatCount(base.uniqueOpens)} ouv. · ${formatRate(base.openRate)} de cette base · ${formatRate(base.shareOfOpens)} des ouvertures`
                : "Ouvertures par base en attente"}
            </p>
            {opensKnown && base.shareOfOpens !== null ? (
              <div className="mt-1 ml-4 h-1 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, base.shareOfOpens)}%`,
                    backgroundColor: base.color,
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function matchesKinds(item: CampaignHistoryItem, kinds?: CampaignKind[]): boolean {
  if (!kinds) return true;
  if (item.kind === null) return kinds.includes("gazette") || kinds.includes("cours");
  return kinds.includes(item.kind);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function CampaignHistory({
  brevoReady,
  refreshKey,
  kinds,
  showBases = true,
}: {
  brevoReady: boolean;
  refreshKey: number;
  kinds?: CampaignKind[];
  showBases?: boolean;
}) {
  const [items, setItems] = useState<CampaignHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseStats, setBaseStats] = useState<
    Record<number, { bases: CampaignBaseStat[]; opensKnown: boolean; approximated: boolean }>
  >({});
  const [baseLoadingId, setBaseLoadingId] = useState<number | null>(null);
  const [baseError, setBaseError] = useState<Record<number, string>>({});

  async function loadBases(campaignId: number, force = false) {
    const current = baseStats[campaignId];
    const hasOpens = current?.bases.some((base) => base.uniqueOpens > 0);
    if (!force && current?.opensKnown && hasOpens) return;
    if (baseLoadingId === campaignId) return;
    setBaseLoadingId(campaignId);
    setBaseError((current) => {
      const next = { ...current };
      delete next[campaignId];
      return next;
    });
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/bases`);
      const data = (await response.json()) as {
        bases?: CampaignBaseStat[];
        opensKnown?: boolean;
        approximated?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setBaseError((current) => ({
          ...current,
          [campaignId]: data.error ?? "Impossible de répartir par base.",
        }));
        return;
      }
      setBaseStats((current) => ({
        ...current,
        [campaignId]: {
          bases: data.bases ?? [],
          opensKnown: data.opensKnown ?? true,
          approximated: data.approximated ?? false,
        },
      }));
    } catch {
      setBaseError((current) => ({
        ...current,
        [campaignId]: "Impossible de répartir par base.",
      }));
    } finally {
      setBaseLoadingId(null);
    }
  }

  const load = useCallback(async () => {
    if (!brevoReady) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/campaigns/history");
      const data = (await response.json()) as { campaigns?: CampaignHistoryItem[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Impossible de charger l'historique.");
        return;
      }
      setItems(data.campaigns ?? []);
    } catch {
      setError("Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, [brevoReady]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const visibleItems = items.filter((item) => matchesKinds(item, kinds));

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-[var(--line)] bg-[var(--card)] lg:h-full lg:w-[26rem] lg:border-l lg:border-t-0">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Historique</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Stats Brevo des campagnes envoyées depuis l&apos;app.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !brevoReady}
          className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium hover:border-[var(--brand)] disabled:opacity-60"
        >
          {loading ? "Maj…" : "Actualiser"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {!brevoReady ? (
          <p className="text-sm text-[var(--muted)]">Configure BREVO_API_KEY pour voir l&apos;historique.</p>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {brevoReady && !error && visibleItems.length === 0 && !loading ? (
          <p className="text-sm text-[var(--muted)]">
            Aucune campagne envoyée depuis l&apos;app pour l&apos;instant. Les prochains envois
            apparaîtront ici avec ouvertures et clics.
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {visibleItems.map((item) => (
            <li key={item.id} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-snug">{item.name}</p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {item.kind ? campaignKindLabel(item.kind) : "Campagne"} · {formatSentAt(item.sentAt)}
              </p>
              {item.subject ? (
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{item.subject}</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat
                  label="Reçus"
                  value={formatCount(item.delivered)}
                  hint={
                    item.sent > 0 && item.deliveryRate !== null
                      ? `${formatCount(item.sent)} envoyés · ${formatRate(item.deliveryRate)}`
                      : item.sent > 0
                        ? `${formatCount(item.sent)} envoyés`
                        : undefined
                  }
                />
                <Stat
                  label="Ouverture"
                  value={formatRate(item.openRate)}
                  hint={`${formatCount(item.uniqueOpens)} unique${item.uniqueOpens > 1 ? "s" : ""}`}
                />
                <Stat
                  label="Clic"
                  value={formatRate(item.clickRate)}
                  hint={`${formatCount(item.uniqueClicks)} unique${item.uniqueClicks > 1 ? "s" : ""}`}
                />
                <Stat
                  label="Désabo / bounce"
                  value={`${formatCount(item.unsubscriptions)} / ${formatCount(item.bounces)}`}
                />
              </div>
              {showBases && item.bases.length > 0 ? (
                <BaseBreakdown bases={item.bases} opensKnown />
              ) : showBases && baseStats[item.id] ? (
                <>
                  <BaseBreakdown
                    bases={baseStats[item.id].bases}
                    opensKnown={baseStats[item.id].opensKnown}
                    approximated={baseStats[item.id].approximated}
                  />
                  {!baseStats[item.id].opensKnown ||
                  baseStats[item.id].bases.every((base) => base.uniqueOpens === 0) ? (
                    <button
                      type="button"
                      onClick={() => void loadBases(item.id, true)}
                      disabled={baseLoadingId === item.id}
                      className="mt-2 text-xs font-medium text-[var(--brand)] hover:underline disabled:opacity-60"
                    >
                      {baseLoadingId === item.id ? "Nouveau calcul…" : "Recalculer les ouvertures"}
                    </button>
                  ) : null}
                </>
              ) : showBases ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => void loadBases(item.id, true)}
                    disabled={baseLoadingId === item.id}
                    className="text-xs font-medium text-[var(--brand)] hover:underline disabled:opacity-60"
                  >
                    {baseLoadingId === item.id ? "Répartition en cours…" : "Voir par base"}
                  </button>
                  {baseError[item.id] ? (
                    <p className="mt-1 text-xs text-red-700">{baseError[item.id]}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

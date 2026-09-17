import Link from "next/link";
import { PeriodBreakdownPanel } from "@/components/PeriodBreakdownPanel";
import type { AnalyticsDashboard, FolderAnalytics, InboxBreakdown } from "@/lib/analytics";

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

function BarRow({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,120px)_1fr_auto] items-center gap-3">
      <span className="truncate text-sm font-medium">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--paper)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm tabular-nums text-[var(--muted)]">
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

function FolderTable({ folders }: { folders: FolderAnalytics[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--card)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--line)] bg-[var(--paper)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3">Dossier</th>
            <th className="px-4 py-3 text-right">Non lus</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Lus</th>
          </tr>
        </thead>
        <tbody>
          {folders.map((folder) => (
            <tr key={folder.slug} className="border-b border-[var(--line)] last:border-0">
              <td className="px-4 py-3">
                <Link href={folder.href} className="flex items-center gap-2 hover:text-[var(--brand)]">
                  {folder.color ? (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: folder.color }}
                      aria-hidden
                    />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-[var(--line)]" />
                  )}
                  {folder.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{folder.unread}</td>
              <td className="px-4 py-3 text-right tabular-nums">{folder.total}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">{folder.read}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BreakdownChart({ items }: { items: InboxBreakdown[] }) {
  const max = Math.max(...items.map((item) => item.total), 1);
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Aucun mail dans l’échantillon.</p>
      ) : (
        items.map((item) => (
          <BarRow
            key={item.label}
            label={item.label}
            value={item.total}
            max={max}
            color={item.color}
            suffix={item.unread > 0 ? ` (${item.unread} non lus)` : ""}
          />
        ))
      )}
    </div>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsDashboard }) {
  const maxFolderTotal = Math.max(...data.folders.map((folder) => folder.total), 1);
  const maxAirtable = Math.max(...data.airtableCounts.map((base) => base.count), 1);

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Vue d’ensemble Gmail + Airtable — dossiers, non lus et répartition par BDD.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Non lus — boîte"
            value={data.inboxUnread}
            hint={`${data.inboxTotal} mails au total dans INBOX`}
            accent="#009251"
          />
          <KpiCard
            label="Non lus — tous dossiers"
            value={data.totalUnread}
            hint="Somme des non lus par dossier"
            accent="#f45210"
          />
          <KpiCard
            label="Mails classés"
            value={data.totalClassified}
            hint="Hors boîte de réception"
            accent="#0171b3"
          />
          <KpiCard
            label="Contacts reconnus"
            value={`${data.inboxKnown}/${data.sampleSize}`}
            hint={`${data.inboxUnknown} « Autre » sur les ${data.sampleSize} derniers mails`}
            accent="#736ced"
          />
        </section>

        <section>
          <PeriodBreakdownPanel
            periods={data.periodBreakdowns}
            fetchedMessages={data.fetchedMessages}
            historyTruncated={data.historyTruncated}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold">Volume par dossier</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--muted)]">Nombre total de fils par libellé Gmail.</p>
            <div className="space-y-3">
              {data.folders.map((folder) => (
                <BarRow
                  key={folder.slug}
                  label={folder.name}
                  value={folder.total}
                  max={maxFolderTotal}
                  color={folder.color ?? "#c4c8d4"}
                  suffix={folder.unread > 0 ? ` · ${folder.unread} non lus` : ""}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold">Boîte de réception par BDD</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
              Répartition des {data.sampleSize} derniers mails selon Airtable.
            </p>
            <BreakdownChart items={data.inboxBreakdown} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Détail des dossiers</h2>
            <FolderTable folders={data.folders} />
          </div>

          <div className="rounded-2xl bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold">Contacts Airtable</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
              Nombre d’inscriptions par base (champ email).
            </p>
            {data.airtableCounts.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                PAT Airtable ou bases non configurées.
              </p>
            ) : (
              <div className="space-y-3">
                {data.airtableCounts.map((base) => (
                  <BarRow
                    key={base.id}
                    label={base.label}
                    value={base.count}
                    max={maxAirtable}
                    color={base.color}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

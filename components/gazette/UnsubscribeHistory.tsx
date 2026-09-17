"use client";

import { contrastText } from "@/lib/email";
import type { UnsubscribeHistoryItem, UnsubscribeKind, UnsubscribeStatus } from "@/lib/gazette-unsubscribe";
import { useEffect, useMemo, useState } from "react";

type ReviewMark = "treated" | "synced";
type Reviews = Record<string, ReviewMark>;
type DisplayStatus = UnsubscribeStatus | "treated";
type SortKey = "status" | "date-desc" | "date-asc";
type FilterKey = "all" | "todo" | "failed" | "not_found" | "treated" | "synced";

const STORAGE_KEY = "gazette-unsubscribe-reviews";

const STATUS_RANK: Record<DisplayStatus, number> = {
  failed: 0,
  not_found: 1,
  treated: 2,
  synced: 3,
};

function kindLabel(kind: UnsubscribeKind): string {
  if (kind === "gazette") return "Gazette";
  if (kind === "cours") return "Cours en ligne";
  return "Les 2";
}

function statusLabel(status: DisplayStatus): string {
  if (status === "synced") return "À jour";
  if (status === "failed") return "Échec";
  if (status === "treated") return "Introuvable · Traité";
  return "Introuvable";
}

function statusClass(status: DisplayStatus): string {
  if (status === "synced") return "bg-emerald-50 text-emerald-800";
  if (status === "failed") return "bg-amber-50 text-amber-800";
  if (status === "treated") return "bg-slate-100 text-slate-700";
  return "bg-red-50 text-red-800";
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayStatus(item: UnsubscribeHistoryItem, reviews: Reviews): DisplayStatus {
  const review = reviews[item.submissionId];
  if (review === "synced") return "synced";
  if (review === "treated") return "treated";
  return item.status;
}

function useReviews() {
  const [reviews, setReviews] = useState<Reviews>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Reviews;
      if (parsed && typeof parsed === "object") setReviews(parsed);
    } catch {
      // ignore broken storage
    }
  }, []);

  function mark(submissionId: string, value: ReviewMark | null) {
    setReviews((previous) => {
      const next = { ...previous };
      if (value) next[submissionId] = value;
      else delete next[submissionId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { reviews, mark };
}

function BaseBadges({ matches }: { matches: { id: string; color: string }[] }) {
  if (matches.length === 0) {
    return (
      <span className="rounded-full border border-dashed border-[var(--line)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
        Aucune BDD
      </span>
    );
  }

  return (
    <span className="flex flex-wrap gap-1">
      {matches.map((match) => (
        <span
          key={match.id}
          className="rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide"
          style={{ backgroundColor: match.color, color: contrastText(match.color) }}
        >
          {match.id}
        </span>
      ))}
    </span>
  );
}

function HistoryCard({
  item,
  status,
  onMark,
}: {
  item: UnsubscribeHistoryItem;
  status: DisplayStatus;
  onMark: (value: ReviewMark | null) => void;
}) {
  const pending = status === "not_found" || status === "failed";
  const reviewed = status === "treated" || (item.status !== "synced" && status === "synced");

  return (
    <li
      className={`rounded-2xl border p-3 ${
        pending
          ? "border-amber-200 bg-amber-50/70"
          : status === "treated"
            ? "border-[var(--line)] bg-[var(--paper)]"
            : "border-[var(--line)] bg-[var(--card)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="break-all text-sm font-medium">{item.email}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">{formatSubmittedAt(item.submittedAt)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 text-[11px] font-medium">
          {kindLabel(item.kind)}
        </span>
        <BaseBadges matches={item.matches} />
      </div>
      {item.reason ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.reason}</p> : null}

      {item.status === "not_found" || item.status === "failed" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {pending ? (
            <>
              {item.status === "not_found" ? (
                <button
                  type="button"
                  onClick={() => onMark("treated")}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-[var(--brand)]"
                >
                  Confirmer introuvable
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onMark("synced")}
                className="rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                Marquer à jour
              </button>
            </>
          ) : null}
          {reviewed ? (
            <button
              type="button"
              onClick={() => onMark(null)}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Annuler la vérif
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function UnsubscribeHistory({ items }: { items: UnsubscribeHistoryItem[] }) {
  const { reviews, mark } = useReviews();
  const [sort, setSort] = useState<SortKey>("status");
  const [filter, setFilter] = useState<FilterKey>("todo");

  const decorated = useMemo(
    () =>
      items.map((item) => ({
        item,
        status: displayStatus(item, reviews),
      })),
    [items, reviews],
  );

  const pending = decorated.filter((entry) => entry.status === "failed" || entry.status === "not_found");

  const visible = useMemo(() => {
    const filtered = decorated.filter((entry) => {
      if (filter === "all") return true;
      if (filter === "todo") return entry.status === "failed" || entry.status === "not_found";
      return entry.status === filter;
    });

    return filtered.sort((a, b) => {
      if (sort === "status") {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (rank !== 0) return rank;
      }
      const delta = a.item.submittedAt < b.item.submittedAt ? 1 : -1;
      return sort === "date-asc" ? -delta : delta;
    });
  }, [decorated, filter, sort]);

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Aucun désabonnement Fillout pour le moment.</p>;
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "todo", label: "À traiter" },
    { key: "failed", label: "Échecs" },
    { key: "not_found", label: "Introuvables" },
    { key: "treated", label: "Traités" },
    { key: "synced", label: "À jour" },
    { key: "all", label: "Tous" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-full px-2.5 py-1 text-xs ${
              filter === item.key
                ? "bg-[var(--brand)] font-medium text-white"
                : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { key: "status", label: "Échec → À jour" },
            { key: "date-desc", label: "Date récente" },
            { key: "date-asc", label: "Date ancienne" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSort(item.key)}
            className={`rounded-full px-2.5 py-1 text-xs ${
              sort === item.key
                ? "border border-[var(--brand)] text-[var(--brand)]"
                : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {pending.length > 0 && (filter === "todo" || filter === "all") ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Adresses à vérifier ({pending.length})
          </h3>
          <ul className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            {pending.map((entry) => (
              <li key={`mail-${entry.item.submissionId}`} className="break-all text-sm font-medium">
                {entry.item.email}
                <span className="ml-2 text-xs font-normal text-amber-800">
                  {statusLabel(entry.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Rien dans ce filtre.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((entry) => (
            <HistoryCard
              key={entry.item.submissionId}
              item={entry.item}
              status={entry.status}
              onMark={(value) => mark(entry.item.submissionId, value)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

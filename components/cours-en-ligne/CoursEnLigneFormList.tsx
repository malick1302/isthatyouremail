"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CoursFormStats } from "@/lib/cours-en-ligne";

export type CoursSortKey = "course-desc" | "course-asc" | "submission-desc" | "submission-asc";

const SORT_OPTIONS: { key: CoursSortKey; label: string }[] = [
  { key: "course-desc", label: "Date cours ↓" },
  { key: "course-asc", label: "Date cours ↑" },
  { key: "submission-desc", label: "Dernière soum. ↓" },
  { key: "submission-asc", label: "Dernière soum. ↑" },
];

function formatSubmittedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDelta(form: CoursFormStats): string | null {
  if (form.deltaVsPrevious === null) return null;
  const sign = form.deltaVsPrevious >= 0 ? "+" : "";
  const percent =
    form.deltaPercentVsPrevious !== null
      ? ` (${sign}${Math.round(form.deltaPercentVsPrevious)} %)`
      : "";
  const vsLabel = form.previousCourseDateLabel ? ` vs ${form.previousCourseDateLabel}` : "";
  return `${sign}${form.deltaVsPrevious}${percent}${vsLabel}`;
}

function compareNullableDate(a: string | null, b: string | null, direction: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  if (a === b) return 0;
  return (a < b ? -1 : 1) * direction;
}

function sortForms(forms: CoursFormStats[], sort: CoursSortKey): CoursFormStats[] {
  return [...forms].sort((left, right) => {
    const byName = left.displayName.localeCompare(right.displayName, "fr");
    if (sort === "course-asc") {
      return compareNullableDate(left.courseDate, right.courseDate, 1) || byName;
    }
    if (sort === "course-desc") {
      return compareNullableDate(left.courseDate, right.courseDate, -1) || byName;
    }
    if (sort === "submission-asc") {
      return compareNullableDate(left.lastSubmittedAt, right.lastSubmittedAt, 1) || byName;
    }
    return compareNullableDate(left.lastSubmittedAt, right.lastSubmittedAt, -1) || byName;
  });
}

function FormCard({ form }: { form: CoursFormStats }) {
  const lastDate = formatSubmittedAt(form.lastSubmittedAt);
  const delta = formatDelta(form);

  return (
    <div className="rounded-2xl bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{form.displayName}</h3>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{form.name}</p>
        </div>
        {form.courseDateLabel ? (
          <span className="shrink-0 rounded-full bg-[var(--paper)] px-3 py-1 text-sm font-medium text-[var(--brand)]">
            {form.courseDateLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Inscriptions</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{form.completions}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">vs session précédente</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {delta ?? "—"}
          </p>
        </div>
      </div>

      {lastDate ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Dernière soumission · {lastDate}</p>
      ) : null}

      <Link
        href={`/tu-cours-en-ligne/campagne?form=${encodeURIComponent(form.formId)}`}
        className="mt-4 inline-flex text-sm font-medium text-[var(--brand)] hover:underline"
      >
        Envoyer un mail →
      </Link>
    </div>
  );
}

export function CoursEnLigneFormList({ forms }: { forms: CoursFormStats[] }) {
  const [sort, setSort] = useState<CoursSortKey>("course-desc");
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => sortForms(forms, sort), [forms, sort]);
  const visible = useMemo(() => {
    const needle = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!needle) return sorted;
    return sorted.filter((form) => {
      const haystack = [form.displayName, form.name, form.courseDateLabel ?? ""]
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(needle);
    });
  }, [query, sorted]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Par session</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Trier la liste">
          {SORT_OPTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSort(item.key)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                sort === item.key
                  ? "bg-[var(--brand)] font-medium text-white"
                  : "bg-[var(--card)] text-[var(--ink)] hover:bg-[var(--line)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {forms.length > 0 ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une session (date, partenaire, titre…)"
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
        />
      ) : null}

      {sorted.length === 0 ? (
        <p className="rounded-2xl bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
          Aucun formulaire Fillout contenant « Cours en ligne » (hors questionnaires de feedback).
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
          Aucune session ne correspond à « {query.trim()} ».
        </p>
      ) : (
        visible.map((form) => <FormCard key={form.formId} form={form} />)
      )}
    </section>
  );
}

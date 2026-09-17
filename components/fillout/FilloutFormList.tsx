"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPercent, formatScore } from "@/components/fillout/format";
import type { FormKind, FormStats } from "@/lib/fillout";

export type SortKey = "date-asc" | "date-desc" | "note-desc" | "note-asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "date-desc", label: "Date décroissante" },
  { key: "date-asc", label: "Date croissante" },
  { key: "note-desc", label: "Meilleure note" },
  { key: "note-asc", label: "Moins bonne note" },
];

function formatSubmittedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function compareNullableNumber(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

function compareNullableDate(a: string | null, b: string | null, direction: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  if (a === b) return 0;
  return (a < b ? -1 : 1) * direction;
}

function sortForms(forms: FormStats[], sort: SortKey): FormStats[] {
  return [...forms].sort((left, right) => {
    const byName = left.displayName.localeCompare(right.displayName, "fr");
    if (sort === "note-desc") {
      return compareNullableNumber(left.avgModuleNote, right.avgModuleNote, -1) || byName;
    }
    if (sort === "note-asc") {
      return compareNullableNumber(left.avgModuleNote, right.avgModuleNote, 1) || byName;
    }
    if (sort === "date-asc") {
      return compareNullableDate(left.lastSubmittedAt, right.lastSubmittedAt, 1) || byName;
    }
    return compareNullableDate(left.lastSubmittedAt, right.lastSubmittedAt, -1) || byName;
  });
}

function FormCard({ form, href, kind }: { form: FormStats; href: string; kind: FormKind }) {
  const lastDate = formatSubmittedAt(form.lastSubmittedAt);

  return (
    <Link
      href={href}
      prefetch={false}
      className="block rounded-2xl bg-[var(--card)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{form.displayName}</h3>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{form.name}</p>
          {lastDate ? (
            <p className="mt-1 text-xs text-[var(--muted)]">Dernière soumission · {lastDate}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-medium text-[var(--brand)]">Détail →</span>
      </div>
      <div className={`mt-4 grid gap-3 ${kind === "module" ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Fois fait</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{form.completions}</p>
        </div>
        {kind === "module" ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Réussite</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatPercent(form.successRate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Note module</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatScore(form.avgModuleNote)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Note quiz</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatScore(form.avgQuizNote)}</p>
            </div>
          </>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Note moyenne</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatScore(form.avgModuleNote)}</p>
          </div>
        )}
      </div>
    </Link>
  );
}

export function FilloutFormList({
  forms,
  kind,
  basePath,
}: {
  forms: FormStats[];
  kind: FormKind;
  basePath: string;
}) {
  const [sort, setSort] = useState<SortKey>("date-desc");
  const sorted = useMemo(() => sortForms(forms, sort), [forms, sort]);
  const isModule = kind === "module";

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{isModule ? "Par module" : "Par grille"}</h2>
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

      {sorted.length === 0 ? (
        <p className="rounded-2xl bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
          Aucun formulaire Fillout correspondant
          {isModule ? " (nom commençant par [Module])" : " (nom contenant « Mots croisés »)"}.
        </p>
      ) : (
        sorted.map((form) => (
          <FormCard
            key={form.formId}
            form={form}
            kind={kind}
            href={`${basePath}/${encodeURIComponent(form.formId)}`}
          />
        ))
      )}
    </section>
  );
}

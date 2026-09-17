"use client";

import { CoursEnLigneFormList } from "@/components/cours-en-ligne/CoursEnLigneFormList";
import type { CoursEnLigneDashboard, CoursFormStats } from "@/lib/cours-en-ligne";
import { useEffect, useMemo, useState } from "react";

function attachCoursDeltas(forms: CoursFormStats[]): CoursFormStats[] {
  const withDate = forms
    .filter((form) => form.courseDate)
    .sort((a, b) => (a.courseDate! < b.courseDate! ? -1 : a.courseDate! > b.courseDate! ? 1 : 0));
  const deltaByFormId = new Map<
    string,
    Pick<CoursFormStats, "deltaVsPrevious" | "deltaPercentVsPrevious" | "previousCourseDateLabel">
  >();

  for (let i = 0; i < withDate.length; i += 1) {
    const current = withDate[i];
    const previous = i > 0 ? withDate[i - 1] : null;
    if (!previous) {
      deltaByFormId.set(current.formId, {
        deltaVsPrevious: null,
        deltaPercentVsPrevious: null,
        previousCourseDateLabel: null,
      });
      continue;
    }
    const delta = current.completions - previous.completions;
    deltaByFormId.set(current.formId, {
      deltaVsPrevious: delta,
      deltaPercentVsPrevious:
        previous.completions > 0 ? (delta / previous.completions) * 100 : null,
      previousCourseDateLabel: previous.courseDateLabel,
    });
  }

  return forms.map((form) => {
    const delta = deltaByFormId.get(form.formId);
    return {
      ...form,
      deltaVsPrevious: delta?.deltaVsPrevious ?? null,
      deltaPercentVsPrevious: delta?.deltaPercentVsPrevious ?? null,
      previousCourseDateLabel: delta?.previousCourseDateLabel ?? null,
    };
  });
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
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

function formatAverage(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export function CoursEnLigneOverview({ data }: { data: CoursEnLigneDashboard }) {
  const [forms, setForms] = useState<CoursFormStats[]>(data.forms);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    setForms(data.forms);
  }, [data.forms]);

  useEffect(() => {
    if (!data.configured || data.error || data.forms.length === 0) return;
    let cancelled = false;

    async function loadStats() {
      const current = [...data.forms];
      for (let index = 0; index < current.length; index += 1) {
        if (cancelled) return;
        try {
          const response = await fetch(
            `/api/cours-en-ligne/stats?formId=${encodeURIComponent(current[index].formId)}`,
          );
          const payload = (await response.json()) as {
            completions?: number;
            lastSubmittedAt?: string | null;
            error?: string;
          };
          if (cancelled) return;
          if (!response.ok) {
            setStatsError(payload.error ?? "Impossible de lire une session Fillout.");
            current[index] = { ...current[index], statsReady: true };
          } else {
            current[index] = {
              ...current[index],
              completions: payload.completions ?? 0,
              lastSubmittedAt: payload.lastSubmittedAt ?? null,
              statsReady: true,
            };
          }
          setForms(attachCoursDeltas(current));
        } catch {
          if (cancelled) return;
          current[index] = { ...current[index], statsReady: true };
          setForms(attachCoursDeltas(current));
          setStatsError("Impossible de lire une session Fillout.");
        }
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [data.configured, data.error, data.forms]);

  const readyForms = useMemo(() => forms.filter((form) => form.statsReady), [forms]);
  const completions = readyForms.reduce((sum, form) => sum + form.completions, 0);
  const avg = readyForms.length > 0 ? completions / readyForms.length : null;
  const statsPending = data.configured && !data.error && readyForms.length < forms.length;

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Inscriptions cours en ligne</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Soumissions Fillout par session — totaux, moyennes, et envoi d&apos;un mail Brevo aux
            inscrits.
          </p>
        </header>

        {!data.configured ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 text-sm">
            <p className="font-medium">Fillout non configuré</p>
            <p className="mt-2 text-[var(--muted)]">{data.error}</p>
          </div>
        ) : null}

        {data.error && data.configured ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
            {data.error}
          </div>
        ) : null}

        {data.configured && !data.error ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                label="Sessions"
                value={String(data.totals.formCount)}
                accent="var(--brand)"
              />
              <KpiCard
                label="Inscriptions totales"
                value={statsPending && readyForms.length === 0 ? "…" : String(completions)}
                hint={
                  statsPending
                    ? `${readyForms.length}/${forms.length} sessions lues`
                    : undefined
                }
              />
              <KpiCard
                label="Moyenne par session"
                value={statsPending && readyForms.length === 0 ? "…" : formatAverage(avg)}
                hint="Inscriptions / session"
              />
            </section>
            {statsError ? <p className="text-sm text-red-700">{statsError}</p> : null}

            <CoursEnLigneFormList forms={forms} />
          </>
        ) : null}
      </div>
    </div>
  );
}

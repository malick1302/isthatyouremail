import Link from "next/link";
import { formatPercent, formatScore } from "@/components/fillout/format";
import type { FormKind, FormStats } from "@/lib/fillout";

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--card)] p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function FilloutDetail({ form, kind }: { form: FormStats; kind: FormKind }) {
  const isModule = kind === "module";
  const backHref = isModule ? "/modules" : "/mots-croises";

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <Link href={backHref} className="text-sm text-[var(--brand)] hover:underline">
            ← {isModule ? "Tous les modules" : "Toutes les grilles"}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{form.displayName}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{form.name}</p>
        </header>

        <section className={`grid gap-4 sm:grid-cols-2 ${isModule ? "xl:grid-cols-5" : "xl:grid-cols-2"}`}>
          <KpiCard label="Fois fait" value={String(form.completions)} />
          {isModule ? (
            <>
              <KpiCard label="Réussite" value={formatPercent(form.successRate)} hint="Moyenne quiz" />
              <KpiCard label="Note module" value={formatScore(form.avgModuleNote)} hint="Moyenne" />
              <KpiCard label="Note quiz" value={formatScore(form.avgQuizNote)} hint="Moyenne" />
              <KpiCard label="Commentaires" value={String(form.commentCount)} />
            </>
          ) : (
            <KpiCard label="Note moyenne" value={formatScore(form.avgModuleNote)} />
          )}
        </section>

        {isModule ? (
          <section className="rounded-2xl bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold">Commentaires</h2>
            {form.comments.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Aucun retour sur ce module pour le moment.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {form.comments.map((comment, index) => (
                  <li
                    key={`${comment.submissionId}-${index}`}
                    className="rounded-xl bg-[var(--paper)] px-4 py-3"
                  >
                    <p className="text-sm leading-6">{comment.text}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {comment.submittedAt
                        ? new Date(comment.submittedAt).toLocaleString("fr-FR")
                        : "Date inconnue"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

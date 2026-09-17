import Link from "next/link";
import { CONTENU_ACAD_BASE_LABEL, CONTENU_TABLES } from "@/lib/contenu-acad";

export function ContenuAcadHome() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            Contenu ACAD
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
            Ajoute des modules, articles, cours et vidéos dans Airtable{" "}
            <strong className="text-[var(--ink)]">{CONTENU_ACAD_BASE_LABEL}</strong> sans ouvrir la
            base. Les fiches apparaissent ensuite sur le site de l&apos;académie.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {CONTENU_TABLES.map((table) => (
            <Link
              key={table.slug}
              href={`/contenu-acad/${table.slug}`}
              prefetch={false}
              className="group flex h-full flex-col rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(36,28,20,0.1)]"
            >
              <span className="h-1.5 w-12 rounded-full bg-[var(--brand)]" aria-hidden />
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl leading-tight">
                {table.label}
              </h2>
              <p className="mt-2 flex-1 text-[15px] leading-6 text-[var(--muted)]">
                {table.description}
              </p>
              <span className="mt-6 text-sm font-medium text-[var(--brand)] underline decoration-transparent group-hover:decoration-current">
                Ajouter du contenu →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

"use client";

import { contrastText } from "@/lib/email";
import { useState, type FormEvent } from "react";

type TKiBase = {
  id: string;
  label: string;
  color: string;
};

type TKiResult = {
  email: string;
  bases: TKiBase[];
};

export function TKiView({ airtableReady }: { airtableReady: boolean }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TKiResult | null>(null);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/t-ki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as TKiResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Impossible de chercher cette adresse.");
        return;
      }
      setResult(data);
    } catch {
      setError("Impossible de chercher cette adresse.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            De quelle BDD vient ce mail ?
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
            Saisis une adresse e-mail : on interroge toutes les bases Airtable configurées et on
            liste celles où l&apos;inscrit est présent.
          </p>
        </header>

        {!airtableReady ? (
          <p className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
            Ajoute <code className="text-[var(--ink)]">AIRTABLE_PAT</code> dans{" "}
            <code className="text-[var(--ink)]">.env.local</code> et configure{" "}
            <code className="text-[var(--ink)]">config/bases.json</code>.
          </p>
        ) : null}

        <form
          onSubmit={(event) => void lookup(event)}
          className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]"
        >
          <label className="block text-sm font-medium" htmlFor="tki-email">
            Adresse e-mail
          </label>
          <input
            id="tki-email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prenom.nom@example.com"
            className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
          />

          <button
            type="submit"
            disabled={pending || !airtableReady}
            className="mt-6 w-full rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Recherche…" : "Chercher"}
          </button>

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </form>

        {result ? (
          <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Résultat
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--ink)]">{result.email}</p>

            {result.bases.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Cette adresse n&apos;apparaît dans aucune base Airtable configurée.
              </p>
            ) : result.bases.length === 1 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Présente dans la base suivante :
              </p>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Présente dans {result.bases.length} bases :
              </p>
            )}

            {result.bases.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {result.bases.map((base) => (
                  <li
                    key={base.id}
                    className="rounded-full px-3 py-1.5 text-sm font-medium shadow-sm"
                    style={{
                      backgroundColor: base.color,
                      color: contrastText(base.color),
                    }}
                  >
                    {base.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

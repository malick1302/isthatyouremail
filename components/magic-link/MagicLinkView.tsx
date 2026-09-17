"use client";

import { contrastText } from "@/lib/email";
import { useState, type FormEvent } from "react";

export type MagicLinkBaseOption = {
  id: string;
  label: string;
  color: string;
  softrLabel: string;
  softrUrl: string;
};

type MagicLinkResult = {
  magicLink: string;
  email: string;
  base: { id: string; label: string; color: string };
  site: { id: string; label: string; url: string };
};

export function MagicLinkView({
  bases,
  softrReady,
}: {
  bases: MagicLinkBaseOption[];
  softrReady: boolean;
}) {
  const [email, setEmail] = useState("");
  const [baseId, setBaseId] = useState(bases[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MagicLinkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = bases.find((base) => base.id === baseId);

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCopied(false);
    setResult(null);

    try {
      const response = await fetch("/api/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, baseId }),
      });
      const data = (await response.json()) as MagicLinkResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Impossible de créer le magic link.");
        return;
      }
      setResult(data);
    } catch {
      setError("Impossible de créer le magic link.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!result?.magicLink) return;
    try {
      await navigator.clipboard.writeText(result.magicLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            Créer un magic link Softr
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
            Indique l&apos;email et la BDD : on vérifie l&apos;inscrit, on ouvre Users sur le
            site Softr lié, puis on génère le lien de connexion.
          </p>
        </header>

        {!softrReady ? (
          <p className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
            Ajoute <code className="text-[var(--ink)]">SOFTR_API_KEY</code> dans{" "}
            <code className="text-[var(--ink)]">.env.local</code> : Softr → ton workspace →{" "}
            <strong className="text-[var(--ink)]">API tokens</strong>.
          </p>
        ) : null}

        <form
          onSubmit={(event) => void createLink(event)}
          className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]"
        >
          <label className="block text-sm font-medium" htmlFor="magic-email">
            Adresse e-mail
          </label>
          <input
            id="magic-email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prenom.nom@example.com"
            className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
          />

          <p className="mt-6 text-sm font-medium">Base Airtable</p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Base Airtable">
            {bases.map((base) => {
              const active = base.id === baseId;
              return (
                <button
                  key={base.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBaseId(base.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active ? "shadow-sm" : "border border-[var(--line)] bg-white text-[var(--ink)]"
                  }`}
                  style={
                    active
                      ? { backgroundColor: base.color, color: contrastText(base.color) }
                      : undefined
                  }
                >
                  {base.label}
                </button>
              );
            })}
          </div>

          {selected ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Site Softr :{" "}
              <a
                href={selected.softrUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--brand)] hover:underline"
              >
                {selected.softrLabel}
              </a>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || !softrReady || !baseId}
            className="mt-6 w-full rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Création du lien…" : "Créer le magic link"}
          </button>

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </form>

        {result ? (
          <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Magic link
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {result.email} · {result.base.label} → {result.site.label}
            </p>
            <p className="mt-4 break-all rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm">
              {result.magicLink}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {copied ? "Copié" : "Copier"}
              </button>
              <a
                href={result.magicLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium hover:border-[var(--brand)]"
              >
                Ouvrir
              </a>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

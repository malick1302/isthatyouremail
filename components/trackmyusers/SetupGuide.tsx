"use client";

import { useState } from "react";
import type { SoftrSiteConfig } from "@/lib/types";

function SnippetBlock({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-[#1c1c28] p-4 text-xs leading-5 text-white/90">
        <code>{snippet}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
      >
        {copied ? "Copié !" : "Copier"}
      </button>
    </div>
  );
}

export function SetupGuide({
  host,
  sites,
  snippets,
}: {
  host: string;
  sites: SoftrSiteConfig[];
  snippets: Record<string, string>;
}) {
  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Configurer PostHog sur Softr</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Colle le snippet correspondant dans chaque site Softr pour commencer le suivi.
          </p>
        </header>

        <section className="rounded-2xl bg-[var(--card)] p-5 text-sm leading-6">
          <h2 className="text-lg font-semibold">Étapes</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--muted)]">
            <li>Ouvre le projet PostHog branché à l&apos;app (<a href={host.replace(".i.posthog.com", ".posthog.com")} target="_blank" rel="noopener noreferrer" className="text-[#736ced] hover:underline">{host}</a>).</li>
            <li>Copie la clé publique du projet dans <code className="text-[var(--ink)]">NEXT_PUBLIC_POSTHOG_KEY</code> et la clé personnelle + l&apos;ID projet dans <code className="text-[var(--ink)]">.env.local</code>.</li>
            <li>Dans chaque site Softr : <strong className="text-[var(--ink)]">Settings → Custom Code → Head</strong>.</li>
            <li>Colle le snippet ci-dessous (un par site, avec le bon <code className="text-[var(--ink)]">site_id</code>).</li>
            <li>Publie le site Softr et visite quelques pages pour vérifier les événements dans PostHog.</li>
          </ol>
        </section>

        {sites.map((site) => (
          <section key={site.id} className="rounded-2xl bg-[var(--card)] p-5">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: site.color }}
                aria-hidden
              />
              <h2 className="text-lg font-semibold">{site.label}</h2>
              <span className="text-sm text-[var(--muted)]">— site_id: {site.id}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{site.url}</p>
            <div className="mt-4">
              <SnippetBlock snippet={snippets[site.id] ?? ""} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

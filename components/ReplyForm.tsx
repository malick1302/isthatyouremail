"use client";

import { ClassifyControl } from "@/components/ClassifyControl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SendAsAlias } from "@/lib/types";

type Props = {
  threadId: string;
  defaultFrom: string;
  to: string;
  subject: string;
  inReplyTo?: string;
  references?: string;
  aliases: SendAsAlias[];
  suggestedLabel?: string;
  folders: string[];
  listPath?: string;
  compact?: boolean;
  fill?: boolean;
  onCancel?: () => void;
};

export function ReplyForm({
  threadId,
  defaultFrom,
  to,
  subject,
  inReplyTo,
  references,
  aliases,
  suggestedLabel,
  folders,
  listPath,
  compact = false,
  fill = false,
  onCancel,
}: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(
    aliases.some((alias) => alias.email === defaultFrom)
      ? defaultFrom
      : (aliases[0]?.email ?? defaultFrom),
  );
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [filed, setFiled] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const response = await fetch("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId,
        from,
        to,
        subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
        body,
        inReplyTo,
        references,
        folder: suggestedLabel ?? null,
      }),
    });
    const data = (await response.json()) as { error?: string; filed?: string | null };
    if (!response.ok) {
      setStatus("error");
      setError(data.error ?? "Envoi impossible.");
      return;
    }
    setStatus("sent");
    setBody("");
    setFiled(data.filed ?? null);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        fill
          ? "flex h-full min-h-0 flex-col p-4"
          : "mt-6 rounded-2xl border border-[var(--line)] bg-white p-4"
      }
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-base font-semibold ${fill ? "text-white" : ""}`}>Répondre</p>
          {suggestedLabel ? (
            <p className={`text-sm ${fill ? "text-white/80" : "text-[var(--muted)]"}`}>
              Alias suggéré pour{" "}
              <strong className={fill ? "text-white" : "text-[var(--ink)]"}>{suggestedLabel}</strong>
              {" · "}sera classé dans ce dossier après envoi.
            </p>
          ) : (
            <p className={`text-sm ${fill ? "text-white/80" : "text-[var(--muted)]"}`}>
              Contact non reconnu : après l’envoi, classe-le dans un dossier (ou Autre).
            </p>
          )}
        </div>
        <label
          className={`flex flex-col gap-1 text-xs uppercase tracking-wide ${
            fill ? "text-white/80" : "text-[var(--muted)]"
          }`}
        >
          De
          <select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="min-w-[220px] rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm normal-case text-[var(--ink)]"
          >
            {aliases.map((alias) => (
              <option key={alias.email} value={alias.email}>
                {alias.name ? `${alias.name} <${alias.email}>` : alias.email}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={`mb-2 shrink-0 text-sm ${fill ? "text-white/80" : "text-[var(--muted)]"}`}>
        À {to}
      </p>
      <textarea
        required
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={compact ? 5 : 8}
        placeholder="Écris ta réponse…"
        className={`w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-[15px] leading-6 text-[var(--ink)] outline-none focus:border-[var(--accent)] ${
          fill ? "min-h-0 flex-1 resize-none" : ""
        }`}
      />
      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {status === "sending" ? "Envoi…" : "Envoyer"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)]"
          >
            Annuler
          </button>
        ) : null}
        {status === "sent" && filed ? (
          <span className={`text-sm ${fill ? "text-white" : "text-[var(--accent)]"}`}>
            Envoyé et classé dans {filed}.
          </span>
        ) : null}
        {status === "sent" && !filed ? (
          <span className={`text-sm ${fill ? "text-white/80" : "text-[var(--muted)]"}`}>
            Envoyé. Classe le mail ci-dessous.
          </span>
        ) : null}
        {status === "error" ? (
          <span className={`text-sm ${fill ? "text-white" : "text-red-800"}`}>{error}</span>
        ) : null}
      </div>
      {status === "sent" && !filed ? (
        <div className="mt-3 shrink-0 border-t border-[var(--line)] pt-3">
          <ClassifyControl threadId={threadId} folders={folders} listPath={listPath} />
        </div>
      ) : null}
    </form>
  );
}

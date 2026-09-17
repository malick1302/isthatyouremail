"use client";

import { INBOX_FOLDER } from "@/lib/folders";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  threadId: string;
  folders: string[];
  compact?: boolean;
  listPath?: string;
};

export function ClassifyControl({
  threadId,
  folders,
  compact = false,
  listPath,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onChange(folder: string) {
    if (!folder) return;
    setStatus("saving");
    setError("");
    const response = await fetch("/api/gmail/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, folder }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus("error");
      setError(data.error ?? "Classement impossible.");
      return;
    }
    setStatus("done");
    if (folder === INBOX_FOLDER) {
      router.push("/inbox");
    } else if (listPath) {
      router.push(listPath);
    }
    router.refresh();
  }

  return (
    <div
      className={compact ? "flex flex-col items-end gap-1" : "flex flex-wrap items-center gap-2"}
      onClick={(event) => event.preventDefault()}
    >
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {compact ? "Classer" : "Dossier"}
        <select
          defaultValue=""
          disabled={status === "saving"}
          onChange={(event) => {
            void onChange(event.target.value);
            event.target.value = "";
          }}
          className="min-w-[140px] rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm normal-case text-[var(--ink)]"
        >
          <option value="" disabled>
            {status === "saving" ? "Classement…" : "Choisir…"}
          </option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </label>
      {status === "done" ? (
        <span className="text-xs text-[var(--accent)]">Classé.</span>
      ) : null}
      {status === "error" ? (
        <span className="max-w-[220px] text-right text-xs leading-4 text-red-800">{error}</span>
      ) : null}
    </div>
  );
}

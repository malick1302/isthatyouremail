"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/gazette/sync", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Synchronisation impossible.");
        return;
      }
      router.refresh();
    } catch {
      setError("Synchronisation impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void sync()}
        disabled={pending}
        className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Synchronisation…" : "Synchroniser"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

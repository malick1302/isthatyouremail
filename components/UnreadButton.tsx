"use client";

import { useSetUnread } from "@/components/UnreadState";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UnreadButton({
  threadId,
  unread,
  compact = false,
}: {
  threadId: string;
  unread: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const setUnread = useSetUnread();
  const [busy, setBusy] = useState(false);

  async function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    const nextUnread = !unread;
    setUnread(threadId, nextUnread);
    await fetch(nextUnread ? "/api/gmail/unread" : "/api/gmail/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={unread ? "Marquer comme lu" : "Marquer comme non lu"}
      className={
        compact
          ? "rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[11px] text-[var(--ink)] disabled:opacity-60"
          : "rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm text-[var(--ink)] disabled:opacity-60"
      }
    >
      {busy ? "…" : unread ? "Non lu" : "Lu"}
    </button>
  );
}

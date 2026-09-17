"use client";

import { ClassifyControl } from "@/components/ClassifyControl";
import { MatchBadges } from "@/components/MatchBadges";
import { UnreadButton } from "@/components/UnreadButton";
import { useUnreadState } from "@/components/UnreadState";
import { contrastText, fadeHex } from "@/lib/email";
import type { InboxMessage } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function MessageRow({
  message,
  folders,
  listPath,
  selected = false,
  showRecipient = false,
}: {
  message: InboxMessage;
  folders: string[];
  listPath: string;
  selected?: boolean;
  showRecipient?: boolean;
}) {
  const router = useRouter();
  const [unread, setUnread] = useUnreadState(message.threadId, message.unread);
  const peerName = showRecipient ? message.toName : message.fromName;
  const peerEmail = showRecipient ? message.toEmail : message.fromEmail;
  const baseColor = message.matches[0]?.color ?? "#f6c443";
  const rowColor = unread ? baseColor : undefined;
  const ink = unread ? contrastText(baseColor) : undefined;
  const muted = unread ? `${ink}99` : undefined;

  return (
    <div
      className={`flex overflow-hidden rounded-2xl ${
        unread ? "" : "bg-[var(--paper)]"
      } ${selected ? "ring-2 ring-white/70" : ""}`}
      style={rowColor ? { backgroundColor: rowColor } : undefined}
    >
      <Link
        href={`${listPath}?mail=${encodeURIComponent(message.threadId)}`}
        onClick={() => {
          if (unread) {
            setUnread(false);
            void fetch("/api/gmail/read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ threadId: message.threadId }),
            }).then(() => router.refresh());
          }
        }}
        className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3"
      >
        <span
          className="mt-1 h-10 w-1.5 rounded-full"
          style={{ backgroundColor: unread ? ink : fadeHex(baseColor) }}
          aria-hidden
        />
        <span className="min-w-0">
          <span
            className={`block truncate text-sm ${unread ? "font-semibold" : "font-normal text-[var(--ink)]"}`}
            style={ink ? { color: ink } : undefined}
          >
            {showRecipient ? `À ${peerName}` : peerName}
          </span>
          <span
            className={`mt-0.5 block truncate text-xs ${unread ? "" : "text-[var(--muted)]"}`}
            style={muted ? { color: muted } : undefined}
          >
            {peerEmail}
          </span>
          <span
            className={`mt-0.5 block truncate text-sm ${unread ? "font-medium" : "text-[var(--ink)]"}`}
            style={ink ? { color: ink } : undefined}
          >
            {message.subject}
          </span>
          <span
            className={`mt-0.5 block truncate text-xs ${unread ? "" : "text-[var(--muted)]"}`}
            style={muted ? { color: muted } : undefined}
          >
            {message.snippet}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <time
            className={`text-[11px] ${unread ? "" : "text-[var(--muted)]"}`}
            style={muted ? { color: muted } : undefined}
          >
            {message.dateLabel}
          </time>
          <MatchBadges matches={message.matches} unread={unread} />
        </span>
      </Link>
      <div className="flex flex-col items-end justify-center gap-1 pr-2">
        <UnreadButton threadId={message.threadId} unread={unread} compact />
        <ClassifyControl threadId={message.threadId} folders={folders} compact listPath={listPath} />
      </div>
    </div>
  );
}

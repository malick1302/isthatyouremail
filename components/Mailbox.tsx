import { MailList } from "@/components/MailList";
import { ReadingPane } from "@/components/ReadingPane";
import { loadThreadView, type ThreadView } from "@/lib/thread";
import type { InboxMessage } from "@/lib/types";
import type { ReactNode } from "react";

export async function Mailbox({
  title,
  listPath,
  messages,
  selectedId,
  accessToken,
  userEmail,
  empty,
  error,
  banner,
  showRecipient = false,
}: {
  title: string;
  listPath: string;
  messages: InboxMessage[];
  selectedId?: string;
  accessToken: string;
  userEmail?: string | null;
  empty: string;
  error?: string;
  banner?: ReactNode;
  showRecipient?: boolean;
}) {
  let thread: ThreadView | null = null;
  let threadError = "";
  let list = messages;

  if (selectedId) {
    try {
      thread = await loadThreadView(accessToken, selectedId, userEmail);
    } catch {
      threadError = "Impossible d’ouvrir ce mail.";
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <section className="flex h-full w-[min(100%,420px)] shrink-0 flex-col bg-[var(--brand)]">
        <div className="shrink-0 bg-[var(--inbox-title)] px-5 py-4">
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {banner}
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </p>
          ) : (
            <MailList
              messages={list}
              empty={empty}
              listPath={listPath}
              selectedId={selectedId}
              showRecipient={showRecipient}
            />
          )}
        </div>
      </section>

      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[var(--card)]">
        {thread ? (
          <ReadingPane
            key={thread.threadId}
            thread={thread}
            listPath={listPath}
            unread={list.find((message) => message.threadId === selectedId)?.unread ?? false}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-[var(--muted)]">
            {threadError || "Sélectionne un mail pour le lire ici."}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { ClassifyControl } from "@/components/ClassifyControl";
import { MailBody } from "@/components/MailBody";
import { MatchBadges } from "@/components/MatchBadges";
import { ReplyForm } from "@/components/ReplyForm";
import { UnreadButton } from "@/components/UnreadButton";
import { useUnreadState } from "@/components/UnreadState";
import type { ThreadView } from "@/lib/thread";
import { useState } from "react";

export function ReadingPane({
  thread,
  listPath,
  unread: serverUnread,
}: {
  thread: ThreadView;
  listPath: string;
  unread: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [unread] = useUnreadState(thread.threadId, serverUnread);
  const single = thread.messages.length === 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 bg-[var(--pane-header)] px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">{thread.subject}</h2>
          <p className="mt-1 truncate text-sm font-medium">{thread.counterpartName}</p>
          <p className="truncate text-sm text-[var(--ink)]/70">{thread.counterpartEmail}</p>
          <p className="mt-1 text-sm text-[var(--ink)]/70">
            {thread.matches.length > 0
              ? `Contact trouvé dans ${thread.matches.map((match) => match.label).join(", ")}.`
              : "Ce contact n’est dans aucune base configurée."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <MatchBadges matches={thread.matches} />
          <UnreadButton threadId={thread.threadId} unread={unread} />
          <ClassifyControl threadId={thread.threadId} folders={thread.folders} listPath={listPath} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={`flex min-h-0 flex-col bg-[var(--paper)] ${
            replyOpen ? "flex-[4_1_0%]" : "flex-[8_1_0%]"
          } ${single ? "overflow-hidden pt-5 pl-6" : "overflow-y-auto px-6 py-4"}`}
        >
          {thread.messages.map((message) => (
            <article
              key={message.id}
              className={`flex min-h-0 flex-col ${single ? "h-full flex-1" : "mb-6"}`}
            >
              {!single ? (
                <div className="mb-2 flex shrink-0 flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{message.fromName}</p>
                  <time className="text-xs text-[var(--muted)]">{message.dateLabel}</time>
                </div>
              ) : null}
              <MailBody html={message.html} text={message.text} fill={single} />
            </article>
          ))}
        </div>

        <div
          className={`flex min-h-0 flex-col bg-[var(--reply-bar)] ${
            replyOpen ? "flex-[6_1_0%]" : "flex-[2_1_0%]"
          }`}
        >
          {replyOpen ? (
            thread.aliases.length > 0 ? (
              <ReplyForm
                threadId={thread.threadId}
                defaultFrom={thread.from}
                to={thread.to}
                subject={thread.subject}
                inReplyTo={thread.inReplyTo}
                references={thread.references}
                aliases={thread.aliases}
                suggestedLabel={thread.suggestedLabel}
                folders={thread.folders}
                listPath={listPath}
                fill
                onCancel={() => setReplyOpen(false)}
              />
            ) : (
              <p className="p-5 text-sm text-white/80">
                Aucun alias Gmail « Envoyer en tant que » n’est disponible sur ce compte.
              </p>
            )
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <button
                type="button"
                onClick={() => setReplyOpen(true)}
                className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-medium text-white"
              >
                Répondre
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

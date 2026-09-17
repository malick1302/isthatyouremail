import { MessageRow } from "@/components/MessageRow";
import { getClassifyFolderNames } from "@/lib/folders";
import type { InboxMessage } from "@/lib/types";

export function MailList({
  messages,
  empty,
  listPath,
  selectedId,
  showRecipient = false,
}: {
  messages: InboxMessage[];
  empty: string;
  listPath: string;
  selectedId?: string;
  showRecipient?: boolean;
}) {
  const folders = getClassifyFolderNames();
  if (messages.length === 0) {
    return (
      <p className="px-3 py-10 text-center text-sm text-white/80">{empty}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          folders={folders}
          listPath={listPath}
          selected={selectedId === message.threadId}
          showRecipient={showRecipient}
        />
      ))}
    </div>
  );
}

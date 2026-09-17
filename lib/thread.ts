import { matchEmails } from "@/lib/airtable";
import { suggestedAlias } from "@/lib/match";
import { getClassifyFolderNames } from "@/lib/folders";
import { getThread, listSendAs } from "@/lib/gmail";
import { normalizeEmail, parseFirstAddress } from "@/lib/email";
import type { BaseMatch, SendAsAlias, ThreadMessage } from "@/lib/types";

export type ThreadView = {
  threadId: string;
  subject: string;
  messages: ThreadMessage[];
  matches: BaseMatch[];
  aliases: SendAsAlias[];
  from: string;
  to: string;
  counterpartName: string;
  counterpartEmail: string;
  suggestedLabel?: string;
  folders: string[];
  inReplyTo?: string;
  references?: string;
};

export async function loadThreadView(
  accessToken: string,
  threadId: string,
  userEmail?: string | null,
): Promise<ThreadView> {
  const messages = await getThread(accessToken, threadId);
  if (messages.length === 0) {
    throw new Error("Fil vide");
  }

  const me = normalizeEmail(userEmail ?? "");
  const last = messages[messages.length - 1];
  const other = [...messages].reverse().find((message) => message.fromEmail !== me);
  const fallbackTo = parseFirstAddress(last.to ?? "");
  const counterpartEmail = other?.fromEmail || fallbackTo.email;
  const counterpartName = other?.fromName || fallbackTo.name || fallbackTo.email;
  const matchMap = await matchEmails([counterpartEmail]);
  const matches = matchMap.get(normalizeEmail(counterpartEmail)) ?? [];
  const aliases = await listSendAs(accessToken);
  const from = suggestedAlias(matches, aliases) ?? aliases[0]?.email ?? me;

  return {
    threadId,
    subject: last.subject,
    messages,
    matches,
    aliases,
    from,
    to: other?.from || last.to,
    counterpartName,
    counterpartEmail,
    suggestedLabel: matches[0]?.label,
    folders: getClassifyFolderNames(),
    inReplyTo: last.messageIdHeader,
    references: last.references,
  };
}

import { matchEmails } from "@/lib/airtable";
import { normalizeEmail } from "@/lib/email";
import type { BaseMatch, InboxMessage } from "@/lib/types";

export async function attachMatches(
  messages: InboxMessage[],
  emailOf: (message: InboxMessage) => string = (message) => message.fromEmail,
): Promise<InboxMessage[]> {
  const map = await matchEmails(messages.map(emailOf));
  return messages.map((message) => ({
    ...message,
    matches: map.get(normalizeEmail(emailOf(message))) ?? [],
  }));
}

export function suggestedAlias(
  matches: BaseMatch[],
  sendAs: { email: string }[],
): string | undefined {
  const allowed = new Set(sendAs.map((alias) => alias.email.toLowerCase()));
  for (const match of matches) {
    if (allowed.has(match.gmailAlias.toLowerCase())) return match.gmailAlias;
  }
  return sendAs.find((alias) => alias.email)?.email;
}

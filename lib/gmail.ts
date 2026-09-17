import { formatDateLabel, parseAddress, parseFirstAddress } from "@/lib/email";
import {
  buildRfc822,
  extractBodies,
  headerValue,
  toBase64Url,
  type GmailPart,
} from "@/lib/mime";
import type { InboxMessage, SendAsAlias, ThreadMessage } from "@/lib/types";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

class GmailError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof GmailError)) return false;
  const lower = error.message.toLowerCase();
  return (
    error.status === 429 ||
    (error.status === 403 && (lower.includes("quota") || lower.includes("rate limit")))
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function gmailFetchWithRetry<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await gmailFetch<T>(accessToken, path, init);
    } catch (error) {
      if (!isQuotaError(error) || attempt === 3) throw error;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw new Error("Gmail API indisponible.");
}

async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GMAIL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new GmailError(
      `Gmail API ${response.status}: ${details.slice(0, 280)}`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

type MessageList = {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
};
type MessageResource = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  payload?: GmailPart;
};
type ThreadResource = { id: string; messages?: MessageResource[] };
type SendAsList = {
  sendAs?: {
    sendAsEmail?: string;
    displayName?: string;
    isPrimary?: boolean;
    isDefault?: boolean;
    verificationStatus?: string;
  }[];
};
type LabelList = {
  labels?: {
    id?: string;
    name?: string;
    type?: string;
  }[];
  nextPageToken?: string;
};

export function formatGmailAfter(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function mapMessageResource(message: MessageResource): InboxMessage {
  const headers = message.payload?.headers ?? [];
  const fromRaw = headerValue(headers, "From");
  const toRaw = headerValue(headers, "To");
  const parsed = parseAddress(fromRaw);
  const toParsed = parseFirstAddress(toRaw);
  const date = headerValue(headers, "Date");
  return {
    id: message.id,
    threadId: message.threadId,
    from: fromRaw,
    fromName: parsed.name || parsed.email,
    fromEmail: parsed.email,
    to: toRaw,
    toName: toParsed.name || toParsed.email,
    toEmail: toParsed.email,
    subject: headerValue(headers, "Subject") || "(sans objet)",
    snippet: message.snippet ?? "",
    date,
    dateLabel: formatDateLabel(date),
    matches: [],
    unread: (message.labelIds ?? []).includes("UNREAD"),
  };
}

function dedupeByThread(refs: { id: string; threadId: string }[]): { id: string; threadId: string }[] {
  const seen = new Map<string, { id: string; threadId: string }>();
  for (const ref of refs) {
    if (!seen.has(ref.threadId)) seen.set(ref.threadId, ref);
  }
  return [...seen.values()];
}

async function fetchMessageDetails(
  accessToken: string,
  refs: { id: string; threadId: string }[],
): Promise<InboxMessage[]> {
  const unique = dedupeByThread(refs);
  const messages: InboxMessage[] = [];
  const chunkSize = 5;
  const delayMs = 350;

  for (let index = 0; index < unique.length; index += chunkSize) {
    const chunk = unique.slice(index, index + chunkSize);
    const details = await Promise.all(
      chunk.map((ref) =>
        gmailFetchWithRetry<MessageResource>(
          accessToken,
          `/messages/${ref.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        ),
      ),
    );
    messages.push(...details.map(mapMessageResource));
    if (index + chunkSize < unique.length) await sleep(delayMs);
  }
  return messages;
}

export async function listMessagesSince(
  accessToken: string,
  after: Date,
  maxMessages = 250,
): Promise<{ messages: InboxMessage[]; truncated: boolean }> {
  const query = encodeURIComponent(`after:${formatGmailAfter(after)}`);
  const refs: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;

  do {
    const pageSize = Math.min(100, maxMessages - refs.length);
    if (pageSize <= 0) break;
    let path = `/messages?maxResults=${pageSize}&q=${query}`;
    if (pageToken) path += `&pageToken=${encodeURIComponent(pageToken)}`;
    const list = await gmailFetch<MessageList>(accessToken, path);
    refs.push(...(list.messages ?? []));
    pageToken = list.nextPageToken;
  } while (pageToken && refs.length < maxMessages);

  const messages = await fetchMessageDetails(accessToken, refs);
  return { messages, truncated: Boolean(pageToken) };
}

export async function listMessages(
  accessToken: string,
  labelId: string,
  max = 40,
): Promise<InboxMessage[]> {
  const list = await gmailFetch<MessageList>(
    accessToken,
    `/messages?maxResults=${max}&labelIds=${encodeURIComponent(labelId)}`,
  );
  return fetchMessageDetails(accessToken, list.messages ?? []);
}

export async function listInbox(accessToken: string, max = 40): Promise<InboxMessage[]> {
  return listMessages(accessToken, "INBOX", max);
}

export async function listSent(accessToken: string, max = 40): Promise<InboxMessage[]> {
  return listMessages(accessToken, "SENT", max);
}

export async function listFolder(
  accessToken: string,
  folderName: string,
  max = 40,
): Promise<InboxMessage[]> {
  const labels = await listAllLabels(accessToken);
  const label = labels.find((item) => item.name.toLowerCase() === folderName.toLowerCase());
  if (!label) return [];
  return listMessages(accessToken, label.id, max);
}

export async function markThreadRead(accessToken: string, threadId: string): Promise<void> {
  await gmailFetch(accessToken, `/threads/${encodeURIComponent(threadId)}/modify`, {
    method: "POST",
    body: JSON.stringify({
      removeLabelIds: ["UNREAD"],
    }),
  });
}

export async function markThreadUnread(accessToken: string, threadId: string): Promise<void> {
  await gmailFetch(accessToken, `/threads/${encodeURIComponent(threadId)}/modify`, {
    method: "POST",
    body: JSON.stringify({
      addLabelIds: ["UNREAD"],
    }),
  });
}

export async function getThread(accessToken: string, threadId: string): Promise<ThreadMessage[]> {
  const thread = await gmailFetch<ThreadResource>(
    accessToken,
    `/threads/${encodeURIComponent(threadId)}?format=full`,
  );

  return (thread.messages ?? []).map((message) => {
    const headers = message.payload?.headers ?? [];
    const fromRaw = headerValue(headers, "From");
    const parsed = parseAddress(fromRaw);
    const date = headerValue(headers, "Date");
    const bodies = extractBodies(message.payload);
    const messageIdHeader = headerValue(headers, "Message-ID") || headerValue(headers, "Message-Id");
    const references = headerValue(headers, "References");
    return {
      id: message.id,
      threadId: message.threadId,
      from: fromRaw,
      fromName: parsed.name || parsed.email,
      fromEmail: parsed.email,
      to: headerValue(headers, "To"),
      date,
      dateLabel: formatDateLabel(date),
      subject: headerValue(headers, "Subject") || "(sans objet)",
      messageIdHeader,
      references: [references, messageIdHeader].filter(Boolean).join(" ").trim(),
      text: bodies.text,
      html: bodies.html,
    };
  });
}

export async function listSendAs(accessToken: string): Promise<SendAsAlias[]> {
  const data = await gmailFetch<SendAsList>(accessToken, "/settings/sendAs");
  return (data.sendAs ?? [])
    .filter((alias) => alias.sendAsEmail && alias.verificationStatus !== "pending")
    .map((alias) => ({
      email: alias.sendAsEmail!,
      name: alias.displayName ?? "",
      isPrimary: Boolean(alias.isPrimary),
      isDefault: Boolean(alias.isDefault),
    }));
}

export async function sendReply(
  accessToken: string,
  options: {
    threadId: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
  },
): Promise<void> {
  const raw = toBase64Url(
    buildRfc822({
      from: options.from,
      to: options.to,
      subject: options.subject,
      body: options.body,
      inReplyTo: options.inReplyTo,
      references: options.references,
    }),
  );

  await gmailFetch(accessToken, "/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw, threadId: options.threadId }),
  });
}

export type GmailLabel = { id: string; name: string };

export type LabelStats = {
  name: string;
  unread: number;
  total: number;
};

async function listAllLabels(accessToken: string): Promise<GmailLabel[]> {
  const labels: GmailLabel[] = [];
  let pageToken: string | undefined;
  do {
    const query = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    const data = await gmailFetch<LabelList>(accessToken, `/labels${query}`);
    for (const label of data.labels ?? []) {
      if (label.id && label.name) {
        labels.push({ id: label.id, name: label.name });
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return labels;
}

export async function getLabelStats(
  accessToken: string,
  names: string[],
): Promise<Map<string, LabelStats>> {
  const labels = await listAllLabels(accessToken);
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const targets = labels.filter((label) => wanted.has(label.name.toLowerCase()));

  const details = await Promise.all(
    targets.map((label) =>
      gmailFetch<{ name?: string; messagesUnread?: number; messagesTotal?: number }>(
        accessToken,
        `/labels/${encodeURIComponent(label.id)}`,
      ),
    ),
  );

  const stats = new Map<string, LabelStats>();
  for (const label of details) {
    if (!label.name) continue;
    stats.set(label.name.toLowerCase(), {
      name: label.name,
      unread: label.messagesUnread ?? 0,
      total: label.messagesTotal ?? 0,
    });
  }
  return stats;
}

export async function getLabelCounts(
  accessToken: string,
  names: string[],
): Promise<Map<string, number>> {
  const stats = await getLabelStats(accessToken, names);
  const counts = new Map<string, number>();
  for (const [key, value] of stats) {
    counts.set(key, value.unread);
  }
  return counts;
}

async function ensureLabel(accessToken: string, name: string): Promise<string> {
  const labels = await listAllLabels(accessToken);
  const existing = labels.find((label) => label.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const created = await gmailFetch<{ id: string }>(accessToken, "/labels", {
    method: "POST",
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
  return created.id;
}

export async function fileThread(
  accessToken: string,
  threadId: string,
  folderName: string,
  otherFolderNames: string[],
): Promise<void> {
  const targetId = await ensureLabel(accessToken, folderName);
  const labels = await listAllLabels(accessToken);
  const remove = otherFolderNames
    .filter((name) => name.toLowerCase() !== folderName.toLowerCase())
    .map((name) => labels.find((label) => label.name.toLowerCase() === name.toLowerCase())?.id)
    .filter((id): id is string => Boolean(id));

  await gmailFetch(accessToken, `/threads/${encodeURIComponent(threadId)}/modify`, {
    method: "POST",
    body: JSON.stringify({
      addLabelIds: [targetId],
      removeLabelIds: [...new Set([...remove, "INBOX"])],
    }),
  });
}

export async function moveThreadToInbox(
  accessToken: string,
  threadId: string,
  folderNames: string[],
): Promise<void> {
  const labels = await listAllLabels(accessToken);
  const remove = folderNames
    .map((name) => labels.find((label) => label.name.toLowerCase() === name.toLowerCase())?.id)
    .filter((id): id is string => Boolean(id));

  await gmailFetch(accessToken, `/threads/${encodeURIComponent(threadId)}/modify`, {
    method: "POST",
    body: JSON.stringify({
      addLabelIds: ["INBOX"],
      removeLabelIds: [...new Set(remove)],
    }),
  });
}

export async function ensureFolderLabels(accessToken: string, names: string[]): Promise<void> {
  const labels = await listAllLabels(accessToken);
  const existing = new Set(labels.map((label) => label.name.toLowerCase()));
  for (const name of names) {
    if (existing.has(name.toLowerCase())) continue;
    await gmailFetch(accessToken, "/labels", {
      method: "POST",
      body: JSON.stringify({
        name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    });
  }
}

export function isGmailError(error: unknown): error is GmailError {
  return error instanceof GmailError;
}

export function friendlyGmailError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();
  if (
    lower.includes("insufficient") ||
    lower.includes("insufficientpermissions") ||
    (lower.includes("403") && lower.includes("scope"))
  ) {
    return "Google n’a pas encore autorisé le classement. Clique sur Reconnecter Gmail en haut, puis accepte tous les droits (y compris modifier les libellés).";
  }
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429")) {
    return "Quota Gmail dépassé. Attends 1 à 2 minutes puis recharge la page Analytics.";
  }
  return message || fallback;
}

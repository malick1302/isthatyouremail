type GmailHeader = { name?: string | null; value?: string | null };
export type GmailPart = {
  mimeType?: string | null;
  filename?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailPart[] | null;
  headers?: GmailHeader[] | null;
};

export function headerValue(headers: GmailHeader[] | null | undefined, name: string): string {
  const needle = name.toLowerCase();
  return (
    headers?.find((header) => (header.name ?? "").toLowerCase() === needle)?.value ?? ""
  );
}

export function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function extractBodies(payload: GmailPart | null | undefined): {
  text: string;
  html: string;
} {
  const acc = { text: "", html: "" };
  walk(payload, acc);
  return acc;
}

function walk(part: GmailPart | null | undefined, acc: { text: string; html: string }) {
  if (!part) return;
  const mime = part.mimeType ?? "";
  const data = part.body?.data;
  if (data && mime === "text/plain" && !acc.text) {
    acc.text = decodeBase64Url(data);
  }
  if (data && mime === "text/html" && !acc.html) {
    acc.html = decodeBase64Url(data);
  }
  for (const child of part.parts ?? []) {
    walk(child, acc);
  }
}

export function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildRfc822(options: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const lines = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${encodeHeader(options.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  if (options.inReplyTo) lines.push(`In-Reply-To: ${options.inReplyTo}`);
  if (options.references) lines.push(`References: ${options.references}`);
  return `${lines.join("\r\n")}\r\n\r\n${options.body}`;
}

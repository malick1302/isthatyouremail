import { normalizeEmail } from "@/lib/email";

const DEFAULT_DOMAINS = ["clic-et-moi.com"];

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,;\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function allowedDomains(): string[] {
  const fromEnv = parseList(process.env.AUTH_ALLOWED_DOMAINS);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_DOMAINS;
}

export function allowedEmails(): string[] {
  return parseList(process.env.AUTH_ALLOWED_EMAILS).map((email) => normalizeEmail(email));
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email ?? "");
  if (!normalized.includes("@")) return false;
  if (allowedEmails().includes(normalized)) return true;
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  return allowedDomains().includes(domain);
}

export function isVerifiedGoogleEmail(
  profile: { email_verified?: boolean | string } | undefined,
): boolean {
  return profile?.email_verified !== false && profile?.email_verified !== "false";
}

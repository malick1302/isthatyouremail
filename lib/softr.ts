import { getSoftrDomain } from "@/lib/softr-sites";
import type { SoftrSiteConfig } from "@/lib/types";

const SOFTR_USERS_API = "https://studio-api.softr.io/v1/api";

export function softrConfigured(): boolean {
  return Boolean(process.env.SOFTR_API_KEY);
}

function softrHeaders(domain: string): HeadersInit {
  return {
    "Softr-Api-Key": process.env.SOFTR_API_KEY ?? "",
    "Softr-Domain": domain,
    "Content-Type": "application/json",
  };
}

function parseSoftrError(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as { message?: string; error?: string; detail?: string };
    const message = data.message ?? data.error ?? data.detail;
    if (message) return message;
  } catch {
    // texte brut
  }
  if (status === 401) return "Clé API Softr invalide ou domaine incorrect.";
  if (status === 404) return "Cet utilisateur n'existe pas encore dans Softr Users.";
  const snippet = body.trim().slice(0, 180);
  return snippet || `Softr a répondu ${status}.`;
}

function extractMagicLink(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;

  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    const candidates = [data.magic_link, data.magicLink, data.url, data.link];
    for (const value of candidates) {
      if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
    }
  } catch {
    // pas du JSON
  }

  const unquoted = trimmed.replace(/^"|"$/g, "");
  if (/^https?:\/\//i.test(unquoted)) return unquoted;

  const match = trimmed.match(/https?:\/\/[^\s"']+/);
  return match?.[0] ?? null;
}

async function requestMagicLink(domain: string, email: string): Promise<string> {
  const response = await fetch(
    `${SOFTR_USERS_API}/users/magic-link/generate/${encodeURIComponent(email)}`,
    { method: "POST", headers: softrHeaders(domain) },
  );
  const body = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error(parseSoftrError(response.status, body)), {
      status: response.status,
    });
  }
  const link = extractMagicLink(body);
  if (!link) throw new Error("Softr n'a pas renvoyé de magic link.");
  return link;
}

export async function syncSoftrUser(domain: string, email: string): Promise<void> {
  const response = await fetch(`${SOFTR_USERS_API}/users/sync`, {
    method: "POST",
    headers: softrHeaders(domain),
    body: JSON.stringify([email]),
  });
  if (!response.ok) {
    throw new Error(parseSoftrError(response.status, await response.text()));
  }
}

export async function generateSoftrMagicLink(
  site: SoftrSiteConfig,
  email: string,
): Promise<string> {
  const domain = getSoftrDomain(site);

  try {
    return await requestMagicLink(domain, email);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
    const message = error instanceof Error ? error.message : "";
    const missingUser =
      status === 404 || /not found|n'existe pas|does not exist|unknown user/i.test(message);
    if (!missingUser) throw error;

    await syncSoftrUser(domain, email);
    return await requestMagicLink(domain, email);
  }
}

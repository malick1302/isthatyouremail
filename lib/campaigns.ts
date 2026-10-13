export type CampaignKind = "gazette" | "cours" | "session";

export function canonicalizeBrevoProcessStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function isBrevoImportDone(status: unknown): boolean {
  const normalized = canonicalizeBrevoProcessStatus(status);
  return (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "done" ||
    normalized === "success" ||
    normalized === "processed"
  );
}

export function isBrevoImportFailed(status: unknown): boolean {
  const normalized = canonicalizeBrevoProcessStatus(status);
  return (
    normalized === "failed" ||
    normalized === "fail" ||
    normalized === "error" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  );
}

export function isBrevoImportReady(options: {
  status?: unknown;
  uniqueSubscribers?: number;
  expected?: number;
}): boolean {
  if (isBrevoImportFailed(options.status)) return false;
  if (isBrevoImportDone(options.status)) return true;
  const unique = Number(options.uniqueSubscribers ?? 0);
  const expected = Number(options.expected ?? 0);
  if (!Number.isFinite(unique) || unique <= 0) return false;
  if (expected > 0 && unique >= expected) return true;
  if (expected > 20 && unique >= Math.floor(expected * 0.95)) return true;
  return false;
}

export type BrevoImportWaitList = {
  listId: number;
  processId?: number;
  expected?: number;
};

export async function pollBrevoImportsUntilReady(
  lists: BrevoImportWaitList[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const pending = lists
    .filter((list) => Number(list.listId) > 0)
    .map((list) => ({ ...list, unique: 0 }));
  if (pending.length === 0) {
    return { ok: false, message: "Aucune liste Brevo à suivre." };
  }

  let lastStatus = "inconnu";
  const maxAttempts = 180;
  for (let attempt = 0; attempt < maxAttempts && pending.length > 0; attempt += 1) {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const list = pending[index];
      const params = new URLSearchParams();
      params.set("listId", String(list.listId));
      if (Number(list.processId) > 0) params.set("processId", String(list.processId));
      const statusResponse = await fetch(`/api/campaigns/import-status?${params}`, {
        credentials: "include",
      });
      const statusData = (await statusResponse.json()) as {
        status?: string;
        uniqueSubscribers?: number;
        error?: string;
      };
      if (!statusResponse.ok) {
        return {
          ok: false,
          message: statusData.error ?? "Impossible de suivre l'import Brevo.",
        };
      }
      lastStatus = statusData.status ?? lastStatus;
      list.unique = Number(statusData.uniqueSubscribers ?? list.unique) || list.unique;
      if (isBrevoImportFailed(statusData.status)) {
        return { ok: false, message: "L'import des contacts Brevo a échoué." };
      }
      if (
        isBrevoImportReady({
          status: statusData.status,
          uniqueSubscribers: list.unique,
          expected: list.expected,
        })
      ) {
        pending.splice(index, 1);
      }
    }
    if (pending.length === 0) break;
    if (attempt === maxAttempts - 1) {
      if (pending.every((list) => list.unique > 0)) return { ok: true };
      const lastCount = pending.reduce((sum, list) => sum + list.unique, 0);
      return {
        ok: false,
        message: `L'import Brevo prend trop de temps (dernier statut : ${lastStatus}, ${lastCount} contact${lastCount > 1 ? "s" : ""}). Réessaie, ou vérifie Contacts → Processus dans Brevo.`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { ok: true };
}

export const BREVO_IMPORT_CHUNK = 150;

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}

export async function importRecipientsThenWait(
  lists: { listId: number; emails: string[] }[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const list of lists) {
    const emails = [...new Set(list.emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
    const chunks: string[][] = [];
    for (let offset = 0; offset < emails.length; offset += BREVO_IMPORT_CHUNK) {
      chunks.push(emails.slice(offset, offset + BREVO_IMPORT_CHUNK));
    }

    let failed: string | null = null;
    await runPool(chunks, 3, async (chunk) => {
      if (failed) return;
      const response = await fetch("/api/campaigns/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list.listId, emails: chunk }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        failed = data.error ?? "Impossible d'ajouter les contacts Brevo.";
      }
    });
    if (failed) return { ok: false, message: failed };
  }

  return { ok: true };
}

export const APP_CAMPAIGN_TAG = "acad-app";

export type CampaignBaseOption = {
  id: string;
  label: string;
  color: string;
};

export type CampaignTemplate = {
  id: number;
  name: string;
  subject: string;
};

export type CampaignRecipients = {
  baseId: string;
  label: string;
  color: string;
  emails: string[];
  optedOut: number;
  invalid: number;
  scanned: number;
};

export type CampaignBaseStat = {
  id: string;
  label: string;
  color: string;
  sent: number;
  uniqueOpens: number;
  openRate: number | null;
  shareOfOpens: number | null;
};

export type CampaignHistoryItem = {
  id: number;
  name: string;
  subject: string;
  kind: CampaignKind | null;
  status: string;
  sentAt: string | null;
  sent: number;
  delivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  unsubscriptions: number;
  bounces: number;
  openRate: number | null;
  clickRate: number | null;
  deliveryRate: number | null;
  bases: CampaignBaseStat[];
};

export function isCampaignKind(value: unknown): value is CampaignKind {
  return value === "gazette" || value === "cours" || value === "session";
}

export function campaignKindLabel(kind: CampaignKind): string {
  if (kind === "gazette") return "Gazette";
  if (kind === "cours") return "Annonce de cours en ligne";
  return "Session cours";
}

const PARIS_TZ = "Europe/Paris";

type ParisParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function parisParts(date: Date): ParisParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = pick("hour");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: hour === "24" ? "00" : hour,
    minute: pick("minute"),
    second: pick("second"),
  };
}

export function campaignStamp(now = new Date()): string {
  const parts = parisParts(now);
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}h${parts.minute}`;
}

export function formatParisDateInput(date = new Date()): string {
  const parts = parisParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function defaultCampaignSchedule(): { date: string; time: string } {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { date: formatParisDateInput(tomorrow), time: "09:00" };
}

function parisWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = desired;
  for (let i = 0; i < 3; i += 1) {
    const shown = parisParts(new Date(utc));
    const shownUtc = Date.UTC(
      Number(shown.year),
      Number(shown.month) - 1,
      Number(shown.day),
      Number(shown.hour),
      Number(shown.minute),
      Number(shown.second),
    );
    utc += desired - shownUtc;
  }
  return new Date(utc);
}

export function parseParisDateTime(date: string, time: string): Date {
  const dateMatch = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) {
    throw new Error("Date ou heure d'envoi invalide.");
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    throw new Error("Date ou heure d'envoi invalide.");
  }
  return parisWallTimeToDate(year, month, day, hour, minute);
}

export function formatParisScheduleLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function toBrevoScheduledAt(date: Date): string {
  const parts = parisParts(date);
  const shownUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMin = Math.round((shownUtc - date.getTime()) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}${sign}${hours}:${minutes}`;
}

export function parseCampaignSchedule(value: unknown): Date | null {
  if (value == null || value === false || value === "" || value === "now") return null;
  let date: Date | null = null;
  if (typeof value === "string") {
    const [rawDate, rawTime] = value.split("T");
    if (rawDate && rawTime) {
      date = parseParisDateTime(rawDate, rawTime.slice(0, 5));
    }
  } else if (typeof value === "object") {
    const record = value as { date?: unknown; time?: unknown };
    if (typeof record.date === "string" && typeof record.time === "string") {
      date = parseParisDateTime(record.date, record.time);
    }
  }
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error("Date ou heure d'envoi invalide.");
  }
  if (date.getTime() < Date.now() + 60_000) {
    throw new Error("Choisis une date et une heure dans le futur (heure de Paris).");
  }
  return date;
}

export type CampaignKind = "gazette" | "cours" | "session";

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

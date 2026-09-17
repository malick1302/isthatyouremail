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

export function campaignStamp(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("day")}/${pick("month")}/${pick("year")} ${pick("hour")}h${pick("minute")}`;
}

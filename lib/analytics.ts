import { countRecordsPerBase } from "@/lib/airtable";
import { getConfiguredBases } from "@/lib/bases";
import { normalizeEmail } from "@/lib/email";
import { getNavFolders } from "@/lib/folders";
import { getLabelStats, listInbox, listMessagesSince, friendlyGmailError } from "@/lib/gmail";
import { attachMatches } from "@/lib/match";
import type { InboxMessage } from "@/lib/types";

export type FolderAnalytics = {
  name: string;
  slug: string;
  href: string;
  color: string | null;
  unread: number;
  total: number;
  read: number;
};

export type InboxBreakdown = {
  label: string;
  color: string;
  total: number;
  unread: number;
};

export type PeriodKey = "7d" | "30d" | "90d" | "180d" | "365d";

export type BddPeriodStat = {
  label: string;
  color: string;
  count: number;
  percent: number;
};

export type PeriodBreakdown = {
  key: PeriodKey;
  label: string;
  total: number;
  truncated: boolean;
  byBdd: BddPeriodStat[];
};

export type AnalyticsDashboard = {
  inboxUnread: number;
  inboxTotal: number;
  totalUnread: number;
  totalClassified: number;
  inboxKnown: number;
  inboxUnknown: number;
  folders: FolderAnalytics[];
  inboxBreakdown: InboxBreakdown[];
  airtableCounts: { id: string; label: string; color: string; count: number }[];
  sampleSize: number;
  periodBreakdowns: PeriodBreakdown[];
  fetchedMessages: number;
  historyTruncated: boolean;
};

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "7d", label: "7 derniers jours", days: 7 },
  { key: "30d", label: "Dernier mois", days: 30 },
  { key: "90d", label: "Dernier trimestre", days: 90 },
  { key: "180d", label: "Dernier semestre", days: 180 },
  { key: "365d", label: "Dernière année", days: 365 },
];

const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;
const analyticsCache = new Map<string, { at: number; data: AnalyticsDashboard }>();

function buildInboxBreakdown(messages: InboxMessage[]) {
  const breakdownMap = new Map<string, InboxBreakdown>();
  let inboxKnown = 0;
  let inboxUnknown = 0;

  for (const message of messages) {
    const primary = message.matches[0];
    const label = primary?.label ?? "Autre";
    const color = primary?.color ?? "#f6c443";
    if (primary) inboxKnown += 1;
    else inboxUnknown += 1;

    const current = breakdownMap.get(label) ?? { label, color, total: 0, unread: 0 };
    current.total += 1;
    if (message.unread) current.unread += 1;
    breakdownMap.set(label, current);
  }

  return {
    inboxKnown,
    inboxUnknown,
    inboxBreakdown: [...breakdownMap.values()].sort((a, b) => b.total - a.total),
  };
}

function buildPeriodBreakdowns(
  messages: InboxMessage[],
  userEmail: string | null | undefined,
  truncated: boolean,
): PeriodBreakdown[] {
  const me = normalizeEmail(userEmail ?? "");
  const received = messages.filter((message) => {
    const from = normalizeEmail(message.fromEmail);
    if (!from) return false;
    if (me && from === me) return false;
    const parsed = new Date(message.date);
    return !Number.isNaN(parsed.getTime());
  });

  const now = Date.now();
  const baseLabels = getConfiguredBases().map((base) => ({
    label: base.label,
    color: base.color,
  }));

  return PERIODS.map((period) => {
    const cutoff = now - period.days * 24 * 60 * 60 * 1000;
    const inPeriod = received.filter((message) => new Date(message.date).getTime() >= cutoff);
    const total = inPeriod.length;
    const counts = new Map<string, BddPeriodStat>();

    for (const base of baseLabels) {
      counts.set(base.label, { label: base.label, color: base.color, count: 0, percent: 0 });
    }
    counts.set("Autre", { label: "Autre", color: "#f6c443", count: 0, percent: 0 });

    for (const message of inPeriod) {
      const primary = message.matches[0];
      const label = primary?.label ?? "Autre";
      const color = primary?.color ?? "#f6c443";
      const current = counts.get(label) ?? { label, color, count: 0, percent: 0 };
      current.count += 1;
      counts.set(label, current);
    }

    const byBdd = [...counts.values()]
      .map((item) => ({
        ...item,
        percent: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      key: period.key,
      label: period.label,
      total,
      truncated,
      byBdd,
    };
  });
}

export async function loadAnalyticsDashboard(
  accessToken: string,
  userEmail?: string | null,
): Promise<AnalyticsDashboard> {
  const cacheKey = userEmail ?? "default";
  const cached = analyticsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < ANALYTICS_CACHE_TTL_MS) {
    return cached.data;
  }

  const nav = getNavFolders();
  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365);

  const labelStats = await getLabelStats(
    accessToken,
    nav.map((folder) => folder.gmailName),
  );
  const inboxMessages = await attachMatches(await listInbox(accessToken, 40));
  const [history, airtableCounts] = await Promise.all([
    listMessagesSince(accessToken, yearAgo, 250),
    countRecordsPerBase(),
  ]);

  const matchedHistory = await attachMatches(history.messages);

  const folders: FolderAnalytics[] = nav.map((folder) => {
    const stats = labelStats.get(folder.gmailName.toLowerCase());
    const unread = stats?.unread ?? 0;
    const total = stats?.total ?? 0;
    return {
      name: folder.name,
      slug: folder.slug,
      href: folder.href,
      color: folder.color,
      unread,
      total,
      read: Math.max(total - unread, 0),
    };
  });

  const inbox = folders.find((folder) => folder.slug === "inbox");
  const inboxUnread = inbox?.unread ?? 0;
  const inboxTotal = inbox?.total ?? 0;
  const totalUnread = folders.reduce((sum, folder) => sum + folder.unread, 0);
  const totalClassified = folders
    .filter((folder) => folder.slug !== "inbox")
    .reduce((sum, folder) => sum + folder.total, 0);

  const { inboxKnown, inboxUnknown, inboxBreakdown } = buildInboxBreakdown(inboxMessages);
  const periodBreakdowns = buildPeriodBreakdowns(
    matchedHistory,
    userEmail,
    history.truncated,
  );

  const result = {
    inboxUnread,
    inboxTotal,
    totalUnread,
    totalClassified,
    inboxKnown,
    inboxUnknown,
    folders,
    inboxBreakdown,
    airtableCounts,
    sampleSize: inboxMessages.length,
    periodBreakdowns,
    fetchedMessages: matchedHistory.length,
    historyTruncated: history.truncated,
  };

  analyticsCache.set(cacheKey, { at: Date.now(), data: result });
  return result;
}

export function analyticsErrorMessage(error: unknown): string {
  return friendlyGmailError(error, "Impossible de charger les analytics.");
}

import { listCampaignEmailsByBase } from "@/lib/airtable";
import { getConfiguredBases } from "@/lib/bases";
import {
  basesFromNamedLists,
  exportCampaignOpeners,
  getEmailCampaign,
  listContactListNames,
  listListEmails,
  rate,
  toHistoryItem,
} from "@/lib/brevo";
import type { CampaignBaseStat, CampaignKind } from "@/lib/campaigns";

export type CampaignBaseBreakdown = {
  bases: CampaignBaseStat[];
  opensKnown: boolean;
  approximated: boolean;
};

const cache = new Map<number, { at: number; value: CampaignBaseBreakdown }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function getCampaignBaseBreakdown(campaignId: number): Promise<CampaignBaseBreakdown> {
  const cached = cache.get(campaignId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const [overview, detailed] = await Promise.all([
    getEmailCampaign(campaignId, "globalStats"),
    getEmailCampaign(campaignId, "campaignStats"),
  ]);
  const item = toHistoryItem(overview);
  const listIds = detailed.recipients?.lists ?? overview.recipients?.lists ?? [];
  const listNames = await listContactListNames();
  const fromLists = basesFromNamedLists(
    detailed.statistics?.campaignStats,
    listNames,
    item.uniqueOpens,
  );
  if (fromLists.length > 0) {
    const value = { bases: fromLists, opensKnown: true, approximated: false };
    cache.set(campaignId, { at: Date.now(), value });
    return value;
  }

  if (item.kind === "session") {
    const value = { bases: [], opensKnown: true, approximated: false };
    cache.set(campaignId, { at: Date.now(), value });
    return value;
  }

  const sentEmails = new Set<string>();
  for (const listId of listIds) {
    for (const email of await listListEmails(listId)) {
      sentEmails.add(email);
    }
  }

  const kind: CampaignKind = item.kind === "cours" ? "cours" : "gazette";
  const recipients = await listCampaignEmailsByBase(kind);
  let openers: Set<string> | null = null;
  try {
    openers = await exportCampaignOpeners(campaignId);
  } catch {
    openers = null;
  }

  const rows: CampaignBaseStat[] = [];
  for (const base of getConfiguredBases()) {
    const row = recipients.find((item) => item.baseId === base.id);
    const emails = row?.emails ?? [];
    let sent = 0;
    let uniqueOpens = 0;
    for (const email of emails) {
      if (sentEmails.size > 0 && !sentEmails.has(email)) continue;
      sent += 1;
      if (openers?.has(email)) uniqueOpens += 1;
    }
    if (sent === 0) continue;
    rows.push({
      id: base.id,
      label: base.label,
      color: base.color,
      sent,
      uniqueOpens: openers ? uniqueOpens : 0,
      openRate: openers ? rate(uniqueOpens, sent) : null,
      shareOfOpens: openers ? rate(uniqueOpens, item.uniqueOpens) : null,
    });
  }

  let leftoverSent = 0;
  let leftoverOpens = 0;
  const attributed = new Set(recipients.flatMap((row) => row.emails));
  for (const email of sentEmails) {
    if (attributed.has(email)) continue;
    leftoverSent += 1;
    if (openers?.has(email)) leftoverOpens += 1;
  }
  if (leftoverSent > 0) {
    rows.push({
      id: "unknown",
      label: "Hors bases actuelles",
      color: "#9ca3af",
      sent: leftoverSent,
      uniqueOpens: openers ? leftoverOpens : 0,
      openRate: openers ? rate(leftoverOpens, leftoverSent) : null,
      shareOfOpens: openers ? rate(leftoverOpens, item.uniqueOpens) : null,
    });
  }

  rows.sort((a, b) => b.uniqueOpens - a.uniqueOpens || b.sent - a.sent);
  const opensKnown = Boolean(openers && openers.size > 0);
  const value = { bases: rows, opensKnown, approximated: true };
  if (opensKnown) {
    cache.set(campaignId, { at: Date.now(), value });
  }
  return value;
}

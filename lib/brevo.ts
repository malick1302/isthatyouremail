import type {
  CampaignBaseStat,
  CampaignHistoryItem,
  CampaignKind,
  CampaignTemplate,
} from "@/lib/campaigns";
import { getConfiguredBases } from "@/lib/bases";
import { APP_CAMPAIGN_TAG, campaignKindLabel, campaignStamp } from "@/lib/campaigns";
import { isSendableEmail, normalizeEmail } from "@/lib/email";

const BREVO_API = "https://api.brevo.com/v3";

type BrevoErrorBody = {
  code?: string;
  message?: string;
};

export type BrevoProcessStatus =
  | "queued"
  | "in_process"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type BrevoProcess = {
  id: number;
  status: BrevoProcessStatus;
  exportUrl?: string;
};

function apiKey(): string {
  return process.env.BREVO_API_KEY?.trim() ?? "";
}

export function brevoConfigured(): boolean {
  return Boolean(apiKey());
}

export function brevoSender(): { email: string; name: string } | null {
  const email = process.env.BREVO_SENDER_EMAIL?.trim() ?? "";
  const name = process.env.BREVO_SENDER_NAME?.trim() ?? "";
  if (!email || !name) return null;
  return { email, name };
}

function parseBrevoError(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as BrevoErrorBody;
    if (data.message) return data.message;
  } catch {
    // texte brut
  }
  const snippet = body.trim().slice(0, 220);
  if (status === 401) return "Clé API Brevo invalide.";
  if (status === 402) return "Crédits Brevo insuffisants pour envoyer la campagne.";
  return snippet || `Brevo a répondu ${status}.`;
}

async function brevoFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = apiKey();
  if (!key) {
    throw new Error("Ajoute BREVO_API_KEY dans .env.local (Brevo → SMTP & API).");
  }
  const headers = new Headers(init?.headers);
  headers.set("api-key", key);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${BREVO_API}${path}`, { ...init, headers });
}

async function brevoJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await brevoFetch(path, init);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(parseBrevoError(response.status, body));
  }
  if (!body.trim()) return {} as T;
  return JSON.parse(body) as T;
}

async function brevoEmpty(path: string, init?: RequestInit): Promise<void> {
  const response = await brevoFetch(path, init);
  if (response.status === 204) return;
  const body = await response.text();
  if (!response.ok) {
    throw new Error(parseBrevoError(response.status, body));
  }
}

export async function listActiveTemplates(): Promise<CampaignTemplate[]> {
  const templates: CampaignTemplate[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const params = new URLSearchParams({
      templateStatus: "true",
      limit: String(limit),
      offset: String(offset),
      sort: "desc",
    });
    const data = await brevoJson<{
      count?: number;
      templates?: {
        id: number;
        name?: string;
        subject?: string;
        isActive?: boolean;
      }[];
    }>(`/smtp/templates?${params}`);

    for (const template of data.templates ?? []) {
      if (template.isActive === false) continue;
      templates.push({
        id: template.id,
        name: template.name?.trim() || `Template ${template.id}`,
        subject: template.subject?.trim() || "",
      });
    }

    offset += limit;
    const total = data.count ?? templates.length;
    if (!data.templates?.length || offset >= total) break;
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getTemplate(templateId: number): Promise<{
  id: number;
  name: string;
  subject: string;
}> {
  const template = await brevoJson<{
    id: number;
    name?: string;
    subject?: string;
    isActive?: boolean;
  }>(`/smtp/templates/${templateId}`);
  if (template.isActive === false) {
    throw new Error("Ce template Brevo n'est pas actif.");
  }
  return {
    id: template.id,
    name: template.name?.trim() || `Template ${template.id}`,
    subject: template.subject?.trim() || "",
  };
}

export async function sendTemplateTest(templateId: number, email: string): Promise<void> {
  await brevoEmpty(`/smtp/templates/${templateId}/sendTest`, {
    method: "POST",
    body: JSON.stringify({ emailTo: [email] }),
  });
}

async function resolveFolderId(): Promise<number> {
  const configured = Number(process.env.BREVO_FOLDER_ID);
  if (Number.isInteger(configured) && configured > 0) return configured;

  const folders = await brevoJson<{ folders?: { id: number; name?: string }[] }>(
    "/contacts/folders?limit=50&offset=0",
  );
  const existing = folders.folders?.[0]?.id;
  if (existing) return existing;

  const created = await brevoJson<{ id: number }>("/contacts/folders", {
    method: "POST",
    body: JSON.stringify({ name: "ACAD campagnes" }),
  });
  if (!created.id) throw new Error("Impossible de créer un dossier Brevo.");
  return created.id;
}

export async function createDatedList(kind: CampaignKind): Promise<{ listId: number; name: string }> {
  const name = `${campaignKindLabel(kind)} ${campaignStamp()}`;
  const folderId = await resolveFolderId();
  const created = await brevoJson<{ id: number }>("/contacts/lists", {
    method: "POST",
    body: JSON.stringify({ name, folderId }),
  });
  if (!created.id) throw new Error("Impossible de créer la liste Brevo.");
  return { listId: created.id, name };
}

export async function createDatedBaseLists(
  kind: CampaignKind,
  bases: { id: string; label: string; emails: string[] }[],
): Promise<{ listId: number; processId: number; baseId: string }[]> {
  const stamp = campaignStamp();
  const folderId = await resolveFolderId();
  const created: { listId: number; processId: number; baseId: string }[] = [];

  for (const base of bases) {
    const name = `${campaignKindLabel(kind)} ${stamp} — ${base.label}`;
    const list = await brevoJson<{ id: number }>("/contacts/lists", {
      method: "POST",
      body: JSON.stringify({ name, folderId }),
    });
    if (!list.id) throw new Error(`Impossible de créer la liste Brevo ${base.label}.`);
    const processId = await importEmailsToList(list.id, base.emails);
    created.push({ listId: list.id, processId, baseId: base.id });
  }

  return created;
}

export async function importEmailsToList(listId: number, emails: string[]): Promise<number> {
  const fileBody = ["EMAIL", ...emails].join("\n");
  const data = await brevoJson<{ processId: number }>("/contacts/import", {
    method: "POST",
    body: JSON.stringify({
      fileBody,
      listIds: [listId],
      updateExistingContacts: true,
      emptyContactsAttributes: false,
      emailBlacklist: false,
      disableNotification: true,
    }),
  });
  if (!data.processId) throw new Error("Brevo n'a pas renvoyé de process d'import.");
  return data.processId;
}

export async function getImportProcess(processId: number): Promise<BrevoProcess> {
  const data = await brevoJson<{
    id: number;
    status: BrevoProcessStatus;
    export_url?: string;
    exportUrl?: string;
    info?: { export_url?: string; exportUrl?: string };
  }>(`/processes/${processId}`);
  return {
    id: data.id,
    status: data.status,
    exportUrl:
      data.export_url ?? data.exportUrl ?? data.info?.export_url ?? data.info?.exportUrl,
  };
}

export async function createAndSendCampaign(options: {
  kind: CampaignKind;
  templateId: number;
  listIds: number[];
}): Promise<{ campaignId: number; name: string }> {
  const sender = brevoSender();
  if (!sender) {
    throw new Error("Ajoute BREVO_SENDER_EMAIL et BREVO_SENDER_NAME (expéditeur vérifié dans Brevo).");
  }
  if (options.listIds.length === 0) {
    throw new Error("Aucune liste Brevo à envoyer.");
  }

  const template = await getTemplate(options.templateId);
  const name = `${campaignKindLabel(options.kind)} ${campaignStamp()}`;
  const payload: Record<string, unknown> = {
    name,
    templateId: options.templateId,
    sender,
    recipients: { listIds: options.listIds },
    tag: APP_CAMPAIGN_TAG,
  };
  if (template.subject) payload.subject = template.subject;

  const created = await brevoJson<{ id: number }>("/emailCampaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!created.id) throw new Error("Impossible de créer la campagne Brevo.");

  await brevoEmpty(`/emailCampaigns/${created.id}/sendNow`, { method: "POST" });
  return { campaignId: created.id, name };
}

type BrevoCampaignStats = {
  listId?: number | null;
  sent?: number | null;
  delivered?: number | null;
  uniqueViews?: number | null;
  uniqueClicks?: number | null;
  clickers?: number | null;
  opensRate?: number | null;
  unsubscriptions?: number | null;
  hardBounces?: number | null;
  softBounces?: number | null;
};

type BrevoCampaignRow = {
  id: number;
  name?: string;
  subject?: string;
  status?: string;
  tag?: string;
  tags?: string[];
  sentDate?: string;
  createdAt?: string;
  recipients?: { lists?: number[] };
  statistics?: { globalStats?: BrevoCampaignStats; campaignStats?: BrevoCampaignStats[] };
};

function asCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function rate(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

function campaignKindFromName(name: string): CampaignKind | null {
  if (name.startsWith("Gazette ")) return "gazette";
  if (name.startsWith("Annonce de cours en ligne")) return "cours";
  if (name.startsWith("Session cours")) return "session";
  return null;
}

function isAppCampaign(campaign: BrevoCampaignRow): boolean {
  const tags = [campaign.tag, ...(campaign.tags ?? [])].filter(Boolean);
  if (tags.includes(APP_CAMPAIGN_TAG)) return true;
  const name = campaign.name?.trim() ?? "";
  return /^(Gazette|Annonce de cours en ligne|Session cours) \d{2}\/\d{2}\/\d{4} /.test(name);
}

export function toHistoryItem(campaign: BrevoCampaignRow): CampaignHistoryItem {
  const stats = campaign.statistics?.globalStats ?? {};
  const sent = asCount(stats.sent);
  const delivered = asCount(stats.delivered) || sent;
  const uniqueOpens = asCount(stats.uniqueViews);
  const uniqueClicks = asCount(stats.clickers) || asCount(stats.uniqueClicks);
  const name = campaign.name?.trim() || `Campagne ${campaign.id}`;
  const openRate =
    typeof stats.opensRate === "number" && Number.isFinite(stats.opensRate)
      ? Math.round(stats.opensRate * 10) / 10
      : rate(uniqueOpens, delivered);
  return {
    id: campaign.id,
    name,
    subject: campaign.subject?.trim() || "",
    kind: campaignKindFromName(name),
    status: campaign.status ?? "sent",
    sentAt: campaign.sentDate ?? campaign.createdAt ?? null,
    sent,
    delivered,
    uniqueOpens,
    uniqueClicks,
    unsubscriptions: asCount(stats.unsubscriptions),
    bounces: asCount(stats.hardBounces) + asCount(stats.softBounces),
    openRate,
    clickRate: rate(uniqueClicks, delivered),
    deliveryRate: rate(delivered, sent || delivered),
    bases: [],
  };
}

export async function listAppCampaigns(): Promise<CampaignHistoryItem[]> {
  const campaigns: CampaignHistoryItem[] = [];
  let offset = 0;
  const limit = 50;

  while (offset < 150) {
    const params = new URLSearchParams({
      type: "classic",
      statistics: "globalStats",
      excludeHtmlContent: "true",
      limit: String(limit),
      offset: String(offset),
      sort: "desc",
    });
    const data = await brevoJson<{ campaigns?: BrevoCampaignRow[]; count?: number }>(
      `/emailCampaigns?${params}`,
    );
    const page = data.campaigns ?? [];
    for (const campaign of page) {
      if (!isAppCampaign(campaign)) continue;
      campaigns.push(toHistoryItem(campaign));
    }
    offset += limit;
    if (page.length < limit || offset >= (data.count ?? offset)) break;
  }

  return campaigns.sort((a, b) => {
    const left = a.sentAt ?? "";
    const right = b.sentAt ?? "";
    if (left === right) return b.id - a.id;
    return left < right ? 1 : -1;
  });
}

export async function getEmailCampaign(
  campaignId: number,
  statistics: "globalStats" | "campaignStats" = "globalStats",
): Promise<BrevoCampaignRow> {
  const params = new URLSearchParams({
    statistics,
    excludeHtmlContent: "true",
  });
  return brevoJson<BrevoCampaignRow>(`/emailCampaigns/${campaignId}?${params}`);
}

export async function listContactListNames(): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  let offset = 0;
  const limit = 50;
  while (offset < 400) {
    const data = await brevoJson<{ lists?: { id: number; name?: string }[]; count?: number }>(
      `/contacts/lists?limit=${limit}&offset=${offset}`,
    );
    for (const list of data.lists ?? []) {
      names.set(list.id, list.name?.trim() ?? "");
    }
    offset += limit;
    if (!data.lists?.length || offset >= (data.count ?? offset)) break;
  }
  return names;
}

export async function listListEmails(listId: number): Promise<string[]> {
  const emails: string[] = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const data = await brevoJson<{
      contacts?: { email?: string }[];
      count?: number;
    }>(`/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`);
    const page = data.contacts ?? [];
    for (const contact of page) {
      const email = normalizeEmail(contact.email ?? "");
      if (isSendableEmail(email)) emails.push(email);
    }
    offset += limit;
    if (page.length < limit || offset >= (data.count ?? offset)) break;
  }
  return emails;
}

export function basesFromNamedLists(
  campaignStats: BrevoCampaignStats[] | undefined,
  listNames: Map<number, string>,
  campaignOpens: number,
): CampaignBaseStat[] {
  if (!campaignStats?.length) return [];
  const configured = getConfiguredBases();
  const rows: CampaignBaseStat[] = [];

  for (const stat of campaignStats) {
    const listId = stat.listId;
    if (!listId) continue;
    const name = listNames.get(listId) ?? "";
    const marker = name.split(" — ").at(-1)?.trim() ?? "";
    const base = configured.find(
      (item) =>
        item.label.toLowerCase() === marker.toLowerCase() ||
        item.id.toLowerCase() === marker.toLowerCase(),
    );
    if (!base) continue;
    const sent = asCount(stat.delivered) || asCount(stat.sent);
    const uniqueOpens = asCount(stat.uniqueViews);
    rows.push({
      id: base.id,
      label: base.label,
      color: base.color,
      sent,
      uniqueOpens,
      openRate: rate(uniqueOpens, sent),
      shareOfOpens: rate(uniqueOpens, campaignOpens),
    });
  }

  rows.sort((a, b) => b.uniqueOpens - a.uniqueOpens || b.sent - a.sent);
  return rows;
}

function parseEmailsFromCsv(csv: string): Set<string> {
  const emails = new Set<string>();
  const matches = csv.replace(/^\uFEFF/, "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  for (const raw of matches) {
    const email = normalizeEmail(raw);
    if (isSendableEmail(email)) emails.add(email);
  }
  return emails;
}

async function waitForExportFile(processId: number): Promise<Set<string>> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const process = await getImportProcess(processId);
    if (process.status === "failed" || process.status === "cancelled") {
      throw new Error("L'export des ouvertures Brevo a échoué.");
    }
    if (process.status === "completed") {
      if (!process.exportUrl) throw new Error("Export Brevo terminé sans fichier.");
      const response = await fetch(process.exportUrl);
      if (!response.ok) throw new Error("Impossible de télécharger l'export des ouvertures.");
      const emails = parseEmailsFromCsv(await response.text());
      if (emails.size === 0) throw new Error("Export des ouvertures vide ou illisible.");
      return emails;
    }
  }
  throw new Error("L'export des ouvertures Brevo prend trop de temps.");
}

export async function exportCampaignOpeners(campaignId: number): Promise<Set<string>> {
  const jobs: { path: string; body: Record<string, unknown> }[] = [
    {
      path: `/emailCampaigns/${campaignId}/exportRecipients`,
      body: { recipientsType: "openers" },
    },
    {
      path: "/contacts/export",
      body: {
        disableNotification: true,
        exportMandatoryAttributes: true,
        customContactFilter: {
          actionForEmailCampaigns: "openers",
          emailCampaignId: campaignId,
        },
      },
    },
  ];

  let lastError = "Impossible d'exporter les ouvertures Brevo.";
  for (const job of jobs) {
    try {
      const started = await brevoJson<{ processId: number }>(job.path, {
        method: "POST",
        body: JSON.stringify(job.body),
      });
      if (!started.processId) continue;
      return await waitForExportFile(started.processId);
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

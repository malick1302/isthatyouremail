import {
  coursOptOutFieldOf,
  dateFieldOf,
  gazetteOptOutFieldOf,
  getConfiguredBases,
} from "@/lib/bases";
import type { CampaignKind, CampaignRecipients } from "@/lib/campaigns";
import { isSendableEmail, normalizeEmail } from "@/lib/email";
import type { BaseConfig, BaseMatch } from "@/lib/types";

type RecordedMatch = BaseMatch & { email: string };

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; matches: BaseMatch[] }>();

function escapeFormula(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formulaForEmails(emailField: string, emails: string[]): string {
  const clauses = emails.map(
    (email) => `LOWER({${emailField}})="${escapeFormula(email)}"`,
  );
  if (clauses.length === 1) return clauses[0];
  return `OR(${clauses.join(",")})`;
}

function fieldToEmail(value: unknown): string {
  if (Array.isArray(value)) return normalizeEmail(String(value[0] ?? ""));
  return normalizeEmail(String(value ?? ""));
}

async function searchBase(base: BaseConfig, emails: string[]): Promise<RecordedMatch[]> {
  if (!process.env.AIRTABLE_PAT || emails.length === 0) return [];

  const params = new URLSearchParams({
    filterByFormula: formulaForEmails(base.emailField, emails),
    pageSize: "100",
  });
  params.append("fields[]", base.emailField);

  const url = `https://api.airtable.com/v0/${base.baseId}/${encodeURIComponent(base.table)}?${params}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
  });

  if (!response.ok) {
    console.error(
      `Airtable ${base.id} ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
    return [];
  }

  const data = (await response.json()) as {
    records?: { id: string; fields: Record<string, unknown> }[];
  };

  const matches: RecordedMatch[] = [];
  for (const record of data.records ?? []) {
    const email = fieldToEmail(record.fields[base.emailField]);
    if (!email) continue;
    matches.push({
      id: base.id,
      label: base.label,
      color: base.color,
      gmailAlias: base.gmailAlias,
      recordId: record.id,
      baseId: base.baseId,
      email,
    });
  }
  return matches;
}

function cached(email: string): BaseMatch[] | null {
  const hit = cache.get(email);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(email);
    return null;
  }
  return hit.matches;
}

export function airtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_PAT) && getConfiguredBases().length > 0;
}

export async function findEmailInBase(
  baseId: string,
  email: string,
): Promise<BaseMatch | null> {
  const base = getConfiguredBases().find((item) => item.id === baseId);
  if (!base) return null;
  const matches = await searchBase(base, [normalizeEmail(email)]);
  return matches[0] ?? null;
}

export async function matchEmails(emails: string[]): Promise<Map<string, BaseMatch[]>> {
  const unique = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  const result = new Map<string, BaseMatch[]>();
  const missing: string[] = [];

  for (const email of unique) {
    const hit = cached(email);
    if (hit) result.set(email, hit);
    else missing.push(email);
  }

  if (missing.length === 0) return result;

  const bases = getConfiguredBases();
  if (!process.env.AIRTABLE_PAT || bases.length === 0) {
    for (const email of missing) {
      result.set(email, []);
      cache.set(email, { at: Date.now(), matches: [] });
    }
    return result;
  }

  const perBase = await Promise.all(bases.map((base) => searchBase(base, missing)));
  const collected = new Map<string, BaseMatch[]>();
  for (const email of missing) collected.set(email, []);

  for (const records of perBase) {
    for (const record of records) {
      const list = collected.get(record.email) ?? [];
      if (!list.some((item) => item.id === record.id)) {
        list.push({
          id: record.id,
          label: record.label,
          color: record.color,
          gmailAlias: record.gmailAlias,
          recordId: record.recordId,
          baseId: record.baseId,
        });
        collected.set(record.email, list);
      }
    }
  }

  const now = Date.now();
  for (const email of missing) {
    const matches = collected.get(email) ?? [];
    cache.set(email, { at: now, matches });
    result.set(email, matches);
  }

  return result;
}

export type BaseRecordCount = {
  id: string;
  label: string;
  color: string;
  count: number;
};

export async function countRecordsPerBase(): Promise<BaseRecordCount[]> {
  const bases = getConfiguredBases();
  if (!process.env.AIRTABLE_PAT || bases.length === 0) return [];

  return Promise.all(
    bases.map(async (base) => {
      let count = 0;
      let offset: string | undefined;
      try {
        do {
          const params = new URLSearchParams({ pageSize: "100" });
          params.append("fields[]", base.emailField);
          if (offset) params.set("offset", offset);
          const url = `https://api.airtable.com/v0/${base.baseId}/${encodeURIComponent(base.table)}?${params}`;
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
          });
          if (!response.ok) {
            await response.text();
            break;
          }
          const data = (await response.json()) as {
            records?: unknown[];
            offset?: string;
          };
          count += data.records?.length ?? 0;
          offset = data.offset;
        } while (offset);
      } catch {
        count = 0;
      }
      return { id: base.id, label: base.label, color: base.color, count };
    }),
  );
}

export type InscriptionDate = {
  baseId: string;
  color: string;
  day: string;
};

export type OptOutRecord = {
  baseId: string;
  color: string;
  recordId: string;
  email: string;
  gazette: boolean;
  cours: boolean;
  hasGazetteField: boolean;
  hasCoursField: boolean;
};

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
};

function airtableHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` };
}

function asChecked(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

const unknownFields = new Set<string>();

function unknownFieldKey(baseId: string, field: string): string {
  return `${baseId}:${field}`;
}

function isUnknownField(baseId: string, field: string): boolean {
  return unknownFields.has(unknownFieldKey(baseId, field));
}

function rememberUnknownField(baseId: string, field: string): void {
  unknownFields.add(unknownFieldKey(baseId, field));
}

function parseUnknownFieldName(body: string): string | null {
  const match = body.match(/Unknown field name: \\?"([^"]+)\\?"/);
  return match?.[1] ?? null;
}

function usableFields(baseId: string, fields: Array<string | undefined>): string[] {
  return fields.filter((field): field is string => {
    if (!field) return false;
    return !isUnknownField(baseId, field);
  });
}

function fieldToDay(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(parsed);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

async function listTablePages(
  base: BaseConfig,
  params: URLSearchParams,
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const page = new URLSearchParams(params);
    page.set("pageSize", "100");
    if (offset) page.set("offset", offset);
    const url = `https://api.airtable.com/v0/${base.baseId}/${encodeURIComponent(base.table)}?${page}`;
    const response = await fetch(url, { headers: airtableHeaders() });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Airtable ${base.id} ${response.status}: ${body.slice(0, 200)}`);
    }
    const data = (await response.json()) as { records?: AirtableRecord[]; offset?: string };
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);
  return records;
}

export async function listInscriptionsSince(sinceDay: string): Promise<InscriptionDate[]> {
  const bases = getConfiguredBases();
  if (!process.env.AIRTABLE_PAT || bases.length === 0) return [];

  const results = await Promise.all(
    bases.map(async (base) => {
      const dateField = dateFieldOf(base);
      const params = new URLSearchParams({
        filterByFormula: `OR(IS_AFTER({${dateField}},'${sinceDay}'),IS_SAME({${dateField}},'${sinceDay}','day'))`,
      });
      params.append("fields[]", dateField);
      try {
        const records = await listTablePages(base, params);
        return records.flatMap((record) => {
          const day = fieldToDay(record.fields[dateField]);
          return day ? [{ baseId: base.id, color: base.color, day }] : [];
        });
      } catch (error) {
        console.error(error);
        return [];
      }
    }),
  );

  return results.flat();
}

async function listOptOutRecords(
  base: BaseConfig,
  emails: string[],
  extraFields: string[],
): Promise<{ records: AirtableRecord[]; fields: string[] }> {
  const fields = usableFields(base.id, extraFields);

  for (let attempt = 0; attempt < extraFields.length + 1; attempt += 1) {
    const params = new URLSearchParams({
      filterByFormula: formulaForEmails(base.emailField, emails),
    });
    params.append("fields[]", base.emailField);
    for (const field of fields) params.append("fields[]", field);

    try {
      return { records: await listTablePages(base, params), fields: [...fields] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const unknown = parseUnknownFieldName(message);
      if (unknown && fields.includes(unknown)) {
        rememberUnknownField(base.id, unknown);
        fields.splice(fields.indexOf(unknown), 1);
        continue;
      }
      if (fields.length > 0) {
        fields.length = 0;
        continue;
      }
      throw error;
    }
  }

  return { records: [], fields: [] };
}

export async function lookupOptOutByEmails(emails: string[]): Promise<Map<string, OptOutRecord[]>> {
  const unique = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  const result = new Map<string, OptOutRecord[]>();
  for (const email of unique) result.set(email, []);

  const bases = getConfiguredBases();
  if (!process.env.AIRTABLE_PAT || bases.length === 0 || unique.length === 0) return result;

  await Promise.all(
    bases.map(async (base) => {
      const gazetteField = gazetteOptOutFieldOf(base);
      const coursField = coursOptOutFieldOf(base);

      let records: AirtableRecord[] = [];
      let present = new Set<string>();
      try {
        const listed = await listOptOutRecords(base, unique, [gazetteField, coursField]);
        records = listed.records;
        present = new Set(listed.fields);
      } catch {
        return;
      }

      for (const record of records) {
        const email = fieldToEmail(record.fields[base.emailField]);
        if (!email) continue;
        const list = result.get(email) ?? [];
        list.push({
          baseId: base.id,
          color: base.color,
          recordId: record.id,
          email,
          gazette: present.has(gazetteField) && asChecked(record.fields[gazetteField]),
          cours: present.has(coursField) && asChecked(record.fields[coursField]),
          hasGazetteField: present.has(gazetteField),
          hasCoursField: present.has(coursField),
        });
        result.set(email, list);
      }
    }),
  );

  return result;
}

export async function patchOptOut(
  record: OptOutRecord,
  updates: { gazette?: boolean; cours?: boolean },
): Promise<boolean> {
  const base = getConfiguredBases().find((item) => item.id === record.baseId);
  if (!base || !process.env.AIRTABLE_PAT) return false;

  const gazetteField = gazetteOptOutFieldOf(base);
  const coursField = coursOptOutFieldOf(base);
  const fields: Record<string, boolean> = {};
  if (updates.gazette && !isUnknownField(base.id, gazetteField)) fields[gazetteField] = true;
  if (updates.cours && !isUnknownField(base.id, coursField)) fields[coursField] = true;
  if (Object.keys(fields).length === 0) return false;

  const url = `https://api.airtable.com/v0/${base.baseId}/${encodeURIComponent(base.table)}`;

  while (Object.keys(fields).length > 0) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        ...airtableHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{ id: record.recordId, fields }],
      }),
    });

    if (response.ok) {
      if (updates.gazette && gazetteField in fields) record.gazette = true;
      if (updates.cours && coursField in fields) record.cours = true;
      return true;
    }

    const body = await response.text();
    const unknown = parseUnknownFieldName(body);
    if (response.status === 422 && body.includes("UNKNOWN_FIELD_NAME")) {
      if (unknown && unknown in fields) {
        rememberUnknownField(base.id, unknown);
        delete fields[unknown];
        continue;
      }
      for (const name of Object.keys(fields)) rememberUnknownField(base.id, name);
      return false;
    }

    throw Object.assign(new Error(`Airtable PATCH ${base.id} ${response.status}`), {
      status: response.status,
      baseId: base.id,
    });
  }

  return false;
}

export async function listCampaignRecipients(
  baseId: string,
  kind: CampaignKind,
): Promise<CampaignRecipients> {
  const base = getConfiguredBases().find((item) => item.id === baseId);
  if (!base) {
    throw new Error(`Base inconnue : ${baseId}`);
  }
  if (!process.env.AIRTABLE_PAT) {
    throw new Error("Ajoute AIRTABLE_PAT dans .env.local.");
  }

  const optOutField = kind === "gazette" ? gazetteOptOutFieldOf(base) : coursOptOutFieldOf(base);
  const extra = usableFields(base.id, [optOutField]);
  let records: AirtableRecord[] = [];
  let present = new Set<string>();

  for (let attempt = 0; attempt < extra.length + 2; attempt += 1) {
    const params = new URLSearchParams();
    params.append("fields[]", base.emailField);
    for (const field of extra) params.append("fields[]", field);
    try {
      records = await listTablePages(base, params);
      present = new Set(extra);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const unknown = parseUnknownFieldName(message);
      if (unknown && extra.includes(unknown)) {
        rememberUnknownField(base.id, unknown);
        extra.splice(extra.indexOf(unknown), 1);
        continue;
      }
      throw error;
    }
  }

  const emails: string[] = [];
  const seen = new Set<string>();
  let optedOut = 0;
  let invalid = 0;
  let scanned = 0;

  for (const record of records) {
    const email = fieldToEmail(record.fields[base.emailField]);
    if (!email) continue;
    scanned += 1;
    if (!isSendableEmail(email)) {
      invalid += 1;
      continue;
    }
    if (present.has(optOutField) && asChecked(record.fields[optOutField])) {
      optedOut += 1;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return {
    baseId: base.id,
    label: base.label,
    color: base.color,
    emails,
    optedOut,
    invalid,
    scanned,
  };
}

const recipientCache = new Map<string, { at: number; rows: CampaignRecipients[] }>();

export async function listCampaignEmailsByBase(kind: CampaignKind): Promise<CampaignRecipients[]> {
  const cached = recipientCache.get(kind);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rows;

  const bases = getConfiguredBases();
  const rows: CampaignRecipients[] = [];
  for (const base of bases) {
    rows.push(await listCampaignRecipients(base.id, kind));
  }
  recipientCache.set(kind, { at: Date.now(), rows });
  return rows;
}

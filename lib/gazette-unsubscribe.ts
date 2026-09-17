import { lookupOptOutByEmails, patchOptOut, type OptOutRecord } from "@/lib/airtable";
import { normalizeEmail } from "@/lib/email";
import {
  findFilloutFormId,
  isFilloutConfigured,
  listFormSubmissions,
  type FilloutSubmission,
} from "@/lib/fillout";

export type UnsubscribeKind = "gazette" | "cours" | "both";

export type UnsubscribeStatus = "synced" | "not_found" | "failed";

export type UnsubscribeHistoryItem = {
  submissionId: string;
  submittedAt: string;
  email: string;
  kind: UnsubscribeKind;
  reason: string | null;
  matches: { id: string; color: string }[];
  status: UnsubscribeStatus;
};

export type UnsubscribeSyncResult = {
  applied: number;
  failed: number;
  checked: number;
  writeDenied: boolean;
  failedEmails: string[];
};

const HISTORY_LIMIT = 80;

const FILLOUT_OPTION_IDS: Record<string, UnsubscribeKind> = {
  "9yua": "gazette",
  "8yvc": "cours",
  dgaz: "both",
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u00a0\u202f]/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function collectTexts(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTexts(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return collectTexts(record.value ?? record.label ?? record.text ?? record.id);
  }
  return [];
}

function asText(value: unknown): string | null {
  return collectTexts(value)[0] ?? null;
}

function questionTexts(
  submission: FilloutSubmission,
  match: (name: string, type: string) => boolean,
): string[] {
  const texts: string[] = [];
  for (const question of submission.questions ?? []) {
    if (!match(question.name ?? "", question.type ?? "")) continue;
    texts.push(...collectTexts(question.value));
  }
  return texts;
}

function extractEmail(submission: FilloutSubmission): string | null {
  const fromType = questionTexts(submission, (_name, type) => type.toLowerCase().includes("email"));
  if (fromType[0]) return normalizeEmail(fromType[0]);

  const fromName = questionTexts(submission, (name) => {
    const normalized = normalize(name);
    return normalized.includes("mail") || normalized.includes("adresse");
  });
  return fromName[0] ? normalizeEmail(fromName[0]) : null;
}

function parseKind(value: string): UnsubscribeKind | null {
  const normalized = normalize(value);
  if (!normalized) return null;

  const mapped = FILLOUT_OPTION_IDS[normalized];
  if (mapped) return mapped;

  if (
    normalized === "2" ||
    normalized === "les 2" ||
    normalized.includes("les 2") ||
    normalized.includes("les deux") ||
    normalized.includes("tous les deux") ||
    normalized === "both"
  ) {
    return "both";
  }

  const gazette = normalized.includes("gazette");
  const cours = normalized.includes("cours") || normalized.includes("annonce");
  if (gazette && cours) return "both";
  if (gazette) return "gazette";
  if (cours) return "cours";
  return null;
}

function mergeKinds(kinds: UnsubscribeKind[]): UnsubscribeKind | null {
  if (kinds.includes("both") || (kinds.includes("gazette") && kinds.includes("cours"))) {
    return "both";
  }
  if (kinds.includes("gazette")) return "gazette";
  if (kinds.includes("cours")) return "cours";
  return null;
}

function extractKind(submission: FilloutSubmission): UnsubscribeKind | null {
  const dropdown = questionTexts(submission, (name, type) => {
    const normalized = normalize(name);
    const kind = type.toLowerCase();
    return (
      kind.includes("dropdown") ||
      kind.includes("select") ||
      normalized.includes("souhaite") ||
      normalized.includes("recevoir") ||
      normalized.includes("desabon")
    );
  })
    .map(parseKind)
    .filter((item): item is UnsubscribeKind => item !== null);
  const fromDropdown = mergeKinds(dropdown);
  if (fromDropdown) return fromDropdown;

  const fromAll = (submission.questions ?? [])
    .flatMap((question) => collectTexts(question.value))
    .map(parseKind)
    .filter((item): item is UnsubscribeKind => item !== null);
  return mergeKinds(fromAll);
}

function extractReason(submission: FilloutSubmission): string | null {
  const named = questionTexts(submission, (name) => {
    const normalized = normalize(name);
    return (
      normalized.includes("dire plus") ||
      normalized.includes("pourquoi") ||
      normalized.includes("raison") ||
      normalized.includes("motif")
    );
  });
  if (named[0]) return named[0];

  for (const question of submission.questions ?? []) {
    const type = (question.type ?? "").toLowerCase();
    const text = asText(question.value);
    if (!text || parseKind(text) || text.includes("@")) continue;
    if (type.includes("choice") || type.includes("dropdown") || type.includes("radio")) {
      return text;
    }
  }
  return null;
}

function wantsGazette(kind: UnsubscribeKind): boolean {
  return kind === "gazette" || kind === "both";
}

function wantsCours(kind: UnsubscribeKind): boolean {
  return kind === "cours" || kind === "both";
}

function recordStatus(records: OptOutRecord[]): UnsubscribeStatus {
  return records.length === 0 ? "not_found" : "synced";
}

function uniqueMatches(records: OptOutRecord[]): { id: string; color: string }[] {
  const seen = new Set<string>();
  const matches: { id: string; color: string }[] = [];
  for (const record of records) {
    if (seen.has(record.baseId)) continue;
    seen.add(record.baseId);
    matches.push({ id: record.baseId, color: record.color });
  }
  return matches;
}

export async function applyUnsubscribes(options?: { apply?: boolean }): Promise<{
  history: UnsubscribeHistoryItem[];
  sync: UnsubscribeSyncResult;
}> {
  const hint = process.env.FILLOUT_UNSUBSCRIBE_FORM_ID ?? "skgM2mEtPVus";
  const empty = {
    history: [] as UnsubscribeHistoryItem[],
    sync: { applied: 0, failed: 0, checked: 0, writeDenied: false, failedEmails: [] },
  };

  if (!isFilloutConfigured()) {
    return empty;
  }

  const formId = await findFilloutFormId(hint);
  const { submissions } = await listFormSubmissions(formId, { fresh: options?.apply ?? false });
  const parsed = submissions
    .map((submission) => {
      const email = extractEmail(submission);
      const kind = extractKind(submission);
      if (!email || !kind) return null;
      return {
        submissionId: submission.submissionId,
        submittedAt: submission.submissionTime,
        email,
        kind,
        reason: extractReason(submission),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

  const emails = [...new Set(parsed.map((item) => item.email))];
  const recordsByEmail = await lookupOptOutByEmails(emails);

  let applied = 0;
  let failed = 0;
  let writeDenied = false;
  const failedEmailSet = new Set<string>();

  if (options?.apply !== false) {
    const blocked = new Set<string>();
    const jobs: { record: OptOutRecord; gazette: boolean; cours: boolean }[] = [];
    for (const item of parsed) {
      const records = recordsByEmail.get(item.email) ?? [];
      for (const record of records) {
        const gazette = wantsGazette(item.kind) && !record.gazette && record.hasGazetteField;
        const cours = wantsCours(item.kind) && !record.cours && record.hasCoursField;
        if (!gazette && !cours) continue;
        jobs.push({ record, gazette, cours });
      }
    }

    let index = 0;
    async function worker() {
      while (index < jobs.length) {
        const current = index;
        index += 1;
        const job = jobs[current];
        if (blocked.has(job.record.baseId)) {
          failed += 1;
          failedEmailSet.add(job.record.email);
          continue;
        }
        try {
          const ok = await patchOptOut(job.record, { gazette: job.gazette, cours: job.cours });
          if (ok) applied += 1;
          else {
            failed += 1;
            failedEmailSet.add(job.record.email);
          }
        } catch (error) {
          failed += 1;
          failedEmailSet.add(job.record.email);
          const status =
            typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
          if (status === 403) writeDenied = true;
          if (status === 403 || status === 404 || status === 422) {
            blocked.add(job.record.baseId);
          }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, () => worker()));

    if (applied > 0) {
      const refreshed = await lookupOptOutByEmails(emails);
      for (const [email, records] of refreshed) {
        recordsByEmail.set(email, records);
      }
    }
  }

  const history: UnsubscribeHistoryItem[] = parsed.slice(0, HISTORY_LIMIT).map((item) => {
    const records = recordsByEmail.get(item.email) ?? [];
    const status = failedEmailSet.has(item.email)
      ? "failed"
      : recordStatus(records);
    return {
      ...item,
      matches: uniqueMatches(records),
      status,
    };
  });

  const failedEmails = [
    ...new Set([
      ...failedEmailSet,
      ...history.filter((item) => item.status === "not_found").map((item) => item.email),
    ]),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  return {
    history,
    sync: { applied, failed, checked: parsed.length, writeDenied, failedEmails },
  };
}

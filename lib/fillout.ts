export type FormKind = "module" | "crossword";

export type CommentItem = {
  submissionId: string;
  submittedAt: string;
  text: string;
};

export type FormStats = {
  formId: string;
  name: string;
  displayName: string;
  kind: FormKind;
  completions: number;
  avgModuleNote: number | null;
  avgQuizNote: number | null;
  successRate: number | null;
  commentCount: number;
  comments: CommentItem[];
  lastSubmittedAt: string | null;
};

export type FilloutTotals = {
  formCount: number;
  completions: number;
  avgModuleNote: number | null;
  avgQuizNote: number | null;
  successRate: number | null;
  commentCount: number;
};

export type FilloutDashboard = {
  configured: boolean;
  error?: string;
  kind: FormKind;
  forms: FormStats[];
  totals: FilloutTotals;
};

export type FilloutFormSummary = {
  name: string;
  formId: string;
};

type FormSummary = FilloutFormSummary;

type QuestionResponse = {
  id: string;
  name: string;
  type: string;
  value: unknown;
};

type NamedValue = {
  id: string;
  name: string;
  type?: string;
  value: unknown;
};

type QuizResponse = {
  score: number;
  maxScore: number;
};

type Submission = {
  submissionId: string;
  submissionTime: string;
  questions: QuestionResponse[];
  calculations?: NamedValue[];
  quiz?: QuizResponse;
};

type SubmissionsResponse = {
  responses: Submission[];
  totalResponses: number;
  pageCount: number;
};

const FETCH_REVALIDATE = 600;
const PAGE_SIZE = 150;
const CONCURRENCY = 1;
const MIN_INTERVAL_MS = 300;
const MAX_RETRIES = 4;

type MemoryCacheEntry = { expiresAt: number; value: unknown };
const memoryCache = new Map<string, MemoryCacheEntry>();

let nextAllowedAt = 0;
let rateLimitChain: Promise<void> = Promise.resolve();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scheduleFilloutSlot(): Promise<void> {
  const run = rateLimitChain.then(async () => {
    const delay = Math.max(0, nextAllowedAt - Date.now());
    if (delay > 0) await wait(delay);
    nextAllowedAt = Date.now() + MIN_INTERVAL_MS;
  });
  rateLimitChain = run.catch(() => undefined);
  return run;
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 8000);
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

function cleanEnvValue(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

function normalizeFilloutBaseUrl(value: string): string {
  const fallback = "https://api.fillout.com/v1/api";
  let cleaned = cleanEnvValue(value).replace(/\s+/g, "").replace(/\/+$/, "");
  if (!cleaned || !/^https?:\/\//i.test(cleaned)) return fallback;
  cleaned = cleaned.replace(/\/forms$/i, "");

  if (/^https:\/\/(eu-)?api\.fillout\.com$/i.test(cleaned)) {
    return `${cleaned}/v1/api`;
  }
  if (/^https:\/\/(eu-)?api\.fillout\.com\/v1$/i.test(cleaned)) {
    return `${cleaned}/api`;
  }
  return cleaned;
}

function normalizeFilloutApiKey(value: string | undefined): string {
  const raw = cleanEnvValue(value)
    .replace(/^\uFEFF/, "")
    .replace(/^[\u201C\u201D\u2018\u2019"']+|[\u201C\u201D\u2018\u2019"']+$/g, "")
    .replace(/^Bearer/i, "")
    .replace(/^FILLOUT_API_KEY=/i, "")
    .replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "");
  const match = raw.match(/sk_(?:prod|test)_[A-Za-z0-9_]+/);
  return match ? match[0] : raw;
}

function getFilloutConfig() {
  const apiKey = normalizeFilloutApiKey(process.env["FILLOUT_API_KEY"]);
  const baseUrl = normalizeFilloutBaseUrl(process.env["FILLOUT_API_URL"] ?? "");
  return { apiKey, baseUrl };
}

export function describeFilloutConfig(): {
  configured: boolean;
  length: number;
  prefix: string;
  baseUrl: string;
} {
  const { apiKey, baseUrl } = getFilloutConfig();
  return {
    configured: Boolean(apiKey),
    length: apiKey.length,
    prefix: apiKey.slice(0, 8),
    baseUrl,
  };
}

export function isFilloutConfigured(): boolean {
  return Boolean(getFilloutConfig().apiKey);
}

function emptyTotals(): FilloutTotals {
  return {
    formCount: 0,
    completions: 0,
    avgModuleNote: null,
    avgQuizNote: null,
    successRate: null,
    commentCount: 0,
  };
}

function emptyDashboard(kind: FormKind, error?: string, configured = false): FilloutDashboard {
  return { configured, error, kind, forms: [], totals: emptyTotals() };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function classifyFormName(name: string): FormKind | null {
  const trimmed = name.trim();
  if (/^\[module\]/i.test(trimmed)) return "module";
  const normalized = normalize(trimmed);
  if (normalized.includes("mots croisees") || normalized.includes("mots croises")) {
    return "crossword";
  }
  return null;
}

export function displayFormName(name: string, kind: FormKind): string {
  if (kind === "module") {
    return name.replace(/^\[module\]\s*[-–:]?\s*/i, "").trim() || name;
  }
  return (
    name
      .replace(/^mots\s+crois[eé]e?s\s*[-–:]?\s*/i, "")
      .trim() || name
  );
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").replace(",", ".").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

function isQuizName(name: string): boolean {
  const normalized = normalize(name);
  return normalized.includes("quizz") || normalized.includes("quiz");
}

function isNoteName(name: string): boolean {
  if (isQuizName(name)) return false;
  const normalized = normalize(name);
  return (
    normalized.includes("note") ||
    normalized.includes("score") ||
    normalized.includes("rating") ||
    normalized.includes("reussite")
  );
}

function isCrosswordNoteName(name: string): boolean {
  const normalized = normalize(name);
  return (
    normalized.includes("nouveau format") ||
    normalized.includes("format d'apprentissage") ||
    normalized.includes("vous a plu")
  );
}

function isCommentName(name: string): boolean {
  const normalized = normalize(name);
  return [
    "commentaire",
    "comment",
    "avis",
    "feedback",
    "remarque",
    "un retour",
    "idee de module",
  ].some((keyword) => normalized.includes(keyword));
}

function firstNamedNumber(items: NamedValue[] | undefined, match: (name: string) => boolean): number | null {
  if (!items) return null;
  for (const item of items) {
    if (!match(item.name)) continue;
    const value = asNumber(item.value);
    if (value !== null) return value;
  }
  return null;
}

function extractQuiz(submission: Submission): { score: number; maxScore: number | null } | null {
  if (
    submission.quiz &&
    Number.isFinite(submission.quiz.score) &&
    Number.isFinite(submission.quiz.maxScore) &&
    submission.quiz.maxScore > 0
  ) {
    return { score: submission.quiz.score, maxScore: submission.quiz.maxScore };
  }

  const fromCalc = firstNamedNumber(submission.calculations, isQuizName);
  if (fromCalc !== null) return { score: fromCalc, maxScore: fromCalc > 20 ? 100 : null };

  const fromQuestion = firstNamedNumber(submission.questions, isQuizName);
  if (fromQuestion !== null) return { score: fromQuestion, maxScore: fromQuestion > 20 ? 100 : null };

  return null;
}

function extractNote(submission: Submission, kind: FormKind): number | null {
  const match = kind === "crossword" ? isCrosswordNoteName : isNoteName;
  const fromCalc = firstNamedNumber(submission.calculations, match);
  if (fromCalc !== null) return fromCalc;

  const fromQuestion = firstNamedNumber(submission.questions, match);
  if (fromQuestion !== null) return fromQuestion;

  if (kind === "crossword") {
    for (const question of submission.questions ?? []) {
      if (question.type !== "StarRating") continue;
      const value = asNumber(question.value);
      if (value !== null) return value;
    }
  }

  return null;
}

function extractComments(submission: Submission): string[] {
  const comments: string[] = [];
  for (const question of submission.questions ?? []) {
    if (!isCommentName(question.name)) continue;
    const text = asText(question.value);
    if (text) comments.push(text);
  }
  return comments;
}

function quizSuccessPercent(quiz: { score: number; maxScore: number | null }): number | null {
  if (quiz.maxScore && quiz.maxScore > 0) {
    return (quiz.score / quiz.maxScore) * 100;
  }
  if (quiz.score >= 0 && quiz.score <= 100) return quiz.score;
  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function filloutFetch<T>(path: string, fresh = false): Promise<T> {
  const { apiKey, baseUrl } = getFilloutConfig();
  if (!apiKey) {
    throw new Error("Fillout non configuré.");
  }

  if (!fresh) {
    const cached = memoryCache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
  }

  let lastError = "Fillout API: erreur inconnue.";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await scheduleFilloutSlot();

    const requestUrl = `${baseUrl}${path}`;
    const response = await fetch(requestUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (response.status === 429) {
      const body = await response.text();
      lastError = `Fillout API (429): ${body.slice(0, 200)}`;
      if (attempt < MAX_RETRIES) {
        await wait(retryDelayMs(response, attempt));
        continue;
      }
      throw new Error(lastError);
    }

    if (!response.ok) {
      const body = await response.text();
      const badKey = /api key invalid|incorrectly formatted api key/i.test(body);
      if (badKey) {
        const info = describeFilloutConfig();
        lastError = `Fillout refuse la clé API (${info.length} caractères, préfixe « ${info.prefix || "vide"} »). Dans Netlify, FILLOUT_API_KEY doit commencer par sk_prod_ uniquement, sans FIL, sans nom de variable, sans URL.`;
      } else if (response.status === 404) {
        lastError = `Fillout API (404) sur ${requestUrl}. L'URL du dashboard (https://api.fillout.com) doit devenir https://api.fillout.com/v1/api.`;
      } else {
        lastError = `Fillout API (${response.status}): ${body.slice(0, 200)}`;
      }
      throw new Error(lastError);
    }

    const data = (await response.json()) as T;
    memoryCache.set(path, { expiresAt: Date.now() + FETCH_REVALIDATE * 1000, value: data });
    return data;
  }

  throw new Error(lastError);
}

function asFormSummary(raw: unknown): FilloutFormSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const formId = String(record.formId ?? record.id ?? "").trim();
  const name = String(record.name ?? record.title ?? "").trim();
  if (!formId || !name) return null;
  return { formId, name };
}

function formsFromPayload(data: unknown): FilloutFormSummary[] {
  const rawList = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as { forms?: unknown; items?: unknown; data?: unknown }).forms ??
        (data as { items?: unknown }).items ??
        (data as { data?: unknown }).data)
      : [];
  if (!Array.isArray(rawList)) return [];
  return rawList.flatMap((item) => {
    const form = asFormSummary(item);
    return form ? [form] : [];
  });
}

export async function listForms(fresh = false): Promise<FilloutFormSummary[]> {
  const data = await filloutFetch<unknown>("/forms", fresh);
  return formsFromPayload(data);
}

export async function findFilloutFormId(hint: string): Promise<string> {
  const target = normalize(hint);
  try {
    const forms = await listForms();
    const exact = forms.find((form) => normalize(form.formId) === target);
    if (exact) return exact.formId;

    const byName = forms.find((form) => normalize(form.name).includes(target) && target.length > 3);
    if (byName) return byName.formId;

    const unsubscribe = forms.find((form) => {
      const name = normalize(form.name);
      return name.includes("desabonnement") && (name.includes("mail") || name.includes("gazette") || name.includes("acad"));
    });
    if (unsubscribe) return unsubscribe.formId;
  } catch {
    // fallback to the configured identifier
  }
  return hint;
}

export async function listAllSubmissions(
  formId: string,
  fresh = false,
): Promise<{ submissions: Submission[]; total: number }> {
  const submissions: Submission[] = [];
  let offset = 0;

  // Fillout can return pageCount/totalResponses capped to the first page — keep
  // fetching while we receive a full page of results.
  while (true) {
    const page = await filloutFetch<SubmissionsResponse>(
      `/forms/${encodeURIComponent(formId)}/submissions?limit=${PAGE_SIZE}&offset=${offset}&status=finished`,
      fresh,
    );
    const batch = page.responses ?? [];
    submissions.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { submissions, total: submissions.length };
}

export async function listSubmissionOverview(
  formId: string,
  fresh = false,
): Promise<{ total: number; lastSubmittedAt: string | null }> {
  let total = 0;
  let lastSubmittedAt: string | null = null;
  let offset = 0;

  while (true) {
    const page = await filloutFetch<SubmissionsResponse>(
      `/forms/${encodeURIComponent(formId)}/submissions?limit=${PAGE_SIZE}&offset=${offset}&status=finished`,
      fresh,
    );
    const batch = page.responses ?? [];
    total += batch.length;
    for (const submission of batch) {
      if (
        submission.submissionTime &&
        (!lastSubmittedAt || submission.submissionTime > lastSubmittedAt)
      ) {
        lastSubmittedAt = submission.submissionTime;
      }
    }
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { total, lastSubmittedAt };
}

export type FilloutSubmission = Submission;

export async function listFormSubmissions(
  formId: string,
  options?: { fresh?: boolean },
): Promise<{ submissions: FilloutSubmission[]; total: number }> {
  return listAllSubmissions(formId, options?.fresh ?? false);
}

function statsFromSubmissions(
  form: FormSummary,
  kind: FormKind,
  submissions: Submission[],
  total: number,
): FormStats {
  const notes: number[] = [];
  const quizNotes: number[] = [];
  const successRates: number[] = [];
  const comments: CommentItem[] = [];
  let lastSubmittedAt: string | null = null;

  for (const submission of submissions) {
    if (
      submission.submissionTime &&
      (!lastSubmittedAt || submission.submissionTime > lastSubmittedAt)
    ) {
      lastSubmittedAt = submission.submissionTime;
    }

    const note = extractNote(submission, kind);
    if (note !== null) notes.push(note);

    if (kind === "module") {
      const quiz = extractQuiz(submission);
      if (quiz) {
        quizNotes.push(quiz.score);
        const success = quizSuccessPercent(quiz);
        if (success !== null) successRates.push(success);
      }

      for (const text of extractComments(submission)) {
        comments.push({
          submissionId: submission.submissionId,
          submittedAt: submission.submissionTime,
          text,
        });
      }
    }
  }

  comments.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

  return {
    formId: form.formId,
    name: form.name,
    displayName: displayFormName(form.name, kind),
    kind,
    completions: total,
    avgModuleNote: average(notes),
    avgQuizNote: kind === "module" ? average(quizNotes) : null,
    successRate: kind === "module" ? average(successRates) : null,
    commentCount: comments.length,
    comments,
    lastSubmittedAt,
  };
}

async function mapPool<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function totalsFromForms(forms: FormStats[]): FilloutTotals {
  const noteValues = forms
    .filter((form) => form.avgModuleNote !== null)
    .flatMap((form) => (form.avgModuleNote !== null ? [form.avgModuleNote] : []));
  const quizValues = forms
    .filter((form) => form.avgQuizNote !== null)
    .flatMap((form) => (form.avgQuizNote !== null ? [form.avgQuizNote] : []));
  const successValues = forms
    .filter((form) => form.successRate !== null)
    .flatMap((form) => (form.successRate !== null ? [form.successRate] : []));

  return {
    formCount: forms.length,
    completions: forms.reduce((sum, form) => sum + form.completions, 0),
    avgModuleNote: average(noteValues),
    avgQuizNote: average(quizValues),
    successRate: average(successValues),
    commentCount: forms.reduce((sum, form) => sum + form.commentCount, 0),
  };
}

export async function loadFilloutDashboard(kind: FormKind): Promise<FilloutDashboard> {
  if (!isFilloutConfigured()) {
    return emptyDashboard(
      kind,
      "Ajoute FILLOUT_API_KEY dans .env.local (Fillout → Settings → Developer).",
      false,
    );
  }

  try {
    const forms = (await listForms()).filter((form) => classifyFormName(form.name) === kind);
    const stats = await mapPool(forms, CONCURRENCY, async (form) => {
      const { submissions, total } = await listAllSubmissions(form.formId);
      return statsFromSubmissions(form, kind, submissions, total);
    });

    stats.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

    return {
      configured: true,
      kind,
      forms: stats,
      totals: totalsFromForms(stats),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Fillout inconnue.";
    return emptyDashboard(kind, message, true);
  }
}

export async function loadFilloutForm(
  kind: FormKind,
  formId: string,
): Promise<{ dashboard: FilloutDashboard; form: FormStats | null }> {
  const dashboard = await loadFilloutDashboard(kind);
  const form = dashboard.forms.find((item) => item.formId === formId) ?? null;
  return { dashboard, form };
}

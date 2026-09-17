import { isSendableEmail, normalizeEmail } from "@/lib/email";
import {
  isFilloutConfigured,
  listForms,
  listFormSubmissions,
  listSubmissionOverview,
  type FilloutFormSummary,
  type FilloutSubmission,
} from "@/lib/fillout";

export type CoursFormStats = {
  formId: string;
  name: string;
  displayName: string;
  courseDate: string | null;
  courseDateLabel: string | null;
  completions: number;
  lastSubmittedAt: string | null;
  deltaVsPrevious: number | null;
  deltaPercentVsPrevious: number | null;
  previousCourseDateLabel: string | null;
  statsReady?: boolean;
};

export type CoursEnLigneTotals = {
  formCount: number;
  completions: number;
  avgCompletionsPerForm: number | null;
};

export type CoursEnLigneDashboard = {
  configured: boolean;
  error?: string;
  forms: CoursFormStats[];
  totals: CoursEnLigneTotals;
};

export type CoursFormOption = {
  formId: string;
  name: string;
  displayName: string;
  courseDate: string | null;
  courseDateLabel: string | null;
  color: string;
};

export type CoursFormRecipients = {
  formId: string;
  label: string;
  color: string;
  emails: string[];
  invalid: number;
  missing: number;
  scanned: number;
};

const FORM_COLORS = ["#2563eb", "#1d4ed8", "#3b82f6", "#1e40af", "#0284c7", "#0369a1"];

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function emptyTotals(): CoursEnLigneTotals {
  return { formCount: 0, completions: 0, avgCompletionsPerForm: null };
}

function emptyDashboard(error?: string, configured = false): CoursEnLigneDashboard {
  return { configured, error, forms: [], totals: emptyTotals() };
}

export function isCoursEnLigneFormName(name: string): boolean {
  const normalized = normalize(name);
  if (!normalized.includes("cours en ligne")) return false;
  if (normalized.includes("feedback") || normalized.includes("questionnaire")) return false;
  return true;
}

type ParsedCourseDate = {
  iso: string;
  label: string;
};

export function extractCourseDateFromName(name: string): ParsedCourseDate | null {
  const match = name.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  let year: number;
  if (match[3]) {
    const rawYear = Number(match[3]);
    year = rawYear < 100 ? 2000 + rawYear : rawYear;
  } else {
    const now = new Date();
    year = now.getFullYear();
    const candidate = new Date(year, month - 1, day);
    if (candidate.getTime() > now.getTime()) {
      year -= 1;
    }
  }

  const label = match[3]
    ? `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
    : `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { iso, label };
}

export function displayCoursFormName(name: string): string {
  const cleaned = name
    .replace(/^cours\s+en\s+ligne\s*[-–:]?\s*/i, "")
    .replace(/\s*[-–:]?\s*cours\s+en\s+ligne\s*[-–:]?\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutDate = cleaned
    .replace(/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*[-–:]?\s*/i, "")
    .replace(/\s*[-–:]?\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/i, "")
    .replace(/\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?=\s|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return withoutDate || cleaned || name;
}

function sortByCourseDateDesc<T extends { courseDate: string | null; displayName: string }>(
  forms: T[],
): T[] {
  return [...forms].sort((a, b) => {
    if (!a.courseDate && !b.courseDate) {
      return a.displayName.localeCompare(b.displayName, "fr");
    }
    if (!a.courseDate) return 1;
    if (!b.courseDate) return -1;
    if (a.courseDate === b.courseDate) {
      return a.displayName.localeCompare(b.displayName, "fr");
    }
    return a.courseDate < b.courseDate ? 1 : -1;
  });
}

function colorForId(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return FORM_COLORS[Math.abs(hash) % FORM_COLORS.length];
}

function collectTexts(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? [text] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectTexts(item));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return collectTexts(record.value ?? record.label ?? record.text ?? record.id);
  }
  return [];
}

function extractSubmissionEmail(submission: FilloutSubmission): string | null {
  for (const question of submission.questions ?? []) {
    if ((question.type ?? "").toLowerCase().includes("email")) {
      const text = collectTexts(question.value)[0];
      if (text) return normalizeEmail(text);
    }
  }
  for (const question of submission.questions ?? []) {
    const name = normalize(question.name ?? "");
    if (!name.includes("mail") && !name.includes("adresse")) continue;
    const text = collectTexts(question.value)[0];
    if (text) return normalizeEmail(text);
  }
  return null;
}

function formOptionFromSummary(form: FilloutFormSummary): CoursFormOption {
  const parsed = extractCourseDateFromName(form.name);
  return {
    formId: form.formId,
    name: form.name,
    displayName: displayCoursFormName(form.name),
    courseDate: parsed?.iso ?? null,
    courseDateLabel: parsed?.label ?? null,
    color: colorForId(form.formId),
  };
}

export function coursFormLabel(form: Pick<CoursFormOption, "displayName" | "courseDateLabel">): string {
  return form.courseDateLabel ? `${form.displayName} (${form.courseDateLabel})` : form.displayName;
}

export async function listCoursFormOptions(): Promise<CoursFormOption[]> {
  const forms = (await listForms(true))
    .filter((form) => isCoursEnLigneFormName(form.name))
    .map(formOptionFromSummary);
  return sortByCourseDateDesc(forms);
}

export async function listCoursFormRecipients(formId: string): Promise<CoursFormRecipients> {
  const forms = (await listForms(true)).filter((form) => isCoursEnLigneFormName(form.name));
  const form = forms.find((item) => item.formId === formId);
  if (!form) {
    throw new Error("Formulaire cours en ligne introuvable.");
  }

  const option = formOptionFromSummary(form);
  const { submissions } = await listFormSubmissions(formId, { fresh: true });
  const emails: string[] = [];
  const seen = new Set<string>();
  let invalid = 0;
  let missing = 0;
  let scanned = 0;

  for (const submission of submissions) {
    scanned += 1;
    const email = extractSubmissionEmail(submission);
    if (!email) {
      missing += 1;
      continue;
    }
    if (!isSendableEmail(email)) {
      invalid += 1;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return {
    formId: option.formId,
    label: coursFormLabel(option),
    color: option.color,
    emails,
    invalid,
    missing,
    scanned,
  };
}

export async function loadCoursFormOverview(formId: string): Promise<{
  formId: string;
  completions: number;
  lastSubmittedAt: string | null;
}> {
  const forms = (await listForms()).filter((form) => isCoursEnLigneFormName(form.name));
  const form = forms.find((item) => item.formId === formId);
  if (!form) {
    throw new Error("Formulaire cours en ligne introuvable.");
  }
  const { total, lastSubmittedAt } = await listSubmissionOverview(form.formId);
  return { formId: form.formId, completions: total, lastSubmittedAt };
}

export async function loadCoursEnLigneDashboard(): Promise<CoursEnLigneDashboard> {
  if (!isFilloutConfigured()) {
    return emptyDashboard(
      "Ajoute FILLOUT_API_KEY dans .env.local (Fillout → Settings → Developer).",
      false,
    );
  }

  try {
    const options = await listCoursFormOptions();
    const forms: CoursFormStats[] = options.map((form) => ({
      formId: form.formId,
      name: form.name,
      displayName: form.displayName,
      courseDate: form.courseDate,
      courseDateLabel: form.courseDateLabel,
      completions: 0,
      lastSubmittedAt: null,
      deltaVsPrevious: null,
      deltaPercentVsPrevious: null,
      previousCourseDateLabel: null,
      statsReady: false,
    }));

    return {
      configured: true,
      forms,
      totals: { formCount: forms.length, completions: 0, avgCompletionsPerForm: null },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Fillout inconnue.";
    return emptyDashboard(message, true);
  }
}

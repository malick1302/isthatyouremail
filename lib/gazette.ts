import { countRecordsPerBase, listInscriptionsSince, type InscriptionDate } from "@/lib/airtable";
import { getConfiguredBases } from "@/lib/bases";
import { applyUnsubscribes, type UnsubscribeHistoryItem, type UnsubscribeSyncResult } from "@/lib/gazette-unsubscribe";

export type PeriodKey = "7d" | "30d" | "90d" | "180d" | "365d";

export type PeriodCompare = {
  key: PeriodKey;
  label: string;
  currentLabel: string;
  previousLabel: string;
  compareHint: string;
  current: number;
  previous: number;
  delta: number;
  percent: number | null;
};

export type DailyPoint = {
  date: string;
  total: number;
  byBase: { id: string; color: string; count: number }[];
};

export type BaseGrowthRow = {
  id: string;
  color: string;
  today: number;
  current: number;
  previous: number;
  delta: number;
  percent: number | null;
};

export type BaseShareRow = {
  id: string;
  color: string;
  count: number;
  percent: number;
};

export type GazetteTotals = {
  total: number;
  bases: BaseShareRow[];
};

export type GazetteDashboard = {
  configured: boolean;
  error?: string;
  today: number;
  todayByBase: { id: string; color: string; count: number }[];
  totals: GazetteTotals;
  periods: PeriodCompare[];
  dailyByPeriod: Record<PeriodKey, DailyPoint[]>;
  basesByPeriod: Record<PeriodKey, BaseGrowthRow[]>;
  history: UnsubscribeHistoryItem[];
  sync: UnsubscribeSyncResult;
};

type DayRange = { start: string; end: string };

const TIMEZONE = "Europe/Paris";
const GROWTH_CACHE_TTL_MS = 5 * 60 * 1000;
const PERIOD_KEYS: PeriodKey[] = ["7d", "30d", "90d", "180d", "365d"];

const PERIOD_META: Record<PeriodKey, { label: string; days: number; compareHint: string }> = {
  "7d": { label: "7 derniers jours", days: 7, compareHint: "vs les 7 jours d'avant" },
  "30d": { label: "30 derniers jours", days: 30, compareHint: "vs les 30 jours d'avant" },
  "90d": { label: "90 derniers jours", days: 90, compareHint: "vs les 90 jours d'avant" },
  "180d": { label: "180 derniers jours", days: 180, compareHint: "vs les 180 jours d'avant" },
  "365d": { label: "365 derniers jours", days: 365, compareHint: "vs les 365 jours d'avant" },
};

let growthCache: { at: number; since: string; inscriptions: InscriptionDate[] } | null = null;
let totalsCache: { at: number; totals: GazetteTotals } | null = null;

function todayParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((part) => part.type === "year")?.value);
  const m = Number(parts.find((part) => part.type === "month")?.value);
  const d = Number(parts.find((part) => part.type === "day")?.value);
  return { y, m, d, key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return dayKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function rollingRange(today: string, days: number, offsetPeriods = 0): DayRange {
  if (offsetPeriods === 0) {
    return { start: addDays(today, -(days - 1)), end: today };
  }
  const previousEnd = addDays(today, -days);
  return { start: addDays(previousEnd, -(days - 1)), end: previousEnd };
}

function formatRange(range: DayRange): string {
  const start = new Date(`${range.start}T12:00:00`);
  const end = new Date(`${range.end}T12:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = start.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const endText = end.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (range.start === range.end) return endText;
  return `${startText} – ${endText}`;
}

function periodRanges(today: string): Record<PeriodKey, { current: DayRange; previous: DayRange }> {
  return Object.fromEntries(
    PERIOD_KEYS.map((key) => {
      const days = PERIOD_META[key].days;
      return [key, { current: rollingRange(today, days, 0), previous: rollingRange(today, days, 1) }];
    }),
  ) as Record<PeriodKey, { current: DayRange; previous: DayRange }>;
}

function inRange(day: string, range: DayRange): boolean {
  return day >= range.start && day <= range.end;
}

function countInRange(items: InscriptionDate[], range: DayRange, baseId?: string): number {
  let count = 0;
  for (const item of items) {
    if (baseId && item.baseId !== baseId) continue;
    if (inRange(item.day, range)) count += 1;
  }
  return count;
}

function compare(current: number, previous: number) {
  const delta = current - previous;
  const percent = previous === 0 ? null : (delta / previous) * 100;
  return { current, previous, delta, percent };
}

function eachDay(range: DayRange): string[] {
  const days: string[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

function dailySeries(items: InscriptionDate[], range: DayRange): DailyPoint[] {
  const bases = getConfiguredBases();
  const days = eachDay(range);
  const counts = new Map<string, Map<string, number>>();

  for (const day of days) counts.set(day, new Map());

  for (const item of items) {
    if (!inRange(item.day, range)) continue;
    const perBase = counts.get(item.day) ?? new Map();
    perBase.set(item.baseId, (perBase.get(item.baseId) ?? 0) + 1);
    counts.set(item.day, perBase);
  }

  return days.map((date) => {
    const perBase = counts.get(date) ?? new Map();
    const byBase = bases.map((base) => ({
      id: base.id,
      color: base.color,
      count: perBase.get(base.id) ?? 0,
    }));
    return {
      date,
      total: byBase.reduce((sum, item) => sum + item.count, 0),
      byBase,
    };
  });
}

function baseRows(
  items: InscriptionDate[],
  current: DayRange,
  previous: DayRange,
  today: string,
): BaseGrowthRow[] {
  return getConfiguredBases().map((base) => {
    const stats = compare(countInRange(items, current, base.id), countInRange(items, previous, base.id));
    return {
      id: base.id,
      color: base.color,
      today: countInRange(items, { start: today, end: today }, base.id),
      ...stats,
    };
  });
}

async function loadInscriptions(sinceDay: string): Promise<InscriptionDate[]> {
  if (
    growthCache &&
    growthCache.since === sinceDay &&
    Date.now() - growthCache.at < GROWTH_CACHE_TTL_MS
  ) {
    return growthCache.inscriptions;
  }
  const inscriptions = await listInscriptionsSince(sinceDay);
  growthCache = { at: Date.now(), since: sinceDay, inscriptions };
  return inscriptions;
}

function emptyTotals(): GazetteTotals {
  return { total: 0, bases: [] };
}

async function loadBaseTotals(): Promise<GazetteTotals> {
  if (totalsCache && Date.now() - totalsCache.at < GROWTH_CACHE_TTL_MS) {
    return totalsCache.totals;
  }
  const counts = await countRecordsPerBase();
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const totals: GazetteTotals = {
    total,
    bases: [...counts]
      .map((item) => ({
        id: item.id,
        color: item.color,
        count: item.count,
        percent: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id, "fr")),
  };
  totalsCache = { at: Date.now(), totals };
  return totals;
}

function emptySync(): UnsubscribeSyncResult {
  return { applied: 0, failed: 0, checked: 0, writeDenied: false, failedEmails: [] };
}

export async function loadGazetteDashboard(options?: { apply?: boolean }): Promise<GazetteDashboard> {
  const today = todayParts();
  const ranges = periodRanges(today.key);
  const sinceDay = ranges["365d"].previous.start;
  const configured = Boolean(process.env.AIRTABLE_PAT) && getConfiguredBases().length > 0;

  if (!configured) {
    return {
      configured: false,
      error: "Ajoute AIRTABLE_PAT et configure config/bases.json.",
      today: 0,
      todayByBase: [],
      totals: emptyTotals(),
      periods: [],
      dailyByPeriod: { "7d": [], "30d": [], "90d": [], "180d": [], "365d": [] },
      basesByPeriod: { "7d": [], "30d": [], "90d": [], "180d": [], "365d": [] },
      history: [],
      sync: emptySync(),
    };
  }

  try {
    const [inscriptions, unsubscribe, totals] = await Promise.all([
      loadInscriptions(sinceDay),
      applyUnsubscribes({ apply: options?.apply ?? true }),
      loadBaseTotals(),
    ]);

    const periods: PeriodCompare[] = PERIOD_KEYS.map((key) => {
      const { current, previous } = ranges[key];
      return {
        key,
        label: PERIOD_META[key].label,
        currentLabel: formatRange(current),
        previousLabel: formatRange(previous),
        compareHint: PERIOD_META[key].compareHint,
        ...compare(countInRange(inscriptions, current), countInRange(inscriptions, previous)),
      };
    });

    const dailyByPeriod = Object.fromEntries(
      PERIOD_KEYS.map((key) => [key, dailySeries(inscriptions, ranges[key].current)]),
    ) as Record<PeriodKey, DailyPoint[]>;

    const basesByPeriod = Object.fromEntries(
      PERIOD_KEYS.map((key) => [
        key,
        baseRows(inscriptions, ranges[key].current, ranges[key].previous, today.key),
      ]),
    ) as Record<PeriodKey, BaseGrowthRow[]>;

    return {
      configured: true,
      today: countInRange(inscriptions, { start: today.key, end: today.key }),
      todayByBase: getConfiguredBases().map((base) => ({
        id: base.id,
        color: base.color,
        count: countInRange(inscriptions, { start: today.key, end: today.key }, base.id),
      })),
      totals,
      periods,
      dailyByPeriod,
      basesByPeriod,
      history: unsubscribe.history,
      sync: unsubscribe.sync,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return {
      configured: true,
      error: message,
      today: 0,
      todayByBase: [],
      totals: emptyTotals(),
      periods: [],
      dailyByPeriod: { "7d": [], "30d": [], "90d": [], "180d": [], "365d": [] },
      basesByPeriod: { "7d": [], "30d": [], "90d": [], "180d": [], "365d": [] },
      history: [],
      sync: emptySync(),
    };
  }
}

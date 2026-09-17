import { escapeHogQLString, isPostHogConfigured, runHogQL } from "@/lib/posthog";
import { getSoftrSiteById } from "@/lib/softr-sites";
import type { SoftrSiteConfig } from "@/lib/types";

export type PeriodKey = "week" | "month" | "quarter" | "semester" | "year";

export type PeriodSliceMetrics = {
  users: number;
  sessions: number;
  pageviews: number;
  avgSessionSeconds: number;
  avgPagesPerUser: number;
  avgMinutesPerUser: number;
};

export type PeriodComparison = {
  key: PeriodKey;
  label: string;
  currentLabel: string;
  previousLabel: string;
  current: PeriodSliceMetrics;
  previous: PeriodSliceMetrics;
};

export type SiteDetailDashboard = {
  configured: boolean;
  error?: string;
  site: SoftrSiteConfig;
  comparisons: PeriodComparison[];
};

type PeriodWindow = {
  key: PeriodKey;
  label: string;
  currentLabel: string;
  previousLabel: string;
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

type PageviewRow = {
  ts: number;
  distinctId: string;
  sessionId: string;
};

function emptyMetrics(): PeriodSliceMetrics {
  return {
    users: 0,
    sessions: 0,
    pageviews: 0,
    avgSessionSeconds: 0,
    avgPagesPerUser: 0,
    avgMinutesPerUser: 0,
  };
}

function parseHogQLDate(value: string): number {
  if (!value) return 0;
  if (value.includes("T")) return new Date(value).getTime();
  return new Date(value.replace(" ", "T") + "Z").getTime();
}

/** Fenêtres calendaires + 7 jours glissants, pour un VS équitable. */
function buildPeriodWindows(now = new Date()): PeriodWindow[] {
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const startOfQuarter = (d: Date) => {
    const q = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), q, 1);
  };
  const startOfSemester = (d: Date) =>
    d.getMonth() < 6 ? new Date(d.getFullYear(), 0, 1) : new Date(d.getFullYear(), 6, 1);
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

  const today = startOfDay(now);
  const weekCurrentEnd = now;
  const weekCurrentStart = addDays(today, -6);
  const weekPreviousEnd = weekCurrentStart;
  const weekPreviousStart = addDays(weekCurrentStart, -7);

  const monthCurrentStart = startOfMonth(now);
  const monthPreviousStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const monthPreviousEnd = monthCurrentStart;

  const quarterCurrentStart = startOfQuarter(now);
  const quarterPreviousStart = startOfQuarter(
    new Date(quarterCurrentStart.getFullYear(), quarterCurrentStart.getMonth() - 3, 1),
  );
  const quarterPreviousEnd = quarterCurrentStart;

  const semesterCurrentStart = startOfSemester(now);
  const semesterPreviousStart =
    semesterCurrentStart.getMonth() === 0
      ? new Date(semesterCurrentStart.getFullYear() - 1, 6, 1)
      : new Date(semesterCurrentStart.getFullYear(), 0, 1);
  const semesterPreviousEnd = semesterCurrentStart;

  const yearCurrentStart = startOfYear(now);
  const yearPreviousStart = new Date(now.getFullYear() - 1, 0, 1);
  const yearPreviousEnd = yearCurrentStart;

  const fr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const range = (a: Date, b: Date) => `${fr.format(a)} → ${fr.format(b)}`;

  return [
    {
      key: "week",
      label: "Semaine",
      currentLabel: `7 derniers jours (${range(weekCurrentStart, weekCurrentEnd)})`,
      previousLabel: `7 jours précédents (${range(weekPreviousStart, addDays(weekPreviousEnd, -1))})`,
      currentStart: fmt(weekCurrentStart),
      currentEnd: fmt(weekCurrentEnd),
      previousStart: fmt(weekPreviousStart),
      previousEnd: fmt(weekPreviousEnd),
    },
    {
      key: "month",
      label: "Mois",
      currentLabel: `Mois en cours (${range(monthCurrentStart, weekCurrentEnd)})`,
      previousLabel: `Mois précédent (${range(monthPreviousStart, addDays(monthPreviousEnd, -1))})`,
      currentStart: fmt(monthCurrentStart),
      currentEnd: fmt(weekCurrentEnd),
      previousStart: fmt(monthPreviousStart),
      previousEnd: fmt(monthPreviousEnd),
    },
    {
      key: "quarter",
      label: "Trimestre",
      currentLabel: `Trimestre en cours (${range(quarterCurrentStart, weekCurrentEnd)})`,
      previousLabel: `Trimestre précédent (${range(quarterPreviousStart, addDays(quarterPreviousEnd, -1))})`,
      currentStart: fmt(quarterCurrentStart),
      currentEnd: fmt(weekCurrentEnd),
      previousStart: fmt(quarterPreviousStart),
      previousEnd: fmt(quarterPreviousEnd),
    },
    {
      key: "semester",
      label: "Semestre",
      currentLabel: `Semestre en cours (${range(semesterCurrentStart, weekCurrentEnd)})`,
      previousLabel: `Semestre précédent (${range(semesterPreviousStart, addDays(semesterPreviousEnd, -1))})`,
      currentStart: fmt(semesterCurrentStart),
      currentEnd: fmt(weekCurrentEnd),
      previousStart: fmt(semesterPreviousStart),
      previousEnd: fmt(semesterPreviousEnd),
    },
    {
      key: "year",
      label: "Année",
      currentLabel: `Année en cours (${range(yearCurrentStart, weekCurrentEnd)})`,
      previousLabel: `Année précédente (${range(yearPreviousStart, addDays(yearPreviousEnd, -1))})`,
      currentStart: fmt(yearCurrentStart),
      currentEnd: fmt(weekCurrentEnd),
      previousStart: fmt(yearPreviousStart),
      previousEnd: fmt(yearPreviousEnd),
    },
  ];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function metricsFromEvents(events: PageviewRow[], start: string, end: string): PeriodSliceMetrics {
  const startMs = parseHogQLDate(start);
  const endMs = parseHogQLDate(end);
  const sliced = events.filter((event) => event.ts >= startMs && event.ts < endMs);
  if (sliced.length === 0) return emptyMetrics();

  const users = new Set<string>();
  const sessions = new Set<string>();
  const sessionBounds = new Map<string, { min: number; max: number; pages: number; user: string }>();

  for (const event of sliced) {
    users.add(event.distinctId);
    if (event.sessionId) sessions.add(event.sessionId);
    const key = event.sessionId || `${event.distinctId}:${event.ts}`;
    const current = sessionBounds.get(key);
    if (!current) {
      sessionBounds.set(key, {
        min: event.ts,
        max: event.ts,
        pages: 1,
        user: event.distinctId,
      });
    } else {
      current.min = Math.min(current.min, event.ts);
      current.max = Math.max(current.max, event.ts);
      current.pages += 1;
    }
  }

  const perUser = new Map<string, { pages: number; seconds: number }>();
  const sessionSeconds: number[] = [];
  for (const session of sessionBounds.values()) {
    const seconds = Math.max((session.max - session.min) / 1000, 0);
    sessionSeconds.push(seconds);
    const user = perUser.get(session.user) ?? { pages: 0, seconds: 0 };
    user.pages += session.pages;
    user.seconds += seconds;
    perUser.set(session.user, user);
  }

  const userStats = [...perUser.values()];
  const pageviews = sliced.length;
  const userCount = users.size;

  return {
    users: userCount,
    sessions: sessions.size,
    pageviews,
    avgSessionSeconds: average(sessionSeconds),
    avgPagesPerUser: userCount > 0 ? average(userStats.map((user) => user.pages)) : 0,
    avgMinutesPerUser: userCount > 0 ? average(userStats.map((user) => user.seconds / 60)) : 0,
  };
}

export function percentDelta(current: number, previous: number): number | null {
  if (!previous || !Number.isFinite(previous) || previous === 0) {
    if (!current) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export async function loadSiteDetailDashboard(siteId: string): Promise<SiteDetailDashboard | null> {
  const site = getSoftrSiteById(siteId);
  if (!site) return null;

  if (!isPostHogConfigured()) {
    return {
      configured: false,
      error: "Renseigne POSTHOG_PERSONAL_API_KEY et POSTHOG_PROJECT_ID dans .env.local.",
      site,
      comparisons: [],
    };
  }

  const windows = buildPeriodWindows();
  const earliest = windows.reduce((min, window) => {
    return window.previousStart < min ? window.previousStart : min;
  }, windows[0].previousStart);

  try {
    const result = await runHogQL(`
      SELECT
        timestamp,
        distinct_id,
        properties.$session_id AS session_id
      FROM events
      WHERE event = '$pageview'
        AND properties.site_id = '${escapeHogQLString(site.id)}'
        AND timestamp >= toDateTime('${earliest}')
      ORDER BY timestamp ASC
      LIMIT 20000
    `);

    const events: PageviewRow[] = (result.results ?? []).map((row) => ({
      ts: parseHogQLDate(String(row[0] ?? "")),
      distinctId: String(row[1] ?? ""),
      sessionId: String(row[2] ?? ""),
    }));

    const comparisons = windows.map((window) => ({
      key: window.key,
      label: window.label,
      currentLabel: window.currentLabel,
      previousLabel: window.previousLabel,
      current: metricsFromEvents(events, window.currentStart, window.currentEnd),
      previous: metricsFromEvents(events, window.previousStart, window.previousEnd),
    })) satisfies PeriodComparison[];

    return {
      configured: true,
      site,
      comparisons,
    };
  } catch (error) {
    return {
      configured: true,
      error: error instanceof Error ? error.message : "Erreur PostHog inconnue.",
      site,
      comparisons: [],
    };
  }
}

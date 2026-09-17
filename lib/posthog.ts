import { getSoftrSites } from "@/lib/softr-sites";
import type { SoftrSiteConfig } from "@/lib/types";

export type TopPageByViews = {
  path: string;
  views: number;
};

export type TopPageByTime = {
  path: string;
  avgSeconds: number;
  visits: number;
};

export type VisitorDetail = {
  visitorId: string;
  shortId: string;
  sessions: number;
  pageviews: number;
  totalSeconds: number;
  pages: string[];
  lastSeen: string;
};

export type SiteMetrics = {
  siteId: string;
  label: string;
  color: string;
  url: string;
  dau7: number;
  wau7: number;
  wau30: number;
  sessions7: number;
  sessions30: number;
  pageviews7: number;
  pageviews30: number;
  avgSessionDuration7: number;
  avgMinutesPerUser7: number;
  avgPagesPerUser7: number;
  topPages7: TopPageByViews[];
  topPagesByTime7: TopPageByTime[];
  visitors7: VisitorDetail[];
  lastEventAt: string | null;
};

export type DailyActiveUsers = {
  date: string;
  count: number;
};

export type LiveEvent = {
  timestamp: string;
  event: string;
  siteId: string;
  host: string;
  path: string;
};

export type UsageDashboard = {
  configured: boolean;
  error?: string;
  fetchedAt: string;
  lastEventAt: string | null;
  sites: SiteMetrics[];
  globalDailyActive: DailyActiveUsers[];
  liveEvents: LiveEvent[];
  totals: {
    dau7: number;
    wau7: number;
    sessions7: number;
    pageviews7: number;
    events7: number;
  };
};

export type HogQLResult = {
  results?: unknown[][];
  columns?: string[];
};

export function getPostHogHost(): string {
  return process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";
}

function getPostHogConfig() {
  const host = getPostHogHost();
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  return { host, apiKey, projectId };
}

export function isPostHogConfigured(): boolean {
  const { apiKey, projectId } = getPostHogConfig();
  return Boolean(apiKey && projectId);
}

export function escapeHogQLString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

import https from "node:https";
import http from "node:http";
import { URL } from "node:url";

function postJson(urlString: string, apiKey: string, payload: unknown): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const raw = JSON.stringify(payload);
    const transport = url.protocol === "http:" ? http : https;
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || undefined,
        path: url.pathname,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(raw),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk as Buffer));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.write(raw);
    req.end();
  });
}

export async function runHogQL(query: string): Promise<HogQLResult> {
  const { host, apiKey, projectId } = getPostHogConfig();
  if (!apiKey || !projectId) {
    throw new Error("PostHog non configuré.");
  }

  const { status, body } = await postJson(`${host}/api/projects/${projectId}/query/`, apiKey, {
    query: {
      kind: "HogQLQuery",
      query,
    },
  });

  if (status < 200 || status >= 300) {
    throw new Error(`PostHog API (${status}): ${body.slice(0, 200)}`);
  }

  const data = JSON.parse(body) as { results?: unknown[][]; columns?: string[] };
  return { results: data.results, columns: data.columns };
}

function shortVisitorId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function parsePages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }
  return [];
}

function emptySiteMetrics(site: SoftrSiteConfig): SiteMetrics {
  return {
    siteId: site.id,
    label: site.label,
    color: site.color,
    url: site.url,
    dau7: 0,
    wau7: 0,
    wau30: 0,
    sessions7: 0,
    sessions30: 0,
    pageviews7: 0,
    pageviews30: 0,
    avgSessionDuration7: 0,
    avgMinutesPerUser7: 0,
    avgPagesPerUser7: 0,
    topPages7: [],
    topPagesByTime7: [],
    visitors7: [],
    lastEventAt: null,
  };
}

function emptyDashboard(partial: Partial<UsageDashboard> = {}): UsageDashboard {
  return {
    configured: true,
    fetchedAt: new Date().toISOString(),
    lastEventAt: null,
    sites: [],
    globalDailyActive: [],
    liveEvents: [],
    totals: { dau7: 0, wau7: 0, sessions7: 0, pageviews7: 0, events7: 0 },
    ...partial,
  };
}

type SettledQuery = PromiseSettledResult<HogQLResult>;

function resultOf(settled: SettledQuery): HogQLResult {
  return settled.status === "fulfilled" ? settled.value : { results: [] };
}

function firstError(results: SettledQuery[]): string | undefined {
  const failed = results.find((result) => result.status === "rejected");
  if (!failed || failed.status !== "rejected") return undefined;
  return failed.reason instanceof Error ? failed.reason.message : "Erreur PostHog.";
}

export async function loadUsageDashboard(): Promise<UsageDashboard> {
  const fetchedAt = new Date().toISOString();

  if (!isPostHogConfigured()) {
    return emptyDashboard({
      configured: false,
      fetchedAt,
      error: "Renseigne POSTHOG_PERSONAL_API_KEY et POSTHOG_PROJECT_ID dans .env.local.",
    });
  }

  const sites = getSoftrSites();

  try {
    const settled = await Promise.allSettled([
      runHogQL(`
        SELECT
          properties.site_id AS site_id,
          count(DISTINCT if(timestamp >= now() - INTERVAL 1 DAY, distinct_id, NULL)) AS dau1,
          count(DISTINCT if(timestamp >= now() - INTERVAL 7 DAY, distinct_id, NULL)) AS wau7,
          count(DISTINCT if(timestamp >= now() - INTERVAL 30 DAY, distinct_id, NULL)) AS wau30,
          count(DISTINCT if(timestamp >= now() - INTERVAL 7 DAY, properties.$session_id, NULL)) AS sessions7,
          count(DISTINCT if(timestamp >= now() - INTERVAL 30 DAY, properties.$session_id, NULL)) AS sessions30,
          countIf(timestamp >= now() - INTERVAL 7 DAY) AS pageviews7,
          countIf(timestamp >= now() - INTERVAL 30 DAY) AS pageviews30,
          max(timestamp) AS last_event
        FROM events
        WHERE event = '$pageview'
          AND properties.site_id IS NOT NULL
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY site_id
      `),
      runHogQL(`
        SELECT
          site_id,
          avg(session_seconds) AS avg_session_seconds
        FROM (
          SELECT
            properties.site_id AS site_id,
            properties.$session_id AS sid,
            greatest(dateDiff('second', min(timestamp), max(timestamp)), 0) AS session_seconds
          FROM events
          WHERE event = '$pageview'
            AND properties.site_id IS NOT NULL
            AND timestamp >= now() - INTERVAL 7 DAY
            AND properties.$session_id IS NOT NULL
          GROUP BY properties.site_id, properties.$session_id
        ) AS per_session
        GROUP BY site_id
      `),
      runHogQL(`
        SELECT
          site_id,
          avg(user_pages) AS avg_pages,
          avg(user_seconds) / 60 AS avg_minutes
        FROM (
          SELECT
            site_id,
            distinct_id,
            sum(pageviews) AS user_pages,
            sum(session_seconds) AS user_seconds
          FROM (
            SELECT
              properties.site_id AS site_id,
              distinct_id,
              count() AS pageviews,
              greatest(dateDiff('second', min(timestamp), max(timestamp)), 0) AS session_seconds
            FROM events
            WHERE event = '$pageview'
              AND properties.site_id IS NOT NULL
              AND timestamp >= now() - INTERVAL 7 DAY
              AND properties.$session_id IS NOT NULL
            GROUP BY properties.site_id, distinct_id, properties.$session_id
          ) AS per_session
          GROUP BY site_id, distinct_id
        ) AS per_user
        GROUP BY site_id
      `),
      runHogQL(`
        SELECT
          properties.site_id AS site_id,
          properties.$pathname AS path,
          count() AS views
        FROM events
        WHERE event = '$pageview'
          AND properties.site_id IS NOT NULL
          AND timestamp >= now() - INTERVAL 7 DAY
          AND properties.$pathname IS NOT NULL
        GROUP BY site_id, path
        ORDER BY views DESC
        LIMIT 200
      `),
      runHogQL(`
        SELECT
          properties.site_id AS site_id,
          properties.$prev_pageview_pathname AS path,
          avg(toFloat(properties.$prev_pageview_duration)) AS avg_seconds,
          count() AS visits
        FROM events
        WHERE event = '$pageview'
          AND properties.site_id IS NOT NULL
          AND timestamp >= now() - INTERVAL 7 DAY
          AND properties.$prev_pageview_pathname IS NOT NULL
          AND properties.$prev_pageview_duration IS NOT NULL
          AND toFloat(properties.$prev_pageview_duration) > 0
        GROUP BY site_id, path
        ORDER BY avg_seconds DESC
        LIMIT 80
      `),
      runHogQL(`
        SELECT
          properties.site_id AS site_id,
          distinct_id AS visitor_id,
          count(DISTINCT properties.$session_id) AS sessions,
          count() AS pageviews,
          greatest(dateDiff('second', min(timestamp), max(timestamp)), 0) AS total_seconds,
          groupUniqArray(12)(properties.$pathname) AS pages,
          max(timestamp) AS last_seen
        FROM events
        WHERE event = '$pageview'
          AND properties.site_id IS NOT NULL
          AND timestamp >= now() - INTERVAL 7 DAY
          AND properties.$pathname IS NOT NULL
        GROUP BY site_id, distinct_id
        ORDER BY last_seen DESC
        LIMIT 2000
      `),
      runHogQL(`
        SELECT toDate(timestamp) AS day, count(DISTINCT distinct_id) AS users
        FROM events
        WHERE event = '$pageview'
          AND properties.site_id IS NOT NULL
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY day
        ORDER BY day ASC
      `),
      runHogQL(`
        SELECT
          properties.site_id AS site_id,
          max(timestamp) AS last_event,
          count() AS events7
        FROM events
        WHERE properties.site_id IS NOT NULL
          AND timestamp >= now() - INTERVAL 7 DAY
        GROUP BY site_id
      `),
      runHogQL(`
        SELECT
          timestamp,
          event,
          properties.site_id AS site_id,
          properties.$host AS host,
          properties.$pathname AS path
        FROM events
        WHERE timestamp >= now() - INTERVAL 2 DAY
        ORDER BY timestamp DESC
        LIMIT 30
      `),
    ]);

    const [kpis, sessionAvgs, userAvgs, topPages, topByTime, visitors, daily, activity, live] = settled;
    const queryError = firstError(settled);

    if (kpis.status === "rejected" && visitors.status === "rejected") {
      return emptyDashboard({
        fetchedAt,
        error: queryError ?? "Impossible de lire PostHog.",
        sites: sites.map(emptySiteMetrics),
      });
    }

    const kpiBySite = new Map<string, unknown[]>();
    for (const row of resultOf(kpis).results ?? []) {
      kpiBySite.set(String(row[0] ?? ""), row);
    }

    const sessionBySite = new Map<string, number>();
    for (const row of resultOf(sessionAvgs).results ?? []) {
      sessionBySite.set(String(row[0] ?? ""), Number(row[1] ?? 0));
    }

    const userAvgBySite = new Map<string, { minutes: number; pages: number }>();
    for (const row of resultOf(userAvgs).results ?? []) {
      userAvgBySite.set(String(row[0] ?? ""), {
        pages: Number(row[1] ?? 0),
        minutes: Number(row[2] ?? 0),
      });
    }

    const pagesBySite = new Map<string, TopPageByViews[]>();
    for (const row of resultOf(topPages).results ?? []) {
      const siteId = String(row[0] ?? "");
      const list = pagesBySite.get(siteId) ?? [];
      if (list.length < 5) {
        list.push({ path: String(row[1] ?? "/"), views: Number(row[2] ?? 0) });
        pagesBySite.set(siteId, list);
      }
    }

    const timeBySite = new Map<string, TopPageByTime[]>();
    for (const row of resultOf(topByTime).results ?? []) {
      const siteId = String(row[0] ?? "");
      const list = timeBySite.get(siteId) ?? [];
      if (list.length < 3) {
        list.push({
          path: String(row[1] ?? "/"),
          avgSeconds: Number(row[2] ?? 0),
          visits: Number(row[3] ?? 0),
        });
        timeBySite.set(siteId, list);
      }
    }

    const visitorsBySite = new Map<string, VisitorDetail[]>();
    for (const row of resultOf(visitors).results ?? []) {
      const siteId = String(row[0] ?? "");
      const list = visitorsBySite.get(siteId) ?? [];
      const visitorId = String(row[1] ?? "");
      list.push({
        visitorId,
        shortId: shortVisitorId(visitorId),
        sessions: Number(row[2] ?? 0),
        pageviews: Number(row[3] ?? 0),
        totalSeconds: Number(row[4] ?? 0),
        pages: parsePages(row[5]).filter((path) => path && path !== "null"),
        lastSeen: String(row[6] ?? ""),
      });
      visitorsBySite.set(siteId, list);
    }
    for (const [siteId, list] of visitorsBySite) {
      list.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : a.lastSeen > b.lastSeen ? -1 : 0));
      visitorsBySite.set(siteId, list.slice(0, 40));
    }

    const lastEventBySite = new Map<string, string>();
    let events7 = 0;
    for (const row of resultOf(activity).results ?? []) {
      const siteId = String(row[0] ?? "");
      const last = row[1] ? String(row[1]) : "";
      if (last) lastEventBySite.set(siteId, last);
      events7 += Number(row[2] ?? 0);
    }

    const siteMetrics = sites.map((site) => {
      const kpi = kpiBySite.get(site.id);
      const userAvg = userAvgBySite.get(site.id);
      const lastEvent = lastEventBySite.get(site.id) ?? (kpi?.[8] ? String(kpi[8]) : null);
      return {
        ...emptySiteMetrics(site),
        dau7: Number(kpi?.[1] ?? 0),
        wau7: Number(kpi?.[2] ?? 0),
        wau30: Number(kpi?.[3] ?? 0),
        sessions7: Number(kpi?.[4] ?? 0),
        sessions30: Number(kpi?.[5] ?? 0),
        pageviews7: Number(kpi?.[6] ?? 0),
        pageviews30: Number(kpi?.[7] ?? 0),
        avgSessionDuration7: sessionBySite.get(site.id) ?? 0,
        avgMinutesPerUser7: Number.isFinite(userAvg?.minutes) ? (userAvg?.minutes ?? 0) : 0,
        avgPagesPerUser7: Number.isFinite(userAvg?.pages) ? (userAvg?.pages ?? 0) : 0,
        topPages7: pagesBySite.get(site.id) ?? [],
        topPagesByTime7: timeBySite.get(site.id) ?? [],
        visitors7: visitorsBySite.get(site.id) ?? [],
        lastEventAt: lastEvent,
      } satisfies SiteMetrics;
    });

    const totals = siteMetrics.reduce(
      (acc, site) => ({
        dau7: acc.dau7 + site.dau7,
        wau7: acc.wau7 + site.wau7,
        sessions7: acc.sessions7 + site.sessions7,
        pageviews7: acc.pageviews7 + site.pageviews7,
        events7: acc.events7,
      }),
      {
        dau7: 0,
        wau7: 0,
        sessions7: 0,
        pageviews7: 0,
        events7,
      },
    );

    const liveEvents: LiveEvent[] = (resultOf(live).results ?? []).map((row) => ({
      timestamp: String(row[0] ?? ""),
      event: String(row[1] ?? ""),
      siteId: String(row[2] ?? ""),
      host: String(row[3] ?? ""),
      path: String(row[4] ?? ""),
    }));

    const lastEventAt = [
      ...siteMetrics.map((site) => site.lastEventAt),
      liveEvents[0]?.timestamp,
    ]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

    const globalDailyActive: DailyActiveUsers[] = (resultOf(daily).results ?? []).map((row) => ({
      date: String(row[0] ?? ""),
      count: Number(row[1] ?? 0),
    }));

    const hasAnyData = siteMetrics.some(
      (site) => site.pageviews7 > 0 || site.visitors7.length > 0 || site.sessions7 > 0,
    ) || liveEvents.length > 0 || totals.events7 > 0;

    const dashboard: UsageDashboard = {
      configured: true,
      fetchedAt,
      lastEventAt,
      error: !hasAnyData ? queryError : undefined,
      sites: siteMetrics,
      globalDailyActive,
      liveEvents,
      totals,
    };

    console.info("[trackmyusers]", {
      error: dashboard.error,
      totals: dashboard.totals,
      lastEventAt: dashboard.lastEventAt,
      live: liveEvents[0] ?? null,
      sites: siteMetrics.map((site) => ({
        id: site.siteId,
        pageviews7: site.pageviews7,
        lastEventAt: site.lastEventAt,
      })),
    });

    return dashboard;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur PostHog inconnue.";
    return emptyDashboard({
      fetchedAt,
      error: message,
      sites: sites.map(emptySiteMetrics),
    });
  }
}

export { formatDuration, formatMinutes } from "@/lib/format-duration";

export function buildPostHogSnippet(siteId: string): string {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "VOTRE_CLE_PUBLIQUE";
  const host = getPostHogHost();

  return `<script>
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init('${key}', {
    api_host: '${host}',
    person_profiles: 'identified_only',
    loaded: function(posthog) {
      posthog.register({ site_id: '${siteId}' });
    }
  });
</script>`;
}

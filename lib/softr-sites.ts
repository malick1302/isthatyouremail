import sitesJson from "@/config/softr-sites.json";
import type { BaseConfig, SoftrSiteConfig } from "@/lib/types";

export function getSoftrSites(): SoftrSiteConfig[] {
  return sitesJson as SoftrSiteConfig[];
}

export function getConfiguredSoftrSites(): SoftrSiteConfig[] {
  return getSoftrSites().filter((site) => !site.url.includes("votre-site-"));
}

export function getSoftrSiteById(id: string): SoftrSiteConfig | undefined {
  return getSoftrSites().find((site) => site.id === id);
}

export function getSoftrSiteForBase(base: BaseConfig): SoftrSiteConfig | undefined {
  if (base.softrSiteId) return getSoftrSiteById(base.softrSiteId);
  return getSoftrSiteById(base.id) ?? getSoftrSites().find((site) => site.label === base.label);
}

export function getSoftrDomain(site: SoftrSiteConfig): string {
  if (site.softrDomain) return site.softrDomain;
  try {
    return new URL(site.url).hostname;
  } catch {
    return site.url.replace(/^https?:\/\//, "").split("/")[0] ?? site.url;
  }
}

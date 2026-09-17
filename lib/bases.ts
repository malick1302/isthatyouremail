import basesJson from "@/config/bases.json";
import type { BaseConfig } from "@/lib/types";

export function extractBaseId(value: string): string {
  const match = value.match(/app[a-zA-Z0-9]+/);
  return match?.[0] ?? value;
}

export const DEFAULT_DATE_FIELD = "Date inscription";
export const DEFAULT_GAZETTE_OPT_OUT_FIELD = "Désabonnement Gazette";
export const DEFAULT_COURS_OPT_OUT_FIELD = "Désabonnement Cours en ligne";

export function getBases(): BaseConfig[] {
  return (basesJson as BaseConfig[])
    .filter((base) => base.enabled !== false)
    .map((base) => ({
      ...base,
      baseId: extractBaseId(base.baseId),
      dateField: base.dateField ?? DEFAULT_DATE_FIELD,
      gazetteOptOutField: base.gazetteOptOutField ?? DEFAULT_GAZETTE_OPT_OUT_FIELD,
      coursOptOutField: base.coursOptOutField ?? DEFAULT_COURS_OPT_OUT_FIELD,
    }));
}

export function dateFieldOf(base: BaseConfig): string {
  return base.dateField ?? DEFAULT_DATE_FIELD;
}

export function gazetteOptOutFieldOf(base: BaseConfig): string {
  return base.gazetteOptOutField ?? DEFAULT_GAZETTE_OPT_OUT_FIELD;
}

export function coursOptOutFieldOf(base: BaseConfig): string {
  return base.coursOptOutField ?? DEFAULT_COURS_OPT_OUT_FIELD;
}

export function getConfiguredBases(): BaseConfig[] {
  return getBases().filter((base) => {
    const id = base.baseId;
    return id && !id.startsWith("appXXXX") && !id.startsWith("appYYYY") && id.startsWith("app");
  });
}

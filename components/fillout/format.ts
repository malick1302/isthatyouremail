export function formatScore(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)} %`;
}

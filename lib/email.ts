export function parseAddress(raw: string): { name: string; email: string } {
  const trimmed = raw.trim().replace(/[\r\n]+/g, " ");
  const angled = trimmed.match(/^(.*)<([^>]+)>\s*$/);
  if (angled) {
    return {
      name: angled[1].replace(/["']/g, "").trim(),
      email: normalizeEmail(angled[2]),
    };
  }
  return { name: "", email: normalizeEmail(trimmed) };
}

export function parseFirstAddress(raw: string): { name: string; email: string } {
  const first = (raw.split(",")[0] ?? "").trim();
  return parseAddress(first);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSendableEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function contrastText(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#fff";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance < 150 ? "#fffaf3" : "#241c14";
}

export function fadeHex(hex: string, amount = 0.62): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#d7cbb8";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (243 - channel) * amount);
  const toHex = (channel: number) => mix(channel).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  }
  return remaining > 0 ? `${minutes} min ${remaining} s` : `${minutes} min`;
}

export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return "—";
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  return `${minutes.toFixed(1)} min`;
}

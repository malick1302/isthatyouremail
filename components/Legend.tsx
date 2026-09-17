import { getBases } from "@/lib/bases";

export function Legend() {
  const bases = getBases();
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
      <span className="uppercase tracking-[0.14em] text-[11px]">Légende</span>
      {bases.map((base) => (
        <span key={base.id} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: base.color }}
            aria-hidden
          />
          {base.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-[var(--line)]" />
        Autre
      </span>
    </div>
  );
}

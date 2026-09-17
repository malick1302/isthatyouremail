import Link from "next/link";

export function AppCard({
  title,
  description,
  href,
  accent,
  size = "full",
}: {
  title: string;
  description: string;
  href: string;
  accent: string;
  size?: "full" | "half";
}) {
  const compact = size === "half";

  return (
    <Link
      href={href}
      prefetch={false}
      className={`group flex h-full flex-col rounded-3xl border border-[var(--line)] bg-[var(--card)] shadow-[0_20px_50px_rgba(36,28,20,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(36,28,20,0.1)] ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <span
        className={`rounded-full ${compact ? "h-1 w-8" : "h-1.5 w-12"}`}
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <h2
        className={`mt-4 font-[family-name:var(--font-display)] leading-tight ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-2 flex-1 text-[var(--muted)] ${
          compact ? "text-[13px] leading-5" : "text-[15px] leading-6"
        }`}
      >
        {description}
      </p>
      <span
        className={`font-medium text-[var(--brand)] group-hover:underline ${
          compact ? "mt-3 text-xs" : "mt-6 text-sm"
        }`}
      >
        Ouvrir →
      </span>
    </Link>
  );
}

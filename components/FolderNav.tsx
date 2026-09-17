"use client";

import type { NavFolder } from "@/lib/folders";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = NavFolder & { count: number };

export function FolderNav({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] shrink-0 bg-[var(--nav-folders)]">
      <nav className="flex h-full flex-col gap-0.5 overflow-y-auto p-4">
        <p className="mb-3 px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ink)]/70">
          Dossiers
        </p>
        {items.map((item) => {
          const active =
            item.slug === "inbox" ? pathname === "/inbox" : pathname === item.href;
          return (
            <Link
              key={item.slug}
              href={item.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                active
                  ? "bg-white font-medium text-[var(--brand)]"
                  : "text-[var(--ink)] hover:bg-white/40"
              }`}
            >
              {item.color ? (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
              ) : (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-[var(--line)]"
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span
                className={`text-xs tabular-nums ${
                  item.count > 0
                    ? active
                      ? "font-semibold text-[var(--brand)]"
                      : "font-semibold text-[var(--ink)]"
                    : active
                      ? "text-[var(--brand)]"
                      : "text-[var(--ink)]/50"
                }`}
              >
                {item.count}
              </span>
            </Link>
          );
        })}
        <p className="mb-2 mt-5 px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ink)]/70">
          Suivi
        </p>
        <Link
          href="/inbox/sent"
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
            pathname === "/inbox/sent"
              ? "bg-white font-medium text-[var(--brand)]"
              : "text-[var(--ink)] hover:bg-white/40"
          }`}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: "#0171b3" }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">Mes réponses</span>
        </Link>
        <Link
          href="/inbox/analytics"
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
            pathname === "/inbox/analytics"
              ? "bg-white font-medium text-[var(--brand)]"
              : "text-[var(--ink)] hover:bg-white/40"
          }`}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: "#1e3d34" }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">Analytics</span>
        </Link>
      </nav>
    </aside>
  );
}

"use client";

import { contrastText, fadeHex } from "@/lib/email";
import type { BaseMatch } from "@/lib/types";

export function MatchBadges({
  matches,
  unread = true,
}: {
  matches: BaseMatch[];
  unread?: boolean;
}) {
  if (matches.length === 0) {
    return (
      <span className="rounded-full border border-dashed border-[var(--line)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
        Autre
      </span>
    );
  }

  return (
    <span className="flex flex-wrap gap-1">
      {matches.map((match) => {
        const background = unread ? match.color : fadeHex(match.color);
        return (
          <span
            key={`${match.id}-${match.recordId ?? ""}`}
            className="rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide"
            style={{
              backgroundColor: background,
              color: contrastText(background),
            }}
          >
            {match.label}
          </span>
        );
      })}
    </span>
  );
}

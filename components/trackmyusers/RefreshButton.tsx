"use client";

export function RefreshButton({
  pending,
  onClick,
}: {
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-sm hover:border-[#736ced] disabled:opacity-60"
    >
      {pending ? "Actualisation…" : "Actualiser"}
    </button>
  );
}

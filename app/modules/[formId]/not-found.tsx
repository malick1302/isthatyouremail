import Link from "next/link";

export default function ModuleNotFound() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--paper)] p-6">
      <div className="rounded-2xl bg-[var(--card)] px-6 py-8 text-center">
        <h1 className="text-lg font-semibold">Module introuvable</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Ce formulaire Fillout n&apos;est pas un module, ou il n&apos;existe plus.
        </p>
        <Link href="/modules" className="mt-4 inline-block text-sm text-[var(--brand)] hover:underline">
          ← Retour
        </Link>
      </div>
    </div>
  );
}

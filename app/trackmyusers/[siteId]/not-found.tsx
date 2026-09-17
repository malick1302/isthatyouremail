export default function SiteDetailNotFound() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--paper)] p-6">
      <div className="rounded-2xl bg-[var(--card)] px-6 py-8 text-center">
        <h1 className="text-lg font-semibold">Site introuvable</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Ce site n&apos;existe pas dans la configuration Softr.
        </p>
        <a href="/trackmyusers" className="mt-4 inline-block text-sm text-[#736ced] hover:underline">
          ← Retour
        </a>
      </div>
    </div>
  );
}

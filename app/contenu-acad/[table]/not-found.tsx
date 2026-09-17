export default function ContenuAcadTableNotFound() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--paper)] p-6">
      <div className="rounded-2xl bg-[var(--card)] px-6 py-8 text-center">
        <h1 className="text-lg font-semibold">Table introuvable</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Cette table ne fait pas partie de Contenu ACAD.
        </p>
        <a href="/contenu-acad" className="mt-4 inline-block text-sm text-[#5b2c6f] hover:underline">
          ← Retour
        </a>
      </div>
    </div>
  );
}

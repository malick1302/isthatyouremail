export default function NotFound() {
  return (
    <main className="px-5 py-16 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Fil introuvable</h1>
      <p className="mt-3 text-[var(--muted)]">Ce mail n’est plus accessible via Gmail.</p>
      <a href="/inbox" className="mt-6 inline-block text-[var(--forest)]">
        Retour à la boîte
      </a>
    </main>
  );
}

import { signOut } from "@/auth";
import Link from "next/link";

export function CoursEnLigneHeader({ email }: { email?: string | null }) {
  return (
    <header className="shrink-0 bg-[#1e3a8a] text-white">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link href="/tu-cours-en-ligne" className="text-lg font-semibold tracking-tight">
            Tu cours en ligne ?
          </Link>
          <Link
            href="/tu-cours-en-ligne/campagne"
            className="rounded-full border border-white/40 px-3 py-1.5 text-sm text-white hover:bg-white/15"
          >
            Envoyer un mail
          </Link>
          <Link href="/" className="hidden text-sm text-white/70 hover:text-white sm:inline">
            ← Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/85">
          {email ? <span className="hidden sm:inline">{email}</span> : null}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-full border border-white/40 px-3 py-1.5 text-white hover:bg-white/15"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

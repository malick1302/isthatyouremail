import { signOut } from "@/auth";
import Link from "next/link";
import { ContenuAcadNav } from "@/components/contenu-acad/ContenuAcadNav";

export function ContenuAcadHeader({ email }: { email?: string | null }) {
  return (
    <header className="shrink-0 bg-[#5b2c6f] text-white">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link href="/contenu-acad" className="text-lg font-semibold tracking-tight">
            Contenu ACAD
          </Link>
          <ContenuAcadNav />
          <Link href="/" className="text-sm text-white/70 hover:text-white">
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

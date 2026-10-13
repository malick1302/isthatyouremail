import { signOut } from "@/auth";
import Link from "next/link";

export function TKiHeader({ email }: { email?: string | null }) {
  return (
    <header className="shrink-0 bg-[#ffff1f] text-black">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-4">
          <Link href="/t-ki" className="text-lg font-semibold tracking-tight">
            T KI ?
          </Link>
          <Link href="/" className="hidden text-sm text-black/60 hover:text-black sm:inline">
            ← Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-black/80">
          {email ? <span className="hidden sm:inline">{email}</span> : null}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-full border border-black/35 px-3 py-1.5 hover:bg-black/10"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

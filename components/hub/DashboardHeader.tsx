import { signOut } from "@/auth";

export function DashboardHeader({
  email,
  showSession = true,
}: {
  email?: string | null;
  showSession?: boolean;
}) {
  return (
    <header className="hub-band">
      <div className="hub-band-inner">
        <h1 className="hub-title">Dashboard</h1>
        {showSession ? (
          <div className="hub-band-meta">
            {email ? <span className="hub-band-email">{email}</span> : null}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="hub-band-out">
                Déconnexion
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}

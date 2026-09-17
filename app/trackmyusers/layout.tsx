import { auth } from "@/auth";
import { TrackMyUsersHeader } from "@/components/trackmyusers/TrackMyUsersHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "trackmyusers",
  description: "Suivi d'utilisation des sites Softr via PostHog.",
};

export default async function TrackMyUsersLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="trackmyusers-theme flex h-screen flex-col overflow-hidden">
      <TrackMyUsersHeader email={session.user?.email} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

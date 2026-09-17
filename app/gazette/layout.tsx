import { auth } from "@/auth";
import { GazetteHeader } from "@/components/gazette/GazetteHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "On t'envoi un gazette",
  description: "Croissance des inscriptions Airtable et désabos Gazette / cours en ligne.",
};

export default async function GazetteLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="gazette-theme flex h-screen flex-col overflow-hidden">
      <GazetteHeader email={session.user?.email} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

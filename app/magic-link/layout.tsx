import { auth } from "@/auth";
import { MagicLinkHeader } from "@/components/magic-link/MagicLinkHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Le magic link",
  description: "Génère un magic link Softr à partir d'un email et de sa BDD.",
};

export default async function MagicLinkLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="magic-link-theme flex h-screen flex-col overflow-hidden">
      <MagicLinkHeader email={session.user?.email} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

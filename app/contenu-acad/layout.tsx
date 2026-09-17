import { auth } from "@/auth";
import { ContenuAcadHeader } from "@/components/contenu-acad/ContenuAcadHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contenu ACAD",
  description: "Ajouter des modules, articles, cours et vidéos dans Airtable Site Académie C&M.",
};

export default async function ContenuAcadLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="contenu-theme flex h-screen flex-col overflow-hidden">
      <ContenuAcadHeader email={session.user?.email} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

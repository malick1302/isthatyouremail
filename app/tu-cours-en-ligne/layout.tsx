import { auth } from "@/auth";
import { CoursEnLigneHeader } from "@/components/cours-en-ligne/CoursEnLigneHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu cours en ligne ?",
  description: "Inscriptions Fillout aux cours en ligne — totaux, comparaisons et envoi Brevo.",
};

export default async function TuCoursEnLigneLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="cours-theme flex h-screen flex-col overflow-hidden">
      <CoursEnLigneHeader email={session.user?.email} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

import { auth } from "@/auth";
import { TKiHeader } from "@/components/t-ki/TKiHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "T KI ?",
  description: "Retrouve dans quelles bases Airtable une adresse e-mail est inscrite.",
};

export default async function TKiLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TKiHeader email={session.user?.email} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

import { auth } from "@/auth";
import { FilloutHeader } from "@/components/fillout/FilloutHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mots croisés",
  description: "Analytics Fillout des mots croisés.",
};

export default async function CrosswordLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="crossword-theme flex h-screen flex-col overflow-hidden">
      <FilloutHeader
        title="Mots croisés"
        homeHref="/mots-croises"
        email={session.user?.email}
        headerClassName="bg-[#6b4a1f]"
      />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

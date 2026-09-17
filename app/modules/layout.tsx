import { auth } from "@/auth";
import { FilloutHeader } from "@/components/fillout/FilloutHeader";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modules",
  description: "Analytics Fillout des modules pédagogiques.",
};

export default async function ModulesLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  return (
    <div className="modules-theme flex h-screen flex-col overflow-hidden">
      <FilloutHeader
        title="Modules"
        homeHref="/modules"
        email={session.user?.email}
        headerClassName="bg-[#1f4d38]"
      />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

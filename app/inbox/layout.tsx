import { auth } from "@/auth";
import { InboxHeader } from "@/components/inbox/InboxHeader";
import { FolderNav } from "@/components/FolderNav";
import { UnreadStateProvider } from "@/components/UnreadState";
import { getFolderNames, getNavFolders } from "@/lib/folders";
import { ensureFolderLabels, getLabelCounts } from "@/lib/gmail";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "isthatyouremail",
  description: "Inbox Gmail colorée selon tes bases Airtable.",
};

export default async function InboxLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const nav = getNavFolders();
  const counts = new Map<string, number>();

  if (session?.accessToken && !session.error) {
    try {
      await ensureFolderLabels(session.accessToken, getFolderNames());
      const gmailCounts = await getLabelCounts(
        session.accessToken,
        nav.map((folder) => folder.gmailName),
      );
      for (const [name, total] of gmailCounts) {
        counts.set(name, total);
      }
    } catch {
      // Libellés indisponibles tant que gmail.modify n’est pas accordé.
    }
  }

  const items = nav.map((folder) => ({
    ...folder,
    count: counts.get(folder.gmailName.toLowerCase()) ?? 0,
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <InboxHeader email={session?.user?.email} />
      <div className="flex min-h-0 flex-1">
        <FolderNav items={items} />
        <div className="min-h-0 min-w-0 flex-1">
          <UnreadStateProvider>{children}</UnreadStateProvider>
        </div>
      </div>
    </div>
  );
}

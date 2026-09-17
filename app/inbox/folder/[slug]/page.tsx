import { auth } from "@/auth";
import { Mailbox } from "@/components/Mailbox";
import { findFolderBySlug } from "@/lib/folders";
import { listFolder } from "@/lib/gmail";
import { attachMatches } from "@/lib/match";
import { notFound, redirect } from "next/navigation";
import type { InboxMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mail?: string }>;
}) {
  const { slug } = await params;
  const { mail } = await searchParams;
  const folder = findFolderBySlug(slug);
  if (!folder || folder.slug === "inbox") notFound();

  const session = await auth();
  if (!session?.accessToken || session.error) redirect("/");

  let error = "";
  let messages: InboxMessage[] = [];
  try {
    messages = await attachMatches(await listFolder(session.accessToken, folder.gmailName));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Impossible de lire ce dossier.";
  }

  return (
    <Mailbox
      title={folder.name}
      listPath={`/inbox/folder/${folder.slug}`}
      messages={messages}
      selectedId={mail}
      accessToken={session.accessToken}
      userEmail={session.user?.email}
      empty={`Aucun mail dans ${folder.name}.`}
      error={error}
    />
  );
}

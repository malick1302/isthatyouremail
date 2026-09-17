import { auth } from "@/auth";
import { Mailbox } from "@/components/Mailbox";
import { listSent } from "@/lib/gmail";
import { attachMatches } from "@/lib/match";
import { redirect } from "next/navigation";
import type { InboxMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<{ mail?: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken || session.error) redirect("/");

  const { mail } = await searchParams;
  let error = "";
  let messages: InboxMessage[] = [];
  try {
    messages = await attachMatches(
      await listSent(session.accessToken),
      (message) => message.toEmail,
    );
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Impossible de lire les mails envoyés.";
  }

  return (
    <Mailbox
      title="Mes réponses"
      listPath="/inbox/sent"
      messages={messages}
      selectedId={mail}
      accessToken={session.accessToken}
      userEmail={session.user?.email}
      empty="Aucun mail envoyé."
      error={error}
      showRecipient
    />
  );
}

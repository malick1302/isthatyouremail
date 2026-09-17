import { auth } from "@/auth";
import { Mailbox } from "@/components/Mailbox";
import { airtableConfigured } from "@/lib/airtable";
import { getConfiguredBases } from "@/lib/bases";
import { listInbox } from "@/lib/gmail";
import { attachMatches } from "@/lib/match";
import { redirect } from "next/navigation";
import type { InboxMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InboxPage({
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
    messages = await attachMatches(await listInbox(session.accessToken));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Impossible de lire Gmail.";
  }

  const missingConfig = !airtableConfigured();
  const placeholderBases = getConfiguredBases().length === 0;

  return (
    <Mailbox
      title="Boîte de réception"
      listPath="/inbox"
      messages={messages}
      selectedId={mail}
      accessToken={session.accessToken}
      userEmail={session.user?.email}
      empty="Aucun mail dans la boîte."
      error={error}
      banner={
        missingConfig || placeholderBases ? (
          <p className="mb-3 rounded-xl bg-[var(--paper)] px-3 py-2 text-xs text-[var(--muted)]">
            {placeholderBases
              ? "Remplace les IDs placeholder dans config/bases.json par tes vraies bases Airtable."
              : "Ajoute AIRTABLE_PAT dans .env pour colorer les mails."}
          </p>
        ) : null
      }
    />
  );
}

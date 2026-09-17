import { auth } from "@/auth";
import { listCampaignRecipients } from "@/lib/airtable";
import { isCampaignKind } from "@/lib/campaigns";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { kind?: string; baseId?: string }
    | null;
  if (!isCampaignKind(payload?.kind) || payload.kind === "session") {
    return NextResponse.json({ error: "Type de campagne invalide." }, { status: 400 });
  }
  const baseId = payload?.baseId?.trim() ?? "";
  if (!baseId) {
    return NextResponse.json({ error: "Base manquante." }, { status: 400 });
  }

  try {
    const recipients = await listCampaignRecipients(baseId, payload.kind);
    return NextResponse.json(recipients);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de lire les destinataires Airtable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

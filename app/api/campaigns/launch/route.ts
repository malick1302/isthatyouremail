import { auth } from "@/auth";
import { brevoConfigured, brevoSender, createAndSendCampaign } from "@/lib/brevo";
import { isCampaignKind, parseCampaignSchedule } from "@/lib/campaigns";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (!brevoConfigured()) {
    return NextResponse.json(
      { error: "Ajoute BREVO_API_KEY dans .env.local (Brevo → SMTP & API)." },
      { status: 503 },
    );
  }
  if (!brevoSender()) {
    return NextResponse.json(
      {
        error:
          "Ajoute BREVO_SENDER_EMAIL et BREVO_SENDER_NAME (expéditeur déjà vérifié dans Brevo).",
      },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        kind?: string;
        templateId?: number;
        listId?: number;
        listIds?: unknown;
        scheduledAt?: unknown;
      }
    | null;
  if (!isCampaignKind(payload?.kind)) {
    return NextResponse.json({ error: "Type de campagne invalide." }, { status: 400 });
  }
  const templateId = Number(payload?.templateId);
  const listIds = [
    ...new Set(
      [
        ...(Array.isArray(payload?.listIds) ? payload.listIds : []),
        payload?.listId,
      ]
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ];
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "Template Brevo invalide." }, { status: 400 });
  }
  if (listIds.length === 0) {
    return NextResponse.json({ error: "Liste Brevo invalide." }, { status: 400 });
  }

  let scheduledAt: Date | null = null;
  try {
    scheduledAt = parseCampaignSchedule(payload?.scheduledAt);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Date d'envoi invalide." },
      { status: 400 },
    );
  }

  try {
    const campaign = await createAndSendCampaign({
      kind: payload.kind,
      templateId,
      listIds,
      scheduledAt,
    });
    return NextResponse.json({ ok: true, ...campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'envoyer la campagne.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

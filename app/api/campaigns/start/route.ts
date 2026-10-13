import { requireAppUser } from "@/auth";
import { brevoConfigured, createDatedBaseLists } from "@/lib/brevo";
import { isCampaignKind } from "@/lib/campaigns";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type BasePayload = { baseId?: string; label?: string };

export async function POST(request: Request) {
  const gate = await requireAppUser();
  if (!gate.ok) return gate.response;

  if (!brevoConfigured()) {
    return NextResponse.json(
      { error: "Ajoute BREVO_API_KEY dans .env.local (Brevo → SMTP & API)." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | { kind?: string; templateId?: number; bases?: BasePayload[] }
    | null;
  if (!isCampaignKind(payload?.kind)) {
    return NextResponse.json({ error: "Type de campagne invalide." }, { status: 400 });
  }
  const templateId = Number(payload?.templateId);
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "Template Brevo invalide." }, { status: 400 });
  }
  if (!Array.isArray(payload?.bases) || payload.bases.length === 0) {
    return NextResponse.json({ error: "Bases destinataires manquantes." }, { status: 400 });
  }

  const bases = payload.bases
    .map((base) => ({
      id: base.baseId?.trim() ?? "",
      label: base.label?.trim() ?? "",
    }))
    .filter((base) => base.id && base.label);

  if (bases.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire éligible." }, { status: 400 });
  }

  try {
    const lists = await createDatedBaseLists(payload.kind, bases);
    return NextResponse.json({
      ok: true,
      lists,
      listIds: lists.map((list) => list.listId),
      templateId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de préparer l'import Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

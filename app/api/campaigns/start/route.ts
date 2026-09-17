import { auth } from "@/auth";
import { brevoConfigured, createDatedBaseLists } from "@/lib/brevo";
import { isCampaignKind } from "@/lib/campaigns";
import { isSendableEmail, normalizeEmail } from "@/lib/email";
import { NextResponse } from "next/server";

const MAX_EMAILS = 20_000;

type BasePayload = { baseId?: string; label?: string; emails?: unknown };

function uniqueEmails(values: unknown): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(values)) return unique;
  for (const value of values) {
    if (typeof value !== "string") continue;
    const email = normalizeEmail(value);
    if (!isSendableEmail(email) || seen.has(email)) continue;
    seen.add(email);
    unique.push(email);
  }
  return unique;
}

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
      emails: uniqueEmails(base.emails),
    }))
    .filter((base) => base.id && base.label && base.emails.length > 0);

  if (bases.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire éligible." }, { status: 400 });
  }

  const total = bases.reduce((sum, base) => sum + base.emails.length, 0);
  if (total > MAX_EMAILS) {
    return NextResponse.json(
      { error: `Trop de destinataires (max ${MAX_EMAILS}).` },
      { status: 400 },
    );
  }

  try {
    const lists = await createDatedBaseLists(payload.kind, bases);
    return NextResponse.json({
      ok: true,
      lists,
      listIds: lists.map((list) => list.listId),
      recipientCount: total,
      templateId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de préparer l'import Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

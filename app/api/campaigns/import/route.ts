import { requireAppUser } from "@/auth";
import { addEmailsToListSync, brevoConfigured } from "@/lib/brevo";
import { isSendableEmail, normalizeEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_CHUNK = 150;

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
    | { listId?: number; emails?: unknown }
    | null;
  const listId = Number(payload?.listId);
  if (!Number.isInteger(listId) || listId <= 0) {
    return NextResponse.json({ error: "Liste Brevo invalide." }, { status: 400 });
  }
  if (!Array.isArray(payload?.emails)) {
    return NextResponse.json({ error: "Aucun destinataire à importer." }, { status: 400 });
  }

  const emails: string[] = [];
  const seen = new Set<string>();
  for (const value of payload.emails) {
    if (typeof value !== "string") continue;
    const email = normalizeEmail(value);
    if (!isSendableEmail(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
    if (emails.length > MAX_CHUNK) {
      return NextResponse.json(
        { error: `Trop de destinataires par paquet (max ${MAX_CHUNK}).` },
        { status: 400 },
      );
    }
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire éligible." }, { status: 400 });
  }

  try {
    await addEmailsToListSync(listId, emails);
    return NextResponse.json({ ok: true, listId, added: emails.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible d'importer les contacts Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

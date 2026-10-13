import { auth } from "@/auth";
import { airtableConfigured, matchEmails } from "@/lib/airtable";
import { normalizeEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (!airtableConfigured()) {
    return NextResponse.json(
      { error: "Ajoute AIRTABLE_PAT et configure config/bases.json." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(payload?.email ?? "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  const map = await matchEmails([email]);
  const bases = (map.get(email) ?? []).map((match) => ({
    id: match.id,
    label: match.label,
    color: match.color,
  }));

  return NextResponse.json({ ok: true, email, bases });
}

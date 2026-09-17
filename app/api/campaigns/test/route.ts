import { auth } from "@/auth";
import { brevoConfigured, sendTemplateTest } from "@/lib/brevo";
import { isSendableEmail, normalizeEmail } from "@/lib/email";
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

  const payload = (await request.json().catch(() => null)) as
    | { templateId?: number; email?: string }
    | null;
  const templateId = Number(payload?.templateId);
  const email = normalizeEmail(payload?.email ?? "");

  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "Template Brevo invalide." }, { status: 400 });
  }
  if (!isSendableEmail(email)) {
    return NextResponse.json({ error: "Adresse e-mail de test invalide." }, { status: 400 });
  }

  try {
    await sendTemplateTest(templateId, email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'envoyer le test.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

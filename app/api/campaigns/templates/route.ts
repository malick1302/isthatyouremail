import { requireAppUser } from "@/auth";
import { brevoConfigured, listActiveTemplates } from "@/lib/brevo";
import { NextResponse } from "next/server";

export async function GET() {
  const gate = await requireAppUser();
  if (!gate.ok) return gate.response;

  if (!brevoConfigured()) {
    return NextResponse.json(
      { error: "Ajoute BREVO_API_KEY dans .env.local (Brevo → SMTP & API)." },
      { status: 503 },
    );
  }

  try {
    const templates = await listActiveTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de lister les templates Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

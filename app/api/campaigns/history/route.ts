import { requireAppUser } from "@/auth";
import { brevoConfigured, listAppCampaigns } from "@/lib/brevo";
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
    const campaigns = await listAppCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de charger l'historique Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

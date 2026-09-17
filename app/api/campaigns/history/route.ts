import { auth } from "@/auth";
import { brevoConfigured, listAppCampaigns } from "@/lib/brevo";
import { NextResponse } from "next/server";

export async function GET() {
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

  try {
    const campaigns = await listAppCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de charger l'historique Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { requireAppUser } from "@/auth";
import { getCampaignBaseBreakdown } from "@/lib/campaign-analytics";
import { brevoConfigured } from "@/lib/brevo";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const gate = await requireAppUser();
  if (!gate.ok) return gate.response;

  if (!brevoConfigured()) {
    return NextResponse.json(
      { error: "Ajoute BREVO_API_KEY dans .env.local (Brevo → SMTP & API)." },
      { status: 503 },
    );
  }

  const campaignId = Number((await params).campaignId);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ error: "Campagne invalide." }, { status: 400 });
  }

  try {
    const breakdown = await getCampaignBaseBreakdown(campaignId);
    return NextResponse.json(breakdown);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de répartir les ouvertures par base.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

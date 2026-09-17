import { auth } from "@/auth";
import { brevoConfigured, getImportProcess } from "@/lib/brevo";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const processId = Number(url.searchParams.get("processId"));
  if (!Number.isInteger(processId) || processId <= 0) {
    return NextResponse.json({ error: "Process d'import invalide." }, { status: 400 });
  }

  try {
    const process = await getImportProcess(processId);
    return NextResponse.json(process);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de lire le statut d'import Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

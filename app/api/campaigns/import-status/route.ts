import { requireAppUser } from "@/auth";
import { brevoConfigured, getContactListStats, getImportProcess } from "@/lib/brevo";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const gate = await requireAppUser();
  if (!gate.ok) return gate.response;

  if (!brevoConfigured()) {
    return NextResponse.json(
      { error: "Ajoute BREVO_API_KEY dans .env.local (Brevo → SMTP & API)." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const processId = Number(url.searchParams.get("processId"));
  const listId = Number(url.searchParams.get("listId"));
  const hasProcess = Number.isInteger(processId) && processId > 0;
  const hasList = Number.isInteger(listId) && listId > 0;
  if (!hasProcess && !hasList) {
    return NextResponse.json({ error: "Process ou liste Brevo invalide." }, { status: 400 });
  }

  try {
    const process = hasProcess
      ? await getImportProcess(processId)
      : { id: 0, status: "queued" as const };
    let uniqueSubscribers = 0;
    let totalSubscribers = 0;
    if (hasList) {
      try {
        const list = await getContactListStats(listId);
        uniqueSubscribers = list.uniqueSubscribers;
        totalSubscribers = list.totalSubscribers;
      } catch {
        uniqueSubscribers = 0;
        totalSubscribers = 0;
      }
    }
    return NextResponse.json({
      ...process,
      uniqueSubscribers,
      totalSubscribers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de lire le statut d'import Brevo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

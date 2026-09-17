import { auth } from "@/auth";
import { listCoursFormRecipients } from "@/lib/cours-en-ligne";
import { isFilloutConfigured } from "@/lib/fillout";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (!isFilloutConfigured()) {
    return NextResponse.json(
      { error: "Ajoute FILLOUT_API_KEY dans .env.local (Fillout → Settings → Developer)." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as { formId?: string } | null;
  const formId = payload?.formId?.trim() ?? "";
  if (!formId) {
    return NextResponse.json({ error: "Formulaire manquant." }, { status: 400 });
  }

  try {
    const recipients = await listCoursFormRecipients(formId);
    return NextResponse.json(recipients);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de lire les inscrits Fillout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

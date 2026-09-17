import { auth } from "@/auth";
import { loadCoursFormOverview } from "@/lib/cours-en-ligne";
import { isFilloutConfigured } from "@/lib/fillout";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

  const formId = new URL(request.url).searchParams.get("formId")?.trim() ?? "";
  if (!formId) {
    return NextResponse.json({ error: "Formulaire manquant." }, { status: 400 });
  }

  try {
    const stats = await loadCoursFormOverview(formId);
    return NextResponse.json(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de lire les inscriptions Fillout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

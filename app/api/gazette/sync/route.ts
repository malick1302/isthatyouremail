import { auth } from "@/auth";
import { applyUnsubscribes } from "@/lib/gazette-unsubscribe";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const result = await applyUnsubscribes({ apply: true });
    return NextResponse.json({ ok: true, ...result.sync });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronisation impossible.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { auth } from "@/auth";
import { friendlyGmailError, markThreadRead } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await request.json()) as { threadId?: string };
  if (!body.threadId) {
    return NextResponse.json({ error: "Mail manquant." }, { status: 400 });
  }

  try {
    await markThreadRead(session.accessToken, body.threadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: friendlyGmailError(error, "Impossible de marquer lu.") }, { status: 502 });
  }
}

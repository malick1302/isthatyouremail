import { auth } from "@/auth";
import { getFolderNames } from "@/lib/folders";
import { fileThread, friendlyGmailError, sendReply } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await request.json()) as {
    threadId?: string;
    from?: string;
    to?: string;
    subject?: string;
    body?: string;
    inReplyTo?: string;
    references?: string;
    folder?: string | null;
  };

  if (!body.threadId || !body.from || !body.to || !body.subject || !body.body?.trim()) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }

  try {
    await sendReply(session.accessToken, {
      threadId: body.threadId,
      from: body.from,
      to: body.to,
      subject: body.subject,
      body: body.body,
      inReplyTo: body.inReplyTo,
      references: body.references,
    });

    let filed: string | null = null;
    if (body.folder) {
      const folders = getFolderNames();
      await fileThread(session.accessToken, body.threadId, body.folder, folders);
      filed = body.folder;
    }

    return NextResponse.json({ ok: true, filed });
  } catch (error) {
    return NextResponse.json({ error: friendlyGmailError(error, "Envoi impossible.") }, { status: 502 });
  }
}


import { auth } from "@/auth";
import { getClassifyFolderNames, getFolderNames, INBOX_FOLDER } from "@/lib/folders";
import { fileThread, friendlyGmailError, moveThreadToInbox } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await request.json()) as { threadId?: string; folder?: string };
  if (!body.threadId || !body.folder?.trim()) {
    return NextResponse.json({ error: "Dossier manquant." }, { status: 400 });
  }

  const folders = getClassifyFolderNames();
  if (!folders.some((name) => name.toLowerCase() === body.folder!.toLowerCase())) {
    return NextResponse.json({ error: "Dossier non reconnu." }, { status: 400 });
  }

  try {
    if (body.folder === INBOX_FOLDER) {
      await moveThreadToInbox(session.accessToken, body.threadId, getFolderNames());
    } else {
      await fileThread(session.accessToken, body.threadId, body.folder, getFolderNames());
    }
    return NextResponse.json({ ok: true, folder: body.folder });
  } catch (error) {
    return NextResponse.json({ error: friendlyGmailError(error, "Classement impossible.") }, { status: 502 });
  }
}

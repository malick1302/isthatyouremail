import { auth } from "@/auth";
import { loadUsageDashboard } from "@/lib/posthog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const data = await loadUsageDashboard();
  return NextResponse.json(data);
}

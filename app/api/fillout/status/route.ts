import { auth } from "@/auth";
import { describeFilloutConfig } from "@/lib/fillout";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json(describeFilloutConfig());
}

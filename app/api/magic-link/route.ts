import { auth } from "@/auth";
import { findEmailInBase } from "@/lib/airtable";
import { getConfiguredBases } from "@/lib/bases";
import { normalizeEmail } from "@/lib/email";
import { generateSoftrMagicLink, softrConfigured } from "@/lib/softr";
import { getSoftrSiteForBase } from "@/lib/softr-sites";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (!softrConfigured()) {
    return NextResponse.json(
      { error: "Ajoute SOFTR_API_KEY dans .env.local (Softr → workspace → API tokens)." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | { email?: string; baseId?: string }
    | null;
  const email = normalizeEmail(payload?.email ?? "");
  const base = getConfiguredBases().find((item) => item.id === payload?.baseId);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (!base) {
    return NextResponse.json({ error: "Base inconnue." }, { status: 400 });
  }

  const site = getSoftrSiteForBase(base);
  if (!site) {
    return NextResponse.json(
      { error: `Aucun site Softr n'est lié à ${base.label}.` },
      { status: 400 },
    );
  }

  const record = await findEmailInBase(base.id, email);
  if (!record) {
    return NextResponse.json(
      { error: `${email} n'est pas dans la base ${base.label}.` },
      { status: 404 },
    );
  }

  try {
    const magicLink = await generateSoftrMagicLink(site, email);
    return NextResponse.json({
      ok: true,
      magicLink,
      email,
      base: { id: base.id, label: base.label, color: base.color },
      site: { id: site.id, label: site.label, url: site.url },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de créer le magic link.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

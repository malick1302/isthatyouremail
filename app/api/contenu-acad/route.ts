import { auth } from "@/auth";
import { createContenuRecord } from "@/lib/contenu-acad";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function errorStatus(error: unknown) {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    return error.status;
  }
  return 502;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const slug = String(form.get("slug") ?? "");
  let values: Record<string, unknown> = {};
  try {
    values = JSON.parse(String(form.get("values") ?? "{}")) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  }

  const imageUrl = String(form.get("imageUrl") ?? "");
  const image = form.get("image");
  let imageFile: { filename: string; contentType: string; data: Buffer } | undefined;

  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "L’image dépasse 4,5 Mo." }, { status: 400 });
    }
    const contentType = image.type || "application/octet-stream";
    if (!IMAGE_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Format d’image non pris en charge." }, { status: 400 });
    }
    imageFile = {
      filename: image.name || "image.jpg",
      contentType,
      data: Buffer.from(await image.arrayBuffer()),
    };
  }

  try {
    const record = await createContenuRecord({
      slug,
      values,
      imageUrl: imageUrl || undefined,
      imageFile,
    });
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d’ajouter le contenu.";
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}

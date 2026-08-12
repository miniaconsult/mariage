import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getBucketName, getStorage } from "@/lib/gcs";
import { ALLOWED_CONTENT_TYPES } from "@/lib/uploadTypes";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPE_SET = new Set<string>(ALLOWED_CONTENT_TYPES);

const URL_EXPIRY_MS = 30 * 60 * 1000;

function stripDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function sanitizeGuestName(name: string): string {
  return stripDiacritics(name)
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, 60);
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || "photo";
  return stripDiacritics(base)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-120);
}

interface SignUploadBody {
  filename?: unknown;
  contentType?: unknown;
  guestName?: unknown;
}

export async function POST(request: Request) {
  let body: SignUploadBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { filename, contentType, guestName } = body;

  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "Nom de fichier manquant." }, { status: 400 });
  }

  if (!contentType || typeof contentType !== "string" || !ALLOWED_CONTENT_TYPE_SET.has(contentType)) {
    return NextResponse.json(
      { error: "Ce type de fichier n'est pas accepté. Merci d'envoyer une photo ou une vidéo." },
      { status: 400 },
    );
  }

  const safeName = sanitizeFilename(filename);
  const today = new Date().toISOString().slice(0, 10);
  const objectPath = `uploads/${today}/${Date.now()}-${randomUUID()}-${safeName}`;

  const extensionHeaders: Record<string, string> = {};
  if (typeof guestName === "string") {
    const safeGuestName = sanitizeGuestName(guestName);
    if (safeGuestName) {
      extensionHeaders["x-goog-meta-guest-name"] = safeGuestName;
    }
  }

  try {
    const bucket = getStorage().bucket(getBucketName());
    const file = bucket.file(objectPath);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + URL_EXPIRY_MS,
      contentType,
      extensionHeaders,
    });

    return NextResponse.json({
      uploadUrl,
      objectPath,
      headers: { "Content-Type": contentType, ...extensionHeaders },
    });
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL signée :", error);
    return NextResponse.json(
      { error: "Impossible de préparer l'envoi pour le moment. Merci de réessayer dans un instant." },
      { status: 500 },
    );
  }
}
